# PawMate システムアーキテクチャ図

## アーキテクチャ図（Mermaid形式）

```mermaid
graph TB
    %% ユーザー層
    subgraph "ユーザー層"
        User1[飼い主]
        User2[発見者・協力者]
        User3[保護団体]
    end

    %% フロントエンド層
    subgraph "フロントエンド層"
        subgraph "Next.js App (Cloud Run)"
            UI[Next.js 15.5<br/>React UI]
            Auth[Firebase Auth]
        end
    end

    %% API層
    subgraph "API Gateway層"
        APIGW[Cloud Run<br/>API Endpoints]
    end

    %% AIエージェント層
    subgraph "AI エージェント層 (ADK)"
        subgraph "Vertex AI Platform"
            VD[Visual Detective Agent<br/>画像解析・ペット識別]
            BP[Behavior Predictor Agent<br/>行動予測・エリア分析]
            SC[Search Coordinator Agent<br/>統括・戦略最適化]
            
            Gemini[Gemini 2.5 Pro<br/>マルチモーダルAI]
        end
        
        Vision[Vision AI API<br/>画像特徴抽出]
    end

    %% データ処理層
    subgraph "データ処理・通信層"
        PubSub[Cloud Pub/Sub<br/>非同期メッセージング]
        
        subgraph "リアルタイム処理"
            WS[WebSocket Server<br/>リアルタイムチャット]
        end
    end

    %% データストレージ層
    subgraph "データストレージ層"
        subgraph "Firestore"
            PetDB[(ペット情報)]
            MatchDB[(マッチング情報)]
            ChatDB[(チャット履歴)]
        end
        
        Storage[Cloud Storage<br/>画像・動画保存]
    end

    %% 外部API層
    subgraph "外部サービス"
        Maps[Google Maps API<br/>地図・ヒートマップ]
        Weather[Weather API<br/>天候情報]
        Geocoding[Geocoding API<br/>位置情報変換]
    end

    %% 監視・ロギング層
    subgraph "監視・ロギング"
        Monitor[Cloud Monitoring]
        Logging[Cloud Logging]
    end

    %% データフロー
    User1 -->|ペット登録| UI
    User2 -->|発見情報投稿| UI
    User3 -->|情報閲覧| UI
    
    UI -->|認証| Auth
    UI -->|API呼び出し| APIGW
    
    APIGW -->|エージェント呼び出し| SC
    SC -->|タスク割り当て| VD
    SC -->|タスク割り当て| BP
    
    VD -->|画像解析| Vision
    VD -->|AI処理| Gemini
    BP -->|AI処理| Gemini
    SC -->|AI処理| Gemini
    
    VD -->|特徴データ保存| PetDB
    BP -->|予測データ保存| MatchDB
    
    SC -->|メッセージ送信| PubSub
    VD -->|メッセージ送信| PubSub
    BP -->|メッセージ送信| PubSub
    
    PubSub -->|イベント通知| WS
    WS -->|リアルタイム更新| UI
    
    BP -->|地図データ取得| Maps
    BP -->|天候データ取得| Weather
    BP -->|位置変換| Geocoding
    
    UI -->|画像アップロード| Storage
    Storage -->|画像配信| UI
    
    APIGW -->|チャット保存| ChatDB
    
    %% 監視
    APIGW -.->|メトリクス| Monitor
    SC -.->|ログ| Logging
    VD -.->|ログ| Logging
    BP -.->|ログ| Logging

    %% スタイリング
    classDef userStyle fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef frontStyle fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef aiStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef dataStyle fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef externalStyle fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class User1,User2,User3 userStyle
    class UI,Auth,APIGW frontStyle
    class VD,BP,SC,Gemini,Vision aiStyle
    class PetDB,MatchDB,ChatDB,Storage,PubSub,WS dataStyle
    class Maps,Weather,Geocoding externalStyle
```

## 簡略版アーキテクチャ（プレゼン用）

```mermaid
graph LR
    subgraph "Users"
        U[ユーザー]
    end
    
    subgraph "Frontend"
        FE[Next.js<br/>on Cloud Run]
    end
    
    subgraph "AI Agents"
        AI1[Visual Detective]
        AI2[Behavior Predictor]
        AI3[Search Coordinator]
    end
    
    subgraph "Google Cloud"
        VA[Vertex AI<br/>Gemini 2.5]
        FS[Firestore]
        CS[Cloud Storage]
    end
    
    U --> FE
    FE --> AI3
    AI3 --> AI1
    AI3 --> AI2
    AI1 --> VA
    AI2 --> VA
    AI1 --> FS
    AI2 --> FS
    FE --> CS
```

## アーキテクチャ説明ポイント

### 1. マルチエージェント協調システム
- **ADK (Agents Development Kit)** を使用し、3つの専門AIエージェントが協調動作
- **Pub/Sub** による非同期通信でスケーラブルな処理を実現
- 各エージェントは独立して動作し、必要に応じて連携

### 2. リアルタイム性の確保
- **WebSocket** によるリアルタイムチャット機能
- **Firestore** のリアルタイム同期機能を活用
- 位置情報やマッチング結果の即座な通知

### 3. スケーラビリティ
- **Cloud Run** の自動スケーリング機能
- サーバーレスアーキテクチャで負荷に応じた柔軟な対応
- **Cloud Storage** による大量画像データの効率的な管理

### 4. AI処理の最適化
- **Gemini 2.5 Pro** によるマルチモーダル処理
- **Vision AI API** による高速な画像特徴抽出
- エッジケースに対応する柔軟なAI処理

### 5. データセキュリティ
- **Firebase Auth** による認証管理
- プライバシーを考慮したデータアクセス制御
- 個人情報の適切な暗号化と管理

## 主要なデータフロー

### ペット登録フロー
1. 飼い主が迷子ペット情報を登録
2. Visual Detective Agentが画像を解析
3. Behavior Predictorが初期予測エリアを生成
4. データをFirestoreに保存
5. Search Coordinatorが捜索戦略を立案

### 発見・マッチングフロー
1. 発見者が画像と位置情報を投稿
2. Visual Detective Agentが既存データと照合
3. 高スコアマッチの場合、飼い主に通知
4. チャット機能で直接連絡可能に

### 捜索最適化フロー
1. 時間経過と共にBehavior Predictorが予測を更新
2. 天候・時間帯データを取得して分析
3. Search Coordinatorが戦略を動的に調整
4. ヒートマップをリアルタイム更新

## 技術選定の理由

- **Cloud Run**: サーバーレスで運用コストを最適化
- **Vertex AI**: 統合されたMLプラットフォームで開発効率向上
- **ADK**: マルチエージェントシステムの構築を簡素化
- **Firestore**: NoSQLでフレキシブルなデータ構造
- **Pub/Sub**: 疎結合なマイクロサービス間通信