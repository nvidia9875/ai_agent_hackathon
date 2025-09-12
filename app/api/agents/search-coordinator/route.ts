/**
 * Search Coordinator Agent API Route
 * 捜索統括エージェントのRESTful API
 */

import { NextRequest, NextResponse } from 'next/server';
import { SearchCoordinatorAgent } from '@/agents/search-coordinator';
import { ValidationUtils } from '@/utils/agents/validation';

// Search Coordinator Agent インスタンス
let agentInstance: SearchCoordinatorAgent | null = null;

/**
 * エージェントインスタンスを取得または作成
 */
async function getAgentInstance(): Promise<SearchCoordinatorAgent> {
  if (!agentInstance) {
    agentInstance = new SearchCoordinatorAgent();
    await agentInstance.initialize();
  }
  return agentInstance;
}

/**
 * POST: 捜索統括タスクを実行
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: リクエスト解析と検証
    const body = await request.json();
    const { task_type, payload, task_id } = body;

    if (!task_type || !payload || !task_id) {
      return NextResponse.json(
        { error: 'Missing required fields: task_type, payload, task_id' },
        { status: 400 }
      );
    }

    const agent = await getAgentInstance();

    // タスクタイプに応じて処理を分岐
    let result;
    switch (task_type) {
      case 'initiate_search':
        // TODO: 捜索開始の実装
        result = await handleInitiateSearch(agent, payload);
        break;

      case 'coordinate_agents':
        // TODO: エージェント統括の実装
        result = await handleCoordinateAgents(agent, payload);
        break;

      case 'optimize_search_priority':
        // TODO: 優先度最適化の実装
        result = await handleOptimizeSearchPriority(agent, payload);
        break;

      case 'adjust_strategy_realtime':
        // TODO: リアルタイム戦略調整の実装
        result = await handleAdjustStrategyRealtime(agent, payload);
        break;

      case 'calculate_discovery_probability':
        // TODO: 発見確率計算の実装
        result = await handleCalculateDiscoveryProbability(agent, payload);
        break;

      case 'generate_integrated_dashboard':
        // TODO: 統合ダッシュボード生成の実装
        result = await handleGenerateIntegratedDashboard(agent, payload);
        break;

      case 'generate_progress_report':
        // TODO: 進捗レポート生成の実装
        result = await handleGenerateProgressReport(agent, payload);
        break;

      case 'handle_emergency_response':
        // TODO: 緊急事態対応の実装
        result = await handleEmergencyResponse(agent, payload);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown task type: ${task_type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      task_id,
      status: 'completed',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search Coordinator API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET: エージェント状態とヘルスチェック
 */
export async function GET(request: NextRequest) {
  try {
    const agent = await getAgentInstance();
    const healthStatus = await agent.healthCheck();
    const agentInfo = agent.getAgentInfo();
    const performanceStats = agent.getPerformanceStats();

    // アクティブな捜索ケースの数も含める
    const activeSearches = await getActiveSearchCount();

    return NextResponse.json({
      status: 'healthy',
      agent_info: agentInfo,
      health: healthStatus,
      performance: performanceStats,
      active_searches: activeSearches,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search Coordinator health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 500 }
    );
  }
}

/**
 * 捜索開始を処理
 */
async function handleInitiateSearch(agent: SearchCoordinatorAgent, payload: any) {
  // TODO: 捜索開始処理の実装
  const { pet_info } = payload;

  if (!pet_info) {
    throw new Error('pet_info is required');
  }

  const petValidation = ValidationUtils.validatePetInfo(pet_info);
  if (!petValidation.isValid) {
    throw new Error(`Invalid pet info: ${petValidation.errors.join(', ')}`);
  }

  if (petValidation.warnings.length > 0) {
    console.warn('Pet info validation warnings:', petValidation.warnings);
  }

  const searchInitiation = await agent.initiateSearch(pet_info);

  return {
    search_initiation: searchInitiation,
    initiation_info: {
      pet_id: pet_info.id,
      pet_name: pet_info.name,
      initiated_at: new Date().toISOString()
    }
  };
}

/**
 * エージェント統括を処理
 */
async function handleCoordinateAgents(agent: SearchCoordinatorAgent, payload: any) {
  // TODO: エージェント統括処理の実装
  const { visual_detective_result, behavior_predictor_result, search_id } = payload;

  if (!visual_detective_result || !behavior_predictor_result || !search_id) {
    throw new Error('visual_detective_result, behavior_predictor_result, and search_id are required');
  }

  if (typeof search_id !== 'string' || search_id.length === 0) {
    throw new Error('search_id must be a non-empty string');
  }

  const coordinationResult = await agent.coordinateAgents(
    visual_detective_result,
    behavior_predictor_result,
    search_id
  );

  return {
    coordination_result: coordinationResult,
    coordination_info: {
      search_id,
      coordinated_at: new Date().toISOString()
    }
  };
}

/**
 * 優先度最適化を処理
 */
async function handleOptimizeSearchPriority(agent: SearchCoordinatorAgent, payload: any) {
  // TODO: 優先度最適化処理の実装
  const { current_results, new_evidence, search_id } = payload;

  if (!current_results || !new_evidence || !search_id) {
    throw new Error('current_results, new_evidence, and search_id are required');
  }

  if (!Array.isArray(current_results)) {
    throw new Error('current_results must be an array');
  }

  const optimizationResult = await agent.optimizeSearchPriority(
    current_results,
    new_evidence,
    search_id
  );

  return {
    optimization_result: optimizationResult,
    optimization_info: {
      search_id,
      evidence_count: Array.isArray(new_evidence) ? new_evidence.length : 1,
      optimized_at: new Date().toISOString()
    }
  };
}

/**
 * リアルタイム戦略調整を処理
 */
async function handleAdjustStrategyRealtime(agent: SearchCoordinatorAgent, payload: any) {
  // TODO: リアルタイム戦略調整処理の実装
  const { search_id, trigger } = payload;

  if (!search_id || !trigger) {
    throw new Error('search_id and trigger are required');
  }

  if (!trigger.type || !trigger.data) {
    throw new Error('trigger must have type and data fields');
  }

  const validTriggerTypes = ['sighting', 'weather_change', 'search_completion', 'new_evidence'];
  if (!validTriggerTypes.includes(trigger.type)) {
    throw new Error(`Invalid trigger type. Must be one of: ${validTriggerTypes.join(', ')}`);
  }

  const strategyAdjustment = await agent.adjustStrategyRealtime(search_id, trigger);

  return {
    strategy_adjustment: strategyAdjustment,
    adjustment_info: {
      search_id,
      trigger_type: trigger.type,
      adjusted_at: new Date().toISOString()
    }
  };
}

/**
 * 発見確率計算を処理
 */
async function handleCalculateDiscoveryProbability(agent: SearchCoordinatorAgent, payload: any) {
  // TODO: 発見確率計算処理の実装
  const { search_areas, time_elapsed, search_effort } = payload;

  if (!search_areas || typeof time_elapsed !== 'number' || typeof search_effort !== 'number') {
    throw new Error('search_areas (array), time_elapsed (number), and search_effort (number) are required');
  }

  if (!Array.isArray(search_areas)) {
    throw new Error('search_areas must be an array');
  }

  // 各捜索エリアの妥当性を検証
  const areasValidation = ValidationUtils.validateBatch(
    search_areas,
    (area) => ValidationUtils.validateSearchArea(area)
  );

  if (!areasValidation.overallValid) {
    const errorMessages = areasValidation.invalidItems
      .map(item => item.errors.join(', '))
      .join('; ');
    throw new Error(`Invalid search areas: ${errorMessages}`);
  }

  const discoveryProbability = await agent.calculateDiscoveryProbability(
    search_areas,
    time_elapsed,
    search_effort
  );

  return {
    discovery_probability: discoveryProbability,
    calculation_info: {
      areas_count: search_areas.length,
      time_elapsed,
      search_effort,
      calculated_at: new Date().toISOString()
    }
  };
}

/**
 * 統合ダッシュボード生成を処理
 */
async function handleGenerateIntegratedDashboard(agent: SearchCoordinatorAgent, payload: any) {
  // TODO: 統合ダッシュボード生成処理の実装
  const { search_id } = payload;

  if (!search_id || typeof search_id !== 'string') {
    throw new Error('search_id must be a non-empty string');
  }

  const dashboard = await agent.generateIntegratedDashboard(search_id);

  return {
    dashboard,
    generation_info: {
      search_id,
      generated_at: new Date().toISOString()
    }
  };
}

/**
 * 進捗レポート生成を処理
 */
async function handleGenerateProgressReport(agent: SearchCoordinatorAgent, payload: any) {
  // TODO: 進捗レポート生成処理の実装
  const { search_id, report_type = 'hourly' } = payload;

  if (!search_id || typeof search_id !== 'string') {
    throw new Error('search_id must be a non-empty string');
  }

  const validReportTypes = ['hourly', 'daily', 'final'];
  if (!validReportTypes.includes(report_type)) {
    throw new Error(`Invalid report_type. Must be one of: ${validReportTypes.join(', ')}`);
  }

  const progressReport = await agent.generateProgressReport(search_id, report_type);

  return {
    progress_report: progressReport,
    report_info: {
      search_id,
      report_type,
      generated_at: new Date().toISOString()
    }
  };
}

/**
 * 緊急事態対応を処理
 */
async function handleEmergencyResponse(agent: SearchCoordinatorAgent, payload: any) {
  // TODO: 緊急事態対応処理の実装
  const { search_id, emergency } = payload;

  if (!search_id || !emergency) {
    throw new Error('search_id and emergency are required');
  }

  if (!emergency.type || !emergency.severity || !emergency.description) {
    throw new Error('emergency must have type, severity, and description fields');
  }

  const validEmergencyTypes = ['injury_risk', 'weather_emergency', 'dangerous_location', 'time_critical'];
  const validSeverityLevels = ['low', 'medium', 'high', 'critical'];

  if (!validEmergencyTypes.includes(emergency.type)) {
    throw new Error(`Invalid emergency type. Must be one of: ${validEmergencyTypes.join(', ')}`);
  }

  if (!validSeverityLevels.includes(emergency.severity)) {
    throw new Error(`Invalid severity level. Must be one of: ${validSeverityLevels.join(', ')}`);
  }

  if (emergency.location) {
    const locationValidation = ValidationUtils.validateLocation(emergency.location);
    if (!locationValidation.isValid) {
      throw new Error(`Invalid emergency location: ${locationValidation.errors.join(', ')}`);
    }
  }

  const emergencyResponse = await agent.handleEmergencyResponse(search_id, emergency);

  return {
    emergency_response: emergencyResponse,
    response_info: {
      search_id,
      emergency_type: emergency.type,
      severity: emergency.severity,
      responded_at: new Date().toISOString()
    }
  };
}

/**
 * アクティブな捜索数を取得
 */
async function getActiveSearchCount(): Promise<number> {
  // TODO: アクティブ捜索数取得の実装
  // 1. データベースからアクティブな捜索を取得
  // 2. 件数を返す
  return 0; // 仮実装
}