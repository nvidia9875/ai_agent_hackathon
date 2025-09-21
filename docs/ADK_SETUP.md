# ADK (Agents Development Kit) セットアップガイド

## 概要
このプロジェクトはGoogle CloudのADK (Agents Development Kit)を使用して、迷子ペット捜索のためのAIエージェントシステムを実装しています。

## 必要な環境変数

`.env`ファイルに以下を設定してください：

```bash
# Google Cloud設定（必須）
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# Vertex AI設定
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL_ID=gemini-1.5-pro-002
```

## Google Cloud認証設定

1. **サービスアカウントの作成**
   ```bash
   gcloud iam service-accounts create adk-agent-sa \
     --display-name="ADK Agent Service Account"
   ```

2. **必要な権限の付与**
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:adk-agent-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:adk-agent-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/serviceusage.serviceUsageConsumer"
   ```

3. **認証キーの生成**
   ```bash
   gcloud iam service-accounts keys create credentials.json \
     --iam-account=adk-agent-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

## Vertex AI APIの有効化

```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable compute.googleapis.com
```

## ADKエージェントの構成

### 実装済みエージェント

1. **捜索統括エージェント** (`search-coordinator-adk`)
   - 捜索エリアの分析
   - リソースの最適配分
   - 捜索戦略の立案

2. **行動予測エージェント** (`behavior-predictor-adk`)
   - ペットの行動パターン分析
   - 移動先の予測
   - 隠れ場所の特定

## API使用方法

### エージェント一覧取得
```bash
curl http://localhost:3000/api/adk/agents
```

### エージェント実行
```bash
curl -X POST http://localhost:3000/api/adk/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "search-coordinator-adk",
    "task": {
      "petInfo": {
        "name": "ポチ",
        "species": "dog",
        "breed": "柴犬",
        "age": 3
      },
      "lastSeenLocation": {
        "lat": 35.6762,
        "lng": 139.6503
      },
      "lostDate": "2024-01-20T10:00:00Z"
    }
  }'
```

## トラブルシューティング

### Vertex AI接続エラー
- `credentials.json`ファイルが正しい場所にあるか確認
- サービスアカウントに必要な権限があるか確認
- プロジェクトIDが正しいか確認

### モデルアクセスエラー
- Gemini APIが有効化されているか確認
- リージョンが`us-central1`に設定されているか確認

## 現在の状態

**注意**: 現在、実際のVertex AI接続には以下が必要です：
1. 有効なGoogle Cloudプロジェクト
2. 適切な認証情報（credentials.json）
3. Vertex AI APIの有効化

開発中は`getMockResponse`メソッドによりモック応答が返されるため、基本的な動作確認は可能です。