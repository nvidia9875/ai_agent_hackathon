# デプロイメントガイド - PawMate Cloud Run

このドキュメントでは、PawMateアプリケーションをGoogle Cloud Runにデプロイする手順を詳しく説明します。

## 📋 前提条件

1. **Google Cloud Project**が作成済みであること
2. **gcloud CLI**がインストール済みであること
3. **Docker**がインストール済みであること
4. **Firebase**プロジェクトが設定済みであること
5. `.env`ファイルが作成済みであること（`.env.example`を参考）

## 🚀 クイックデプロイ（推奨）

最も簡単な方法は、用意されたデプロイスクリプトを使用することです：

```bash
# 1. 実行権限を付与（初回のみ）
chmod +x deploy-to-cloud-run.sh

# 2. デプロイ実行
GOOGLE_CLOUD_PROJECT_ID=ai-hackday-65dad ./deploy-to-cloud-run.sh
```

これだけで自動的に以下が実行されます：
- 必要なAPIの有効化
- Dockerイメージのビルド（linux/amd64）
- Container Registryへのプッシュ
- Cloud Runへのデプロイ
- ヘルスチェック

## 📁 必要なファイル構成

```
ai_agent_hackathon/
├── .env                    # 環境変数ファイル（要作成）
├── .dockerignore          # Dockerビルド除外設定
├── Dockerfile             # コンテナ定義
├── cloudbuild.yaml        # Cloud Build設定（CI/CD用）
├── deploy-to-cloud-run.sh # デプロイスクリプト
├── firebase.json          # Firebase設定
├── firestore.rules        # Firestoreセキュリティルール
└── storage.rules          # Storageセキュリティルール
```

## 🔧 環境変数の設定

`.env`ファイルに以下の環境変数を設定してください：

```bash
# Firebase設定
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key

# OpenWeather
NEXT_PUBLIC_OPENWEATHER_API_KEY=your-weather-api-key

# Vertex AI
VERTEX_AI_PROJECT_ID=your-project-id
VERTEX_AI_LOCATION=us-central1
```

## 🐳 Dockerの重要な設定

### Dockerfileの特徴
- **ベースイメージ**: `node:20-alpine`（軽量）
- **マルチステージビルド**: 不要（シンプルな構成）
- **環境変数**: ビルド時引数（ARG）と実行時環境変数（ENV）を使用
- **最適化**: Next.jsのProduction Build

### プラットフォーム対応
Cloud Runは`linux/amd64`アーキテクチャが必要です。デプロイスクリプトは自動的に対応：

```bash
docker buildx build --platform linux/amd64 ...
```

## 📝 手動デプロイ手順

スクリプトを使わず手動でデプロイする場合：

### 1. Google Cloud設定
```bash
# プロジェクト設定
gcloud config set project ai-hackday-65dad

# 必要なAPIを有効化
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable vision.googleapis.com
```

### 2. Docker Buildxセットアップ
```bash
# Buildxビルダー作成
docker buildx create --use --name cloud-run-builder
```

### 3. Dockerイメージビルド
```bash
# .envファイルを読み込み
source .env

# linux/amd64向けにビルド
docker buildx build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID" \
  --build-arg NEXT_PUBLIC_OPENWEATHER_API_KEY="$NEXT_PUBLIC_OPENWEATHER_API_KEY" \
  --build-arg FIREBASE_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY" \
  --build-arg FIREBASE_CLIENT_EMAIL="$FIREBASE_CLIENT_EMAIL" \
  --build-arg VERTEX_AI_PROJECT_ID="$VERTEX_AI_PROJECT_ID" \
  --build-arg VERTEX_AI_LOCATION="$VERTEX_AI_LOCATION" \
  -t gcr.io/ai-hackday-65dad/pawmate-main-app:latest \
  --load .
```

### 4. Container Registryへプッシュ
```bash
# 認証設定（初回のみ）
gcloud auth configure-docker

# イメージをプッシュ
docker push gcr.io/ai-hackday-65dad/pawmate-main-app:latest
```

### 5. Cloud Runへデプロイ
```bash
gcloud run deploy pawmate-main-app \
  --image gcr.io/ai-hackday-65dad/pawmate-main-app:latest \
  --region us-central1 \
  --platform managed \
  --port 3000 \
  --memory 2Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 1000 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,..."
```

## 🔥 Firebaseルールのデプロイ

```bash
# Firestoreルール
firebase deploy --only firestore:rules

# Storageルール
firebase deploy --only storage

# 両方同時に
firebase deploy --only firestore:rules,storage
```

## 🔍 トラブルシューティング

### よくあるエラーと解決方法

#### 1. アーキテクチャエラー
```
Container manifest type 'application/vnd.oci.image.index.v1+json' must support amd64/linux
```
**解決**: `docker buildx build --platform linux/amd64`を使用

#### 2. Firebase認証エラー
```
Firebase: Error (auth/invalid-api-key)
```
**解決**: `.env`ファイルの環境変数を確認し、ビルド時に正しく渡されているか確認

#### 3. Permission Deniedエラー
```
Firebase Storage: User does not have permission to access
```
**解決**: `storage.rules`を確認し、`firebase deploy --only storage`でルールをデプロイ

#### 4. Dockerビルド失敗
```
Docker イメージのビルドに失敗しました
```
**解決**: 
- Docker Desktopが起動しているか確認
- `.env`ファイルが正しく設定されているか確認
- `docker buildx create --use`でビルダーを再作成

## 📊 デプロイ後の確認

### ログ確認
```bash
gcloud run services logs read pawmate-main-app --region us-central1
```

### サービス詳細
```bash
gcloud run services describe pawmate-main-app --region us-central1
```

### ヘルスチェック
```bash
curl https://pawmate-main-app-yzoznylacq-uc.a.run.app/api/health
```

## 🔄 更新とロールバック

### アプリケーション更新
```bash
# コード変更後、再デプロイ
./deploy-to-cloud-run.sh
```

### ロールバック
```bash
# 前のリビジョンにトラフィックを戻す
gcloud run services update-traffic pawmate-main-app \
  --region us-central1 \
  --to-revisions PREVIOUS_REVISION=100
```

## 🗑️ クリーンアップ

### サービス削除
```bash
gcloud run services delete pawmate-main-app --region us-central1
```

### イメージ削除
```bash
gcloud container images delete gcr.io/ai-hackday-65dad/pawmate-main-app:latest
```

## 📈 CI/CD設定（オプション）

`cloudbuild.yaml`を使用した自動デプロイ：

```bash
# Cloud Buildトリガー作成
gcloud builds triggers create github \
  --repo-name=ai_agent_hackathon \
  --repo-owner=your-github-username \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

## 💡 ベストプラクティス

1. **環境変数管理**: 本番環境では Secret Manager の使用を検討
2. **モニタリング**: Cloud Monitoring でパフォーマンスを監視
3. **スケーリング**: トラフィックに応じて min/max インスタンス数を調整
4. **セキュリティ**: IAMロールを最小権限の原則で設定
5. **バックアップ**: Firestore の自動バックアップを設定

## 🆘 サポート

問題が発生した場合：
1. このドキュメントのトラブルシューティングセクションを確認
2. `gcloud run services logs read`でログを確認
3. Firebase Consoleでエラーをチェック
4. Google Cloud Consoleでサービスステータスを確認

---

最終更新: 2025年1月23日
デプロイ成功URL: https://pawmate-main-app-yzoznylacq-uc.a.run.app