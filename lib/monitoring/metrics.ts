import { MetricServiceClient } from '@google-cloud/monitoring';
import { google } from '@google-cloud/monitoring/build/protos/protos';

interface AgentMetrics {
  agentId: string;
  status: 'idle' | 'processing' | 'error';
  totalProcessed: number;
  processingTime?: number;
  errorCount: number;
}

class CloudMonitoringClient {
  private client: MetricServiceClient | null = null;
  private projectId: string;
  private enabled: boolean = false;
  private lastMetricsSent: Map<string, number> = new Map(); // メトリクス送信時刻を記録
  private minInterval: number = 60000; // 最小送信間隔を60秒に設定

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'ai-agent-hackathon';
    
    try {
      // 認証情報が設定されている場合のみクライアントを初期化
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT_ID) {
        this.client = new MetricServiceClient();
        this.enabled = true;
        console.log('[Monitoring] Cloud Monitoring client initialized');
      } else {
        console.log('[Monitoring] Cloud Monitoring disabled - no credentials found');
      }
    } catch (error) {
      console.warn('[Monitoring] Failed to initialize Cloud Monitoring client:', error);
      this.enabled = false;
    }
  }

  private get projectName() {
    return this.client?.projectPath(this.projectId) || '';
  }

  // エージェントの状態メトリクスを送信
  async reportAgentStatus(metrics: AgentMetrics) {
    if (!this.enabled || !this.client) {
      return; // ログを減らすためにログ出力を削除
    }

    // レート制限チェック
    const metricKey = `agent_status_${metrics.agentId}`;
    const now = Date.now();
    const lastSent = this.lastMetricsSent.get(metricKey) || 0;
    
    if (now - lastSent < this.minInterval) {
      // 送信間隔が短すぎる場合はスキップ
      return;
    }

    this.lastMetricsSent.set(metricKey, now);

    try {
      const dataPoints = [
        // エージェント状態（0: idle, 1: processing, 2: error）
        {
          metricKind: google.api.MetricDescriptor.MetricKind.GAUGE,
          valueType: google.api.MetricDescriptor.ValueType.INT64,
          type: 'custom.googleapis.com/agent/status',
          labels: { agent_id: metrics.agentId },
          value: this.getStatusValue(metrics.status)
        },
        // 処理済み画像数
        {
          metricKind: google.api.MetricDescriptor.MetricKind.CUMULATIVE,
          valueType: google.api.MetricDescriptor.ValueType.INT64,
          type: 'custom.googleapis.com/agent/total_processed',
          labels: { agent_id: metrics.agentId },
          value: metrics.totalProcessed
        },
        // エラー数
        {
          metricKind: google.api.MetricDescriptor.MetricKind.CUMULATIVE,
          valueType: google.api.MetricDescriptor.ValueType.INT64,
          type: 'custom.googleapis.com/agent/error_count',
          labels: { agent_id: metrics.agentId },
          value: metrics.errorCount
        }
      ];

      // 処理時間がある場合は追加
      if (metrics.processingTime) {
        dataPoints.push({
          metricKind: google.api.MetricDescriptor.MetricKind.GAUGE,
          valueType: google.api.MetricDescriptor.ValueType.DOUBLE,
          type: 'custom.googleapis.com/agent/processing_time_ms',
          labels: { agent_id: metrics.agentId },
          value: metrics.processingTime
        });
      }

      const now = Date.now();
      const request = {
        name: this.projectName,
        timeSeries: dataPoints.map(point => ({
          metric: {
            type: point.type,
            labels: point.labels
          },
          resource: {
            type: 'global'
          },
          points: [{
            interval: {
              endTime: { seconds: Math.floor(now / 1000), nanos: (now % 1000) * 1000000 }
            },
            value: point.valueType === google.api.MetricDescriptor.ValueType.INT64 
              ? { int64Value: point.value }
              : { doubleValue: point.value }
          }]
        }))
      };

      await this.client.createTimeSeries(request);
      console.log(`[Monitoring] Metrics sent for agent: ${metrics.agentId}`);

    } catch (error: any) {
      if (error?.code === 7) {
        console.warn('[Monitoring] Permission denied for metrics. Please grant monitoring.timeSeries.create permission to the service account.');
        // 権限エラーの場合は監視を無効化
        this.enabled = false;
      } else {
        console.error('[Monitoring] Failed to send metrics:', error);
      }
      // メトリクス送信の失敗はアプリケーションを止めない
    }
  }

  // 処理完了時のメトリクス送信
  async reportProcessingCompleted(agentId: string, processingTimeMs: number, success: boolean) {
    if (!this.enabled || !this.client) {
      return; // ログを減らすためにログ出力を削除
    }

    // レート制限チェック
    const metricKey = `processing_${agentId}`;
    const now = Date.now();
    const lastSent = this.lastMetricsSent.get(metricKey) || 0;
    
    if (now - lastSent < this.minInterval) {
      // 送信間隔が短すぎる場合はスキップ
      return;
    }

    this.lastMetricsSent.set(metricKey, now);

    try {
      const now = Date.now();
      const request = {
        name: this.projectName,
        timeSeries: [
          // 処理回数
          {
            metric: {
              type: 'custom.googleapis.com/agent/processing_count',
              labels: { 
                agent_id: agentId,
                status: success ? 'success' : 'error'
              }
            },
            resource: { type: 'global' },
            points: [{
              interval: {
                endTime: { seconds: Math.floor(now / 1000), nanos: (now % 1000) * 1000000 }
              },
              value: { int64Value: 1 }
            }]
          },
          // 処理時間
          {
            metric: {
              type: 'custom.googleapis.com/agent/processing_duration_ms',
              labels: { agent_id: agentId }
            },
            resource: { type: 'global' },
            points: [{
              interval: {
                endTime: { seconds: Math.floor(now / 1000), nanos: (now % 1000) * 1000000 }
              },
              value: { doubleValue: processingTimeMs }
            }]
          }
        ]
      };

      await this.client.createTimeSeries(request);
      console.log(`[Monitoring] Processing metrics sent for agent: ${agentId}`);

    } catch (error: any) {
      if (error?.code === 7) {
        console.warn('[Monitoring] Permission denied for processing metrics. Please grant monitoring.timeSeries.create permission to the service account.');
        this.enabled = false;
      } else {
        console.error('[Monitoring] Failed to send processing metrics:', error);
      }
    }
  }

  private getStatusValue(status: 'idle' | 'processing' | 'error'): number {
    switch (status) {
      case 'idle': return 0;
      case 'processing': return 1;
      case 'error': return 2;
      default: return -1;
    }
  }

  // 監視が有効かどうかを確認
  isEnabled(): boolean {
    return this.enabled;
  }

  // カスタムメトリクス定義を作成（初回セットアップ時に実行）
  async createMetricDescriptors() {
    if (!this.enabled || !this.client) {
      throw new Error('Cloud Monitoring is not enabled. Please check your credentials and permissions.');
    }
    const descriptors = [
      {
        type: 'custom.googleapis.com/agent/status',
        metricKind: google.api.MetricDescriptor.MetricKind.GAUGE,
        valueType: google.api.MetricDescriptor.ValueType.INT64,
        displayName: 'Agent Status',
        description: 'Current status of the AI agent (0: idle, 1: processing, 2: error)'
      },
      {
        type: 'custom.googleapis.com/agent/total_processed',
        metricKind: google.api.MetricDescriptor.MetricKind.CUMULATIVE,
        valueType: google.api.MetricDescriptor.ValueType.INT64,
        displayName: 'Total Images Processed',
        description: 'Total number of images processed by the agent'
      },
      {
        type: 'custom.googleapis.com/agent/error_count',
        metricKind: google.api.MetricDescriptor.MetricKind.CUMULATIVE,
        valueType: google.api.MetricDescriptor.ValueType.INT64,
        displayName: 'Error Count',
        description: 'Total number of errors encountered by the agent'
      },
      {
        type: 'custom.googleapis.com/agent/processing_time_ms',
        metricKind: google.api.MetricDescriptor.MetricKind.GAUGE,
        valueType: google.api.MetricDescriptor.ValueType.DOUBLE,
        displayName: 'Processing Time (ms)',
        description: 'Current processing time in milliseconds'
      },
      {
        type: 'custom.googleapis.com/agent/processing_count',
        metricKind: google.api.MetricDescriptor.MetricKind.CUMULATIVE,
        valueType: google.api.MetricDescriptor.ValueType.INT64,
        displayName: 'Processing Count',
        description: 'Number of processing operations'
      },
      {
        type: 'custom.googleapis.com/agent/processing_duration_ms',
        metricKind: google.api.MetricDescriptor.MetricKind.GAUGE,
        valueType: google.api.MetricDescriptor.ValueType.DOUBLE,
        displayName: 'Processing Duration (ms)',
        description: 'Time taken to complete processing operation'
      }
    ];

    for (const descriptor of descriptors) {
      try {
        const request = {
          name: this.projectName,
          metricDescriptor: descriptor
        };
        await this.client.createMetricDescriptor(request);
        console.log(`[Monitoring] Created metric descriptor: ${descriptor.type}`);
      } catch (error: any) {
        if (error?.code === 6) {
          // Already exists - これは正常
          console.log(`[Monitoring] Metric descriptor already exists: ${descriptor.type}`);
        } else {
          console.error(`[Monitoring] Failed to create metric descriptor ${descriptor.type}:`, error);
        }
      }
    }
  }
}

// シングルトンインスタンス
export const cloudMonitoring = new CloudMonitoringClient();
export type { AgentMetrics };