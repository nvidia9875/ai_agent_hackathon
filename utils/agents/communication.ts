/**
 * Agent Communication Utilities
 * エージェント間通信のユーティリティ関数
 */

import { TaskRequest, AgentResponse } from '@/types/agents';

/**
 * メッセージ送信のユーティリティ
 */
export class MessageUtils {
  /**
   * タスクリクエストを検証
   */
  static validateTaskRequest(request: TaskRequest): {
    isValid: boolean;
    errors: string[];
  } {
    // TODO: タスクリクエスト検証の実装
    // 1. 必須フィールドの存在確認
    // 2. データ型の妥当性チェック
    // 3. ペイロードの構造確認
    // 4. 優先度の妥当性確認

    const errors: string[] = [];

    if (!request.task_id) {
      errors.push('task_id is required');
    }

    if (!request.agent_type) {
      errors.push('agent_type is required');
    }

    if (!request.task_type) {
      errors.push('task_type is required');
    }

    if (!request.payload) {
      errors.push('payload is required');
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(request.priority)) {
      errors.push('Invalid priority level');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * メッセージをシリアライズ
   */
  static serializeMessage(message: any): string {
    // TODO: メッセージシリアライゼーションの実装
    // 1. オブジェクトをJSON文字列に変換
    // 2. 必要に応じて圧縮
    // 3. エラーハンドリング
    // 4. メタデータの付与

    try {
      return JSON.stringify({
        ...message,
        serialized_at: new Date().toISOString(),
        version: '1.0.0'
      });
    } catch (error) {
      throw new Error(`Failed to serialize message: ${error}`);
    }
  }

  /**
   * メッセージをデシリアライズ
   */
  static deserializeMessage<T = any>(serializedMessage: string): T {
    // TODO: メッセージデシリアライゼーションの実装
    // 1. JSON文字列をオブジェクトにパース
    // 2. 必要に応じて展開
    // 3. バージョン互換性をチェック
    // 4. データ妥当性を確認

    try {
      const message = JSON.parse(serializedMessage);
      
      // バージョンチェック
      if (message.version && !this.isCompatibleVersion(message.version)) {
        console.warn(`Message version ${message.version} may be incompatible`);
      }

      return message;
    } catch (error) {
      throw new Error(`Failed to deserialize message: ${error}`);
    }
  }

  /**
   * バージョン互換性をチェック
   */
  private static isCompatibleVersion(version: string): boolean {
    // TODO: バージョン互換性チェックの実装
    // 1. セマンティックバージョンをパース
    // 2. 互換性ルールを適用
    // 3. 互換性を判定

    const currentVersion = '1.0.0';
    return version === currentVersion; // 簡易実装
  }

  /**
   * メッセージルーティング情報を生成
   */
  static generateRoutingInfo(
    fromAgent: string,
    toAgent: string,
    messageType: string
  ): {
    topic: string;
    subscription: string;
    routing_key: string;
  } {
    // TODO: ルーティング情報生成の実装
    // 1. エージェント名からトピック名を生成
    // 2. メッセージタイプを考慮
    // 3. ルーティングキーを構築

    return {
      topic: `agent-${toAgent}-tasks`,
      subscription: `${fromAgent}-to-${toAgent}-sub`,
      routing_key: `${fromAgent}.${toAgent}.${messageType}`
    };
  }
}

/**
 * 通信状態管理のユーティリティ
 */
export class CommunicationState {
  private static connections = new Map<string, {
    status: 'connected' | 'disconnected' | 'error';
    lastActivity: string;
    errorCount: number;
  }>();

  /**
   * 接続状態を更新
   */
  static updateConnectionStatus(
    agentId: string,
    status: 'connected' | 'disconnected' | 'error',
    error?: string
  ): void {
    // TODO: 接続状態更新の実装
    // 1. 状態を記録
    // 2. タイムスタンプを更新
    // 3. エラー回数を追跡
    // 4. 必要に応じてアラートを発信

    const existing = this.connections.get(agentId) || {
      status: 'disconnected',
      lastActivity: new Date().toISOString(),
      errorCount: 0
    };

    this.connections.set(agentId, {
      status,
      lastActivity: new Date().toISOString(),
      errorCount: status === 'error' ? existing.errorCount + 1 : 0
    });

    if (status === 'error') {
      console.error(`Communication error with agent ${agentId}:`, error);
    }
  }

  /**
   * 接続状態を取得
   */
  static getConnectionStatus(agentId: string): {
    status: 'connected' | 'disconnected' | 'error' | 'unknown';
    lastActivity?: string;
    errorCount: number;
  } {
    const connection = this.connections.get(agentId);
    
    if (!connection) {
      return {
        status: 'unknown',
        errorCount: 0
      };
    }

    return connection;
  }

  /**
   * 全ての接続状態を取得
   */
  static getAllConnectionStatuses(): Map<string, any> {
    return new Map(this.connections);
  }

  /**
   * 非アクティブな接続をクリーンアップ
   */
  static cleanupInactiveConnections(timeoutMinutes: number = 30): void {
    // TODO: 非アクティブ接続クリーンアップの実装
    // 1. 最終活動時刻をチェック
    // 2. タイムアウトした接続を特定
    // 3. 接続をクリーンアップ
    // 4. ログを出力

    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    
    for (const [agentId, connection] of this.connections) {
      const lastActivity = new Date(connection.lastActivity);
      
      if (lastActivity < cutoffTime) {
        this.connections.delete(agentId);
        console.log(`Cleaned up inactive connection for agent ${agentId}`);
      }
    }
  }
}

/**
 * リトライ機能のユーティリティ
 */
export class RetryUtils {
  /**
   * 指数バックオフでリトライを実行
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
      retryCondition?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    // TODO: リトライ機能の実装
    // 1. 指数バックオフアルゴリズムを実装
    // 2. リトライ条件をチェック
    // 3. 最大リトライ回数を制御
    // 4. 遅延時間を計算・適用

    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
      retryCondition = () => true
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries || !retryCondition(error)) {
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );

        console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * 遅延を実行
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ジッターを追加した遅延
   */
  static jitteredDelay(baseMs: number, jitterRatio: number = 0.1): number {
    // TODO: ジッター付き遅延の実装
    // 1. ベース遅延時間を計算
    // 2. ランダムなジッターを追加
    // 3. 調整された遅延時間を返す

    const jitter = baseMs * jitterRatio * (Math.random() - 0.5) * 2;
    return Math.max(0, baseMs + jitter);
  }
}

/**
 * メッセージ圧縮のユーティリティ
 */
export class CompressionUtils {
  /**
   * メッセージを圧縮
   */
  static async compressMessage(message: string): Promise<{
    compressed: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  }> {
    // TODO: メッセージ圧縮の実装
    // 1. gzip圧縮を適用
    // 2. Base64エンコーディング
    // 3. 圧縮率を計算
    // 4. メタデータを付与

    const originalSize = Buffer.byteLength(message, 'utf8');
    
    // 簡易実装（実際にはzlibを使用）
    const compressed = message; // TODO: 実際の圧縮を実装
    const compressedSize = originalSize; // TODO: 実際のサイズを計算

    return {
      compressed,
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / originalSize
    };
  }

  /**
   * メッセージを展開
   */
  static async decompressMessage(compressedMessage: string): Promise<string> {
    // TODO: メッセージ展開の実装
    // 1. Base64デコーディング
    // 2. gzip展開
    // 3. エラーハンドリング

    return compressedMessage; // TODO: 実際の展開を実装
  }
}