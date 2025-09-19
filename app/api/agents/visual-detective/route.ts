import { NextRequest, NextResponse } from 'next/server';
import { VisualDetectiveAgent } from '@/agents/visual-detective';
import { cloudMonitoring } from '@/lib/monitoring/metrics';
import { logger } from '@/lib/monitoring/logger';

// エージェントのシングルトンインスタンス
let visualDetectiveAgent: VisualDetectiveAgent | null = null;

function getAgent() {
  if (!visualDetectiveAgent) {
    visualDetectiveAgent = new VisualDetectiveAgent();
  }
  return visualDetectiveAgent;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      logger.warning('No image file provided in request', 'api', { endpoint: '/api/agents/visual-detective' });
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    logger.processingStarted('visual-detective', 'image_analysis', {
      filename: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // エージェント状態を処理中に更新
    await updateAgentStatus('visual-detective', 'processing', 'analysis_started');

    // ファイルをBufferに変換
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Visual Detective Agentで解析
    const agent = getAgent();
    const analysisResult = await agent.analyze(buffer);

    // 類似ペット検索
    const similarPets = await agent.findSimilarPets(analysisResult.features);

    const processingTime = Date.now() - startTime;

    // エージェント状態を待機中に更新し、画像処理完了をカウント
    await updateAgentStatus('visual-detective', 'idle', 'image_analysis_completed');

    // 処理完了メトリクスをCloud Monitoringに送信
    cloudMonitoring.reportProcessingCompleted('visual-detective', processingTime, true)
      .catch(error => logger.error('Failed to send processing metrics', 'monitoring', error));

    logger.processingCompleted('visual-detective', 'image_analysis', processingTime, {
      confidence: analysisResult.confidence,
      petType: analysisResult.petType,
      similarPetsFound: similarPets.length
    });

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      similarPets: similarPets,
      agentStatus: agent.getStatus(),
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.processingError('visual-detective', 'image_analysis', error, processingTime);
    
    // エラー状態に更新
    await updateAgentStatus('visual-detective', 'error', null);
    
    // エラーメトリクスをCloud Monitoringに送信
    cloudMonitoring.reportProcessingCompleted('visual-detective', processingTime, false)
      .catch(metricsError => logger.error('Failed to send error metrics', 'monitoring', metricsError));
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// エージェント状態を更新するヘルパー関数
async function updateAgentStatus(agentId: string, status: 'idle' | 'processing' | 'error', action: string | null) {
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/agents/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, status, action })
    });
  } catch (error) {
    console.error('Failed to update agent status:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const agent = getAgent();
    
    return NextResponse.json({
      status: agent.getStatus(),
      health: 'ok',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get agent status' },
      { status: 500 }
    );
  }
}