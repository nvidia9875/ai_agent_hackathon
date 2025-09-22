#!/bin/bash

# Firestore セキュリティルールをデプロイするスクリプト

echo "🚀 Firestore セキュリティルールをデプロイ中..."

# Firebase CLIがインストールされているか確認
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLIがインストールされていません"
    echo "インストール方法: npm install -g firebase-tools"
    exit 1
fi

# プロジェクトIDを設定
PROJECT_ID="ai-hackday-65dad"

# Firebaseプロジェクトを設定
firebase use $PROJECT_ID

# セキュリティルールをデプロイ
firebase deploy --only firestore:rules

echo "✅ Firestore セキュリティルールのデプロイが完了しました"
echo ""
echo "📝 注意事項:"
echo "- 現在のルールは開発用です（読み書き可能）"
echo "- 本番環境では認証を追加してください"
echo "- Firebase Consoleで確認: https://console.firebase.google.com/project/$PROJECT_ID/firestore/rules"