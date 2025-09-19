// Google Cloud Logging用の構造化ログユーティリティ

export interface LogEntry {
  timestamp: string;
  severity: 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  component: string;
  agentId?: string;
  operation?: string;
  duration?: number;
  error?: any;
  metadata?: Record<string, any>;
  // Google Cloud Loggingの特別なフィールド
  'logging.googleapis.com/trace'?: string;
  'logging.googleapis.com/spanId'?: string;
}

class StructuredLogger {
  private isProduction = process.env.NODE_ENV === 'production';
  
  private createLogEntry(
    severity: LogEntry['severity'],
    message: string,
    component: string,
    metadata?: Partial<LogEntry>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      severity,
      message,
      component,
      ...metadata
    };
  }

  private log(entry: LogEntry) {
    if (this.isProduction) {
      // 本番環境ではJSON形式で出力（Cloud Loggingが自動収集）
      console.log(JSON.stringify(entry));
    } else {
      // 開発環境では見やすい形式で出力
      const prefix = `[${entry.severity}] ${entry.component}`;
      const suffix = entry.agentId ? ` (Agent: ${entry.agentId})` : '';
      console.log(`${prefix}${suffix}: ${entry.message}`);
      if (entry.metadata) {
        console.log('  Metadata:', entry.metadata);
      }
      if (entry.error) {
        console.log('  Error:', entry.error);
      }
    }
  }

  // エージェントの状態変更をログ
  agentStatusChanged(agentId: string, oldStatus: string, newStatus: string, metadata?: Record<string, any>) {
    this.log(this.createLogEntry(
      'INFO',
      `Agent status changed from ${oldStatus} to ${newStatus}`,
      'agent-status',
      {
        agentId,
        operation: 'status_change',
        metadata: {
          oldStatus,
          newStatus,
          ...metadata
        }
      }
    ));
  }

  // 処理開始ログ
  processingStarted(agentId: string, operation: string, metadata?: Record<string, any>) {
    this.log(this.createLogEntry(
      'INFO',
      `Processing started: ${operation}`,
      'agent-processing',
      {
        agentId,
        operation,
        metadata
      }
    ));
  }

  // 処理完了ログ
  processingCompleted(agentId: string, operation: string, duration: number, metadata?: Record<string, any>) {
    this.log(this.createLogEntry(
      'INFO',
      `Processing completed: ${operation} (${duration}ms)`,
      'agent-processing',
      {
        agentId,
        operation,
        duration,
        metadata
      }
    ));
  }

  // 処理エラーログ
  processingError(agentId: string, operation: string, error: any, duration?: number, metadata?: Record<string, any>) {
    this.log(this.createLogEntry(
      'ERROR',
      `Processing failed: ${operation}`,
      'agent-processing',
      {
        agentId,
        operation,
        duration,
        error: {
          message: error?.message || 'Unknown error',
          stack: error?.stack,
          code: error?.code
        },
        metadata
      }
    ));
  }

  // API呼び出しログ
  apiCall(endpoint: string, method: string, statusCode: number, duration: number, metadata?: Record<string, any>) {
    const severity = statusCode >= 400 ? 'ERROR' : 'INFO';
    this.log(this.createLogEntry(
      severity,
      `API ${method} ${endpoint} -> ${statusCode} (${duration}ms)`,
      'api',
      {
        operation: 'api_call',
        duration,
        metadata: {
          endpoint,
          method,
          statusCode,
          ...metadata
        }
      }
    ));
  }

  // 一般的なログメソッド
  info(message: string, component: string, metadata?: Record<string, any>) {
    this.log(this.createLogEntry('INFO', message, component, { metadata }));
  }

  warning(message: string, component: string, metadata?: Record<string, any>) {
    this.log(this.createLogEntry('WARNING', message, component, { metadata }));
  }

  error(message: string, component: string, error?: any, metadata?: Record<string, any>) {
    this.log(this.createLogEntry('ERROR', message, component, { error, metadata }));
  }

  debug(message: string, component: string, metadata?: Record<string, any>) {
    this.log(this.createLogEntry('DEBUG', message, component, { metadata }));
  }
}

// シングルトンインスタンス
export const logger = new StructuredLogger();