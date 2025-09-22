#!/bin/bash

# 色付き出力用の関数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_success() { echo -e "${GREEN}✓${NC} $1"; }
echo_error() { echo -e "${RED}✗${NC} $1"; }
echo_info() { echo -e "${YELLOW}ℹ${NC} $1"; }

# プロジェクトIDの設定
if [ -z "$GOOGLE_CLOUD_PROJECT_ID" ]; then
    echo_error "GOOGLE_CLOUD_PROJECT_ID が設定されていません"
    echo_info "使用方法: GOOGLE_CLOUD_PROJECT_ID=your-project-id ./deploy-to-cloud-run.sh"
    exit 1
fi

PROJECT_ID=$GOOGLE_CLOUD_PROJECT_ID
SERVICE_NAME="pawmate-main-app"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo_info "プロジェクト: $PROJECT_ID"
echo_info "サービス名: $SERVICE_NAME"
echo_info "リージョン: $REGION"
echo ""

# 1. Google Cloud の設定確認
echo_info "Google Cloud の設定を確認中..."
gcloud config set project $PROJECT_ID
if [ $? -ne 0 ]; then
    echo_error "プロジェクトの設定に失敗しました"
    exit 1
fi
echo_success "プロジェクトを設定しました"

# 2. 必要な API を有効化
echo ""
echo_info "必要な API を有効化中..."
apis=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "containerregistry.googleapis.com"
    "aiplatform.googleapis.com"
    "vision.googleapis.com"
)

for api in "${apis[@]}"; do
    echo_info "  $api を有効化中..."
    gcloud services enable $api --quiet
    if [ $? -eq 0 ]; then
        echo_success "  $api を有効化しました"
    else
        echo_error "  $api の有効化に失敗しました"
    fi
done

# 3. 環境変数ファイルの確認
echo ""
echo_info ".env ファイルから環境変数を読み込み中..."
if [ ! -f .env ]; then
    echo_error ".env ファイルが見つかりません"
    echo_info ".env.example をコピーして .env を作成してください"
    exit 1
fi

# .env から環境変数を読み込み（export はしない）
source .env

# 4. Docker イメージのビルド
echo ""
echo_info "Docker イメージをビルド中..."
docker build -t $IMAGE_NAME:latest .
if [ $? -ne 0 ]; then
    echo_error "Docker イメージのビルドに失敗しました"
    exit 1
fi
echo_success "Docker イメージをビルドしました"

# 5. Container Registry にプッシュ
echo ""
echo_info "Container Registry にイメージをプッシュ中..."
docker push $IMAGE_NAME:latest
if [ $? -ne 0 ]; then
    echo_error "イメージのプッシュに失敗しました"
    echo_info "gcloud auth configure-docker を実行してください"
    exit 1
fi
echo_success "イメージをプッシュしました"

# 6. Cloud Run にデプロイ
echo ""
echo_info "Cloud Run にデプロイ中..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --region $REGION \
    --platform managed \
    --port 3000 \
    --memory 2Gi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 300 \
    --concurrency 1000 \
    --allow-unauthenticated \
    --set-env-vars "\
NODE_ENV=production,\
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,\
NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY,\
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,\
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID,\
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,\
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,\
NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID,\
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,\
NEXT_PUBLIC_OPENWEATHER_API_KEY=$NEXT_PUBLIC_OPENWEATHER_API_KEY,\
GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID,\
GOOGLE_CLOUD_REGION=$REGION"

if [ $? -ne 0 ]; then
    echo_error "Cloud Run へのデプロイに失敗しました"
    exit 1
fi

# 7. サービス URL を取得
echo ""
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
echo_success "デプロイが完了しました！"
echo ""
echo "========================================="
echo_success "🎉 PawMate が Cloud Run にデプロイされました"
echo_info "URL: $SERVICE_URL"
echo "========================================="
echo ""

# 8. ヘルスチェック
echo_info "ヘルスチェック中..."
curl -s -o /dev/null -w "%{http_code}" $SERVICE_URL/api/health > /tmp/health_status
HEALTH_STATUS=$(cat /tmp/health_status)

if [ "$HEALTH_STATUS" = "200" ]; then
    echo_success "サービスは正常に動作しています (HTTP $HEALTH_STATUS)"
else
    echo_error "ヘルスチェックに失敗しました (HTTP $HEALTH_STATUS)"
    echo_info "ログを確認してください:"
    echo_info "gcloud run services logs read $SERVICE_NAME --region $REGION"
fi

echo ""
echo_info "デプロイ完了！以下のコマンドで管理できます:"
echo "  ログ表示: gcloud run services logs read $SERVICE_NAME --region $REGION"
echo "  更新: ./deploy-to-cloud-run.sh"
echo "  削除: gcloud run services delete $SERVICE_NAME --region $REGION"