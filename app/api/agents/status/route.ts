import { NextResponse } from 'next/server';
import { VisualDetectiveAgent } from '@/agents/visual-detective';
import { cloudMonitoring, type AgentMetrics } from '@/lib/monitoring/metrics';
import { logger } from '@/lib/monitoring/logger';

// エージェントインスタンスの管理（本来はRedisやメモリストアで管理）
let visualAgent: VisualDetectiveAgent | null = null;

// エージェントの統計情報を管理（本来はデータベースで管理）
const agentStats = {
  totalImagesProcessed: 0,
  totalAnalysisRuns: 0,
  errorCount: 0,
  startTime: new Date(),
  currentProgress: 100 // 現在の進捗率を記録（安定した値を維持）
};

export async function GET() {
  try {
    // Visual Detective Agentのインスタンスがない場合は作成
    if (!visualAgent) {
      visualAgent = new VisualDetectiveAgent();
    }

    // 実際のエージェント性能データを取得
    const performanceStats = visualAgent.getStatus ? visualAgent.getStatus() : {
      id: visualAgent.id,
      name: visualAgent.name,
      status: visualAgent.status,
      lastActivity: visualAgent.lastActivity
    };

    // 各エージェントの状態を取得
    const agentStatuses = [
      {
        id: 'visual-detective',
        name: '画像解析',
        status: visualAgent.status,
        progress: getProgressFromStatus(visualAgent.status, agentStats.currentProgress),
        description: getDescriptionFromStatus(visualAgent.status, agentStats.totalAnalysisRuns),
        lastActivity: visualAgent.lastActivity,
        color: getColorFromStatus(visualAgent.status),
        icon: 'ImageSearch'
      }
    ];

    const activeAgentsCount = agentStatuses.filter(a => a.status === 'processing').length;
    const overallProgress = agentStatuses.length > 0 
      ? Math.round(agentStatuses.reduce((acc, agent) => acc + agent.progress, 0) / agentStatuses.length)
      : 0;

    // Cloud Monitoringにメトリクスを送信
    const metrics: AgentMetrics = {
      agentId: 'visual-detective',
      status: visualAgent.status,
      totalProcessed: agentStats.totalImagesProcessed,
      errorCount: agentStats.errorCount
    };
    
    // 非同期でメトリクス送信（レスポンスを遅らせない）
    cloudMonitoring.reportAgentStatus(metrics).catch(error => {
      console.error('Failed to send metrics to Cloud Monitoring:', error);
    });

    return NextResponse.json({
      success: true,
      agents: agentStatuses,
      totalProcessed: agentStats.totalImagesProcessed,
      activeAgents: activeAgentsCount,
      overallProgress: overallProgress,
      uptime: Math.floor((Date.now() - agentStats.startTime.getTime()) / 1000), // 秒単位
      lastUpdate: new Date()
    });

  } catch (error) {
    console.error('Error fetching agent status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent status' },
      { status: 500 }
    );
  }
}

function getProgressFromStatus(status: 'idle' | 'processing' | 'error', currentProgress: number): number {
  switch (status) {
    case 'idle':
      return 100;
    case 'processing':
      // 処理中は徐々に進捗するようなシミュレーション（ランダムを削除）
      return Math.min(95, currentProgress + 5); // 最大95%まで徐々に進捗
    case 'error':
      return 0;
    default:
      return 0;
  }
}

function getDescriptionFromStatus(status: 'idle' | 'processing' | 'error', analysisCount: number): string {
  switch (status) {
    case 'idle':
      return analysisCount > 0 ? `${analysisCount}件の解析完了` : '待機中';
    case 'processing':
      return '画像解析実行中...';
    case 'error':
      return 'エラーが発生しました';
    default:
      return '不明';
  }
}

function getColorFromStatus(status: 'idle' | 'processing' | 'error'): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'idle':
      return 'success';
    case 'processing':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'error';
  }
}

// エージェントの状態を更新するためのエンドポイント
export async function POST(request: Request) {
  try {
    const { agentId, status, action } = await request.json();
    
    if (agentId === 'visual-detective' && visualAgent) {
      const oldStatus = visualAgent.status;
      visualAgent.status = status;
      visualAgent.lastActivity = new Date();
      
      // 状態変更をログに記録
      logger.agentStatusChanged(agentId, oldStatus, status);
      
      // アクションに応じて統計情報を更新
      if (action === 'image_analysis_completed') {
        agentStats.totalImagesProcessed += 1;
        agentStats.totalAnalysisRuns += 1;
        agentStats.currentProgress = 100; // 完了時は100%にリセット
        logger.info(`Image analysis completed. Total processed: ${agentStats.totalImagesProcessed}`, 'agent-stats', {
          agentId,
          totalProcessed: agentStats.totalImagesProcessed
        });
      } else if (action === 'analysis_started') {
        agentStats.totalAnalysisRuns += 1;
        agentStats.currentProgress = 10; // 開始時は10%に設定
        logger.processingStarted(agentId, 'image_analysis');
      } else if (status === 'error') {
        agentStats.errorCount += 1;
        agentStats.currentProgress = 0; // エラー時は0%
      } else if (status === 'processing') {
        // 処理中の場合は進捗を更新
        agentStats.currentProgress = Math.min(95, agentStats.currentProgress + 5);
      }

      // Cloud Monitoringにメトリクス送信
      const metrics: AgentMetrics = {
        agentId,
        status,
        totalProcessed: agentStats.totalImagesProcessed,
        errorCount: agentStats.errorCount
      };
      
      cloudMonitoring.reportAgentStatus(metrics).catch(error => {
        logger.error('Failed to send metrics to Cloud Monitoring', 'monitoring', error);
      });
    }

    return NextResponse.json({ 
      success: true, 
      stats: {
        totalProcessed: agentStats.totalImagesProcessed,
        totalRuns: agentStats.totalAnalysisRuns,
        errorCount: agentStats.errorCount
      }
    });
  } catch (error) {
    logger.error('Failed to update agent status', 'api', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update agent status' },
      { status: 500 }
    );
  }
}

// 外部から統計情報にアクセスするための関数（他のAPIで使用）
export function incrementImageProcessed() {
  agentStats.totalImagesProcessed += 1;
}

export function incrementAnalysisRun() {
  agentStats.totalAnalysisRuns += 1;
}