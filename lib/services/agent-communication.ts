/**
 * エージェント間通信サービス
 * Pub/Sub風のメッセージングシステムをシミュレート
 */

export interface AgentMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: MessageType;
  payload: any;
  timestamp: Date;
  priority: 'high' | 'normal' | 'low';
}

export type MessageType = 
  | 'behavior_update'
  | 'community_alert'
  | 'sighting_report'
  | 'strategy_request'
  | 'resource_allocation'
  | 'status_update'
  | 'emergency';

export interface MessageHandler {
  (message: AgentMessage): Promise<void>;
}

export class AgentCommunicationService {
  private subscribers: Map<string, Set<MessageHandler>> = new Map();
  private messageQueue: AgentMessage[] = [];
  private processing = false;

  /**
   * メッセージをサブスクライブ
   */
  subscribe(agentId: string, handler: MessageHandler): () => void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set());
    }
    
    this.subscribers.get(agentId)!.add(handler);
    
    // アンサブスクライブ関数を返す
    return () => {
      const handlers = this.subscribers.get(agentId);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribers.delete(agentId);
        }
      }
    };
  }

  /**
   * メッセージを送信
   */
  async send(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date()
    };

    // 優先度に応じてキューに追加
    if (message.priority === 'high') {
      this.messageQueue.unshift(fullMessage);
    } else {
      this.messageQueue.push(fullMessage);
    }

    // メッセージ処理を開始
    if (!this.processing) {
      await this.processQueue();
    }
  }

  /**
   * ブロードキャストメッセージを送信
   */
  async broadcast(
    from: string,
    type: MessageType,
    payload: any,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    await this.send({
      from,
      to: 'broadcast',
      type,
      payload,
      priority
    });
  }

  /**
   * メッセージキューを処理
   */
  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) continue;

      try {
        await this.deliverMessage(message);
      } catch (error) {
        console.error('Message delivery failed:', error);
        // エラーハンドリング: 失敗したメッセージを再試行キューに追加するなど
      }
    }

    this.processing = false;
  }

  /**
   * メッセージを配信
   */
  private async deliverMessage(message: AgentMessage): Promise<void> {
    const handlers: Set<MessageHandler>[] = [];

    if (message.to === 'broadcast') {
      // すべてのサブスクライバーに配信
      this.subscribers.forEach((handlerSet) => {
        handlers.push(handlerSet);
      });
    } else {
      // 特定のエージェントに配信
      const targetHandlers = this.subscribers.get(message.to);
      if (targetHandlers) {
        handlers.push(targetHandlers);
      }
    }

    // 並列で配信
    const promises: Promise<void>[] = [];
    handlers.forEach(handlerSet => {
      handlerSet.forEach(handler => {
        promises.push(this.safeExecuteHandler(handler, message));
      });
    });

    await Promise.allSettled(promises);
  }

  /**
   * ハンドラーを安全に実行
   */
  private async safeExecuteHandler(
    handler: MessageHandler,
    message: AgentMessage
  ): Promise<void> {
    try {
      await handler(message);
    } catch (error) {
      console.error('Handler execution failed:', error);
    }
  }

  /**
   * メッセージIDを生成
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * エージェント間の同期リクエスト
   */
  async requestSync(
    from: string,
    to: string,
    data: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const responseId = this.generateMessageId();
      const timeout = setTimeout(() => {
        reject(new Error('Sync request timeout'));
      }, 5000); // 5秒タイムアウト

      // レスポンスハンドラーを一時的に登録
      const unsubscribe = this.subscribe(from, async (message) => {
        if (message.type === 'strategy_request' && 
            message.payload.responseId === responseId) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(message.payload.data);
        }
      });

      // リクエストを送信
      this.send({
        from,
        to,
        type: 'strategy_request',
        payload: {
          responseId,
          data
        },
        priority: 'high'
      });
    });
  }
}

// シングルトンインスタンス
export const agentCommunication = new AgentCommunicationService();