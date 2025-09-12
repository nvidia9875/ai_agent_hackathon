/**
 * Behavior Predictor Agent API Route
 * 行動予測エージェントのRESTful API
 */

import { NextRequest, NextResponse } from 'next/server';
import { BehaviorPredictorAgent } from '@/agents/behavior-predictor';
import { ValidationUtils } from '@/utils/agents/validation';

// Behavior Predictor Agent インスタンス
let agentInstance: BehaviorPredictorAgent | null = null;

/**
 * エージェントインスタンスを取得または作成
 */
async function getAgentInstance(): Promise<BehaviorPredictorAgent> {
  if (!agentInstance) {
    agentInstance = new BehaviorPredictorAgent();
    await agentInstance.initialize();
  }
  return agentInstance;
}

/**
 * POST: 行動予測タスクを実行
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
      case 'predict_behavior':
        // TODO: 行動予測の実装
        result = await handlePredictBehavior(agent, payload);
        break;

      case 'calculate_movement_range':
        // TODO: 移動範囲計算の実装
        result = await handleCalculateMovementRange(agent, payload);
        break;

      case 'analyze_weather_impact':
        // TODO: 天候影響分析の実装
        result = await handleAnalyzeWeatherImpact(agent, payload);
        break;

      case 'identify_danger_zones':
        // TODO: 危険エリア特定の実装
        result = await handleIdentifyDangerZones(agent, payload);
        break;

      case 'identify_resource_locations':
        // TODO: リソース位置推定の実装
        result = await handleIdentifyResourceLocations(agent, payload);
        break;

      case 'generate_heatmap':
        // TODO: ヒートマップ生成の実装
        result = await handleGenerateHeatmap(agent, payload);
        break;

      case 'generate_search_points':
        // TODO: 捜索ポイント生成の実装
        result = await handleGenerateSearchPoints(agent, payload);
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
    console.error('Behavior Predictor API error:', error);
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

    return NextResponse.json({
      status: 'healthy',
      agent_info: agentInfo,
      health: healthStatus,
      performance: performanceStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Behavior Predictor health check error:', error);
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
 * 行動予測を処理
 */
async function handlePredictBehavior(agent: BehaviorPredictorAgent, payload: any) {
  // TODO: 行動予測処理の実装
  const { pet_info } = payload;

  if (!pet_info) {
    throw new Error('pet_info is required');
  }

  const petValidation = ValidationUtils.validatePetInfo(pet_info);
  if (!petValidation.isValid) {
    throw new Error(`Invalid pet info: ${petValidation.errors.join(', ')}`);
  }

  const predictionResult = await agent.predictBehavior(pet_info);

  return {
    prediction_result: predictionResult,
    processing_info: {
      pet_id: pet_info.id,
      predicted_at: new Date().toISOString()
    }
  };
}

/**
 * 移動範囲計算を処理
 */
async function handleCalculateMovementRange(agent: BehaviorPredictorAgent, payload: any) {
  // TODO: 移動範囲計算処理の実装
  const { last_seen_location, pet_info, time_intervals } = payload;

  if (!last_seen_location || !pet_info) {
    throw new Error('last_seen_location and pet_info are required');
  }

  const locationValidation = ValidationUtils.validateLocation(last_seen_location);
  if (!locationValidation.isValid) {
    throw new Error(`Invalid location: ${locationValidation.errors.join(', ')}`);
  }

  const movementRanges = await agent.calculateMovementRange(
    last_seen_location,
    pet_info,
    time_intervals
  );

  return {
    movement_ranges: movementRanges,
    calculation_info: {
      base_location: last_seen_location,
      pet_id: pet_info.id,
      calculated_at: new Date().toISOString()
    }
  };
}

/**
 * 天候影響分析を処理
 */
async function handleAnalyzeWeatherImpact(agent: BehaviorPredictorAgent, payload: any) {
  // TODO: 天候影響分析処理の実装
  const { location, timestamp } = payload;

  if (!location || !timestamp) {
    throw new Error('location and timestamp are required');
  }

  const locationValidation = ValidationUtils.validateLocation(location);
  if (!locationValidation.isValid) {
    throw new Error(`Invalid location: ${locationValidation.errors.join(', ')}`);
  }

  const timestampValidation = ValidationUtils.validateTimestamp(timestamp);
  if (!timestampValidation.isValid) {
    throw new Error(timestampValidation.error);
  }

  const weatherImpact = await agent.analyzeWeatherImpact(location, timestamp);

  return {
    weather_impact: weatherImpact,
    analysis_info: {
      analyzed_location: location,
      analyzed_timestamp: timestamp,
      analyzed_at: new Date().toISOString()
    }
  };
}

/**
 * 危険エリア特定を処理
 */
async function handleIdentifyDangerZones(agent: BehaviorPredictorAgent, payload: any) {
  // TODO: 危険エリア特定処理の実装
  const { center_location, radius } = payload;

  if (!center_location || !radius) {
    throw new Error('center_location and radius are required');
  }

  const locationValidation = ValidationUtils.validateLocation(center_location);
  if (!locationValidation.isValid) {
    throw new Error(`Invalid location: ${locationValidation.errors.join(', ')}`);
  }

  if (typeof radius !== 'number' || radius <= 0 || radius > 50000) {
    throw new Error('Radius must be a positive number up to 50000 meters');
  }

  const dangerZones = await agent.identifyDangerZones(center_location, radius);

  return {
    danger_zones: dangerZones,
    search_info: {
      center: center_location,
      radius,
      identified_at: new Date().toISOString()
    }
  };
}

/**
 * リソース位置推定を処理
 */
async function handleIdentifyResourceLocations(agent: BehaviorPredictorAgent, payload: any) {
  // TODO: リソース位置推定処理の実装
  const { center_location, pet_type, radius } = payload;

  if (!center_location || !pet_type || !radius) {
    throw new Error('center_location, pet_type, and radius are required');
  }

  const locationValidation = ValidationUtils.validateLocation(center_location);
  if (!locationValidation.isValid) {
    throw new Error(`Invalid location: ${locationValidation.errors.join(', ')}`);
  }

  if (!['dog', 'cat'].includes(pet_type)) {
    throw new Error('pet_type must be either "dog" or "cat"');
  }

  const resources = await agent.identifyResourceLocations(center_location, pet_type, radius);

  return {
    resources,
    search_info: {
      center: center_location,
      pet_type,
      radius,
      identified_at: new Date().toISOString()
    }
  };
}

/**
 * ヒートマップ生成を処理
 */
async function handleGenerateHeatmap(agent: BehaviorPredictorAgent, payload: any) {
  // TODO: ヒートマップ生成処理の実装
  const { prediction_result, map_bounds } = payload;

  if (!prediction_result || !map_bounds) {
    throw new Error('prediction_result and map_bounds are required');
  }

  // マップ境界の検証
  const { north, south, east, west } = map_bounds;
  if (typeof north !== 'number' || typeof south !== 'number' ||
      typeof east !== 'number' || typeof west !== 'number') {
    throw new Error('Invalid map bounds: all coordinates must be numbers');
  }

  if (north <= south || east <= west) {
    throw new Error('Invalid map bounds: north > south and east > west required');
  }

  const heatmap = await agent.generateHeatmap(prediction_result, map_bounds);

  return {
    heatmap,
    generation_info: {
      bounds: map_bounds,
      generated_at: new Date().toISOString()
    }
  };
}

/**
 * 捜索ポイント生成を処理
 */
async function handleGenerateSearchPoints(agent: BehaviorPredictorAgent, payload: any) {
  // TODO: 捜索ポイント生成処理の実装
  const { prediction_result, resources, max_points = 10 } = payload;

  if (!prediction_result || !resources) {
    throw new Error('prediction_result and resources are required');
  }

  if (typeof max_points !== 'number' || max_points <= 0 || max_points > 50) {
    throw new Error('max_points must be a number between 1 and 50');
  }

  const searchPoints = await agent.generateSearchPoints(
    prediction_result,
    resources,
    max_points
  );

  return {
    search_points: searchPoints,
    generation_info: {
      max_points,
      generated_at: new Date().toISOString()
    }
  };
}