/**
 * 戦略最適化サービス
 * リアルタイムで捜索戦略を動的に調整
 */

import { Pet } from '@/types/pet';

export interface SearchZone {
  id: string;
  center: { lat: number; lng: number };
  radius: number;
  priority: 'high' | 'medium' | 'low';
  probability: number;
  recommendedTime?: string;
  notes?: string;
}

export interface SearchStrategy {
  id: string;
  searchZones: SearchZone[];
  priorityOrder: string[];
  estimatedDuration: number;
  resourceAllocation: Record<string, number>;
  confidence: number;
}

export interface OptimizationContext {
  currentStrategy: SearchStrategy;
  searchHistory: SearchHistoryItem[];
  environmentalFactors: EnvironmentalFactors;
  resourceConstraints: ResourceConstraints;
}

export interface SearchHistoryItem {
  zoneId: string;
  timestamp: Date;
  result: 'found' | 'not_found' | 'partial_clue';
  confidence: number;
  resourcesUsed: {
    volunteers: number;
    timeHours: number;
  };
}

export interface EnvironmentalFactors {
  currentWeather: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
  temperature: number;
  visibility: 'good' | 'moderate' | 'poor';
}

export interface ResourceConstraints {
  availableVolunteers: number;
  maxSearchHours: number;
  equipmentAvailable: string[];
  budget?: number;
}

export interface OptimizationResult {
  optimizedStrategy: SearchStrategy;
  adjustments: StrategyAdjustment[];
  expectedImprovement: number;
  reasoning: string[];
}

export interface StrategyAdjustment {
  type: 'add_zone' | 'remove_zone' | 'modify_zone' | 'reallocate_resources';
  zoneId?: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export class StrategyOptimizer {
  /**
   * 戦略を最適化
   */
  optimizeStrategy(
    context: OptimizationContext,
    pet: Pet
  ): OptimizationResult {
    const adjustments: StrategyAdjustment[] = [];
    const reasoning: string[] = [];

    // 現在の戦略をコピー
    let optimizedStrategy = JSON.parse(JSON.stringify(context.currentStrategy)) as SearchStrategy;

    // 1. 過去の捜索結果を分析
    const zonePerformance = this.analyzeZonePerformance(context.searchHistory);
    adjustments.push(...this.adjustZonesBasedOnPerformance(optimizedStrategy, zonePerformance));

    // 2. 環境要因に基づく調整
    const environmentalAdjustments = this.adjustForEnvironment(
      optimizedStrategy,
      context.environmentalFactors
    );
    adjustments.push(...environmentalAdjustments.adjustments);
    reasoning.push(...environmentalAdjustments.reasoning);

    // 3. リソース制約に基づく最適化
    const resourceOptimization = this.optimizeResourceAllocation(
      optimizedStrategy,
      context.resourceConstraints
    );
    optimizedStrategy.resources = resourceOptimization.allocation;
    adjustments.push(...resourceOptimization.adjustments);

    // 4. 時間帯に応じた優先度調整
    this.adjustPriorityByTimeOfDay(
      optimizedStrategy,
      context.environmentalFactors.timeOfDay
    );

    // 5. 発見確率の再計算
    optimizedStrategy.estimatedDiscoveryProbability = this.recalculateProbability(
      optimizedStrategy,
      context
    );

    // 期待される改善度を計算
    const expectedImprovement = this.calculateExpectedImprovement(
      context.currentStrategy,
      optimizedStrategy
    );

    return {
      optimizedStrategy,
      adjustments,
      expectedImprovement,
      reasoning
    };
  }

  /**
   * ゾーンパフォーマンスを分析
   */
  private analyzeZonePerformance(
    history: SearchHistoryItem[]
  ): Map<string, number> {
    const performance = new Map<string, number>();

    history.forEach(item => {
      const currentScore = performance.get(item.zoneId) || 0.5;
      
      // 結果に基づくスコア調整
      let adjustment = 0;
      if (item.result === 'found') {
        adjustment = 0.5;
      } else if (item.result === 'partial_clue') {
        adjustment = 0.2;
      } else {
        adjustment = -0.1;
      }

      // 信頼度で重み付け
      adjustment *= item.confidence;
      
      performance.set(item.zoneId, Math.max(0, Math.min(1, currentScore + adjustment)));
    });

    return performance;
  }

  /**
   * パフォーマンスに基づいてゾーンを調整
   */
  private adjustZonesBasedOnPerformance(
    strategy: SearchStrategy,
    performance: Map<string, number>
  ): StrategyAdjustment[] {
    const adjustments: StrategyAdjustment[] = [];

    strategy.searchZones.forEach(zone => {
      const zonePerformance = performance.get(zone.id) || 0.5;

      if (zonePerformance < 0.3) {
        // パフォーマンスが低いゾーンの優先度を下げる
        zone.priority = Math.max(1, zone.priority - 2);
        adjustments.push({
          type: 'modify_zone',
          zoneId: zone.id,
          description: `ゾーン${zone.id}の優先度を下げる（パフォーマンス: ${(zonePerformance * 100).toFixed(0)}%）`,
          impact: 'medium'
        });
      } else if (zonePerformance > 0.7) {
        // パフォーマンスが高いゾーンの優先度を上げる
        zone.priority = Math.min(10, zone.priority + 2);
        zone.radius = zone.radius * 1.2; // エリアを拡大
        adjustments.push({
          type: 'modify_zone',
          zoneId: zone.id,
          description: `ゾーン${zone.id}を拡大し優先度を上げる（パフォーマンス: ${(zonePerformance * 100).toFixed(0)}%）`,
          impact: 'high'
        });
      }
    });

    return adjustments;
  }

  /**
   * 環境要因に基づく調整
   */
  private adjustForEnvironment(
    strategy: SearchStrategy,
    factors: EnvironmentalFactors
  ): { adjustments: StrategyAdjustment[], reasoning: string[] } {
    const adjustments: StrategyAdjustment[] = [];
    const reasoning: string[] = [];

    // 視界不良時の調整
    if (factors.visibility === 'poor') {
      strategy.searchZones.forEach(zone => {
        zone.radius = zone.radius * 0.7; // 捜索範囲を狭める
        zone.searchMethod = zone.searchMethod.filter(m => m !== 'drone_survey');
      });
      
      adjustments.push({
        type: 'modify_zone',
        description: '視界不良のため捜索範囲を縮小',
        impact: 'high'
      });
      
      reasoning.push('視界不良のため、より集中的な地上捜索に切り替えます');
    }

    // 夜間の調整
    if (factors.timeOfDay === 'night') {
      strategy.resources.recommendedVolunteers = 
        Math.max(2, Math.floor(strategy.resources.recommendedVolunteers * 0.5));
      
      adjustments.push({
        type: 'reallocate_resources',
        description: '夜間のため少数精鋭での捜索に変更',
        impact: 'medium'
      });
      
      reasoning.push('夜間は安全を考慮し、経験豊富なメンバーでの捜索を推奨');
    }

    // 週末の調整
    if (factors.dayOfWeek === 0 || factors.dayOfWeek === 6) {
      strategy.resources.recommendedVolunteers = 
        Math.floor(strategy.resources.recommendedVolunteers * 1.5);
      
      adjustments.push({
        type: 'reallocate_resources',
        description: '週末のためボランティア増員を提案',
        impact: 'medium'
      });
      
      reasoning.push('週末は協力者が集まりやすいため、大規模捜索を実施');
    }

    // 気温による調整
    if (factors.temperature < 5 || factors.temperature > 35) {
      strategy.resources.estimatedTimeHours = 
        Math.min(strategy.resources.estimatedTimeHours, 2);
      
      adjustments.push({
        type: 'reallocate_resources',
        description: '極端な気温のため捜索時間を短縮',
        impact: 'high'
      });
      
      reasoning.push('過酷な気象条件のため、短時間集中型の捜索に変更');
    }

    return { adjustments, reasoning };
  }

  /**
   * リソース配分を最適化
   */
  private optimizeResourceAllocation(
    strategy: SearchStrategy,
    constraints: ResourceConstraints
  ): { allocation: typeof strategy.resources, adjustments: StrategyAdjustment[] } {
    const adjustments: StrategyAdjustment[] = [];
    const allocation = { ...strategy.resources };

    // ボランティア数の調整
    if (allocation.recommendedVolunteers > constraints.availableVolunteers) {
      allocation.recommendedVolunteers = constraints.availableVolunteers;
      
      // ボランティアが少ない場合は技術でカバー
      if (constraints.equipmentAvailable.includes('drone')) {
        adjustments.push({
          type: 'reallocate_resources',
          description: 'ボランティア不足をドローン捜索で補完',
          impact: 'high'
        });
      }
    }

    // 時間制約の調整
    if (allocation.estimatedTimeHours > constraints.maxSearchHours) {
      allocation.estimatedTimeHours = constraints.maxSearchHours;
      
      // 優先度の高いゾーンに集中
      strategy.searchZones = strategy.searchZones
        .sort((a, b) => b.priority - a.priority)
        .slice(0, Math.ceil(strategy.searchZones.length * 0.6));
      
      adjustments.push({
        type: 'reallocate_resources',
        description: '時間制約のため高優先度ゾーンに集中',
        impact: 'high'
      });
    }

    // エージェント重み付けの最適化
    const totalZones = strategy.searchZones.length;
    const behaviorZones = strategy.searchZones.filter(z => z.assignedAgent === 'behavior').length;
    const communityZones = strategy.searchZones.filter(z => z.assignedAgent === 'community').length;

    allocation.behaviorPredictorWeight = totalZones > 0 ? behaviorZones / totalZones : 0.5;
    allocation.communityNetworkWeight = totalZones > 0 ? communityZones / totalZones : 0.5;

    return { allocation, adjustments };
  }

  /**
   * 時間帯による優先度調整
   */
  private adjustPriorityByTimeOfDay(
    strategy: SearchStrategy,
    timeOfDay: string
  ): void {
    strategy.searchZones.forEach(zone => {
      // 朝夕は活動的なペットが多い
      if (timeOfDay === 'morning' || timeOfDay === 'evening') {
        if (zone.notes.includes('行動パターン')) {
          zone.priority = Math.min(10, zone.priority + 1);
        }
      }
      
      // 昼間は目撃情報が集まりやすい
      if (timeOfDay === 'afternoon') {
        if (zone.notes.includes('目撃情報')) {
          zone.priority = Math.min(10, zone.priority + 1);
        }
      }
      
      // 夜間は静かな場所を重視
      if (timeOfDay === 'night') {
        if (zone.notes.includes('静か') || zone.notes.includes('隠れ')) {
          zone.priority = Math.min(10, zone.priority + 2);
        }
      }
    });
  }

  /**
   * 確率を再計算
   */
  private recalculateProbability(
    strategy: SearchStrategy,
    context: OptimizationContext
  ): number {
    let baseProbability = strategy.estimatedDiscoveryProbability;

    // 捜索履歴による調整
    const successRate = this.calculateHistoricalSuccessRate(context.searchHistory);
    baseProbability = baseProbability * 0.7 + successRate * 0.3;

    // 環境要因による調整
    if (context.environmentalFactors.visibility === 'poor') {
      baseProbability *= 0.8;
    }
    if (context.environmentalFactors.timeOfDay === 'night') {
      baseProbability *= 0.7;
    }

    // リソースによる調整
    const resourceFactor = Math.min(1, 
      context.resourceConstraints.availableVolunteers / 
      strategy.resources.recommendedVolunteers
    );
    baseProbability *= (0.5 + resourceFactor * 0.5);

    return Math.max(0.1, Math.min(0.95, baseProbability));
  }

  /**
   * 過去の成功率を計算
   */
  private calculateHistoricalSuccessRate(history: SearchHistoryItem[]): number {
    if (history.length === 0) return 0.5;

    const successCount = history.filter(h => 
      h.result === 'found' || h.result === 'partial_clue'
    ).length;
    
    return successCount / history.length;
  }

  /**
   * 期待される改善度を計算
   */
  private calculateExpectedImprovement(
    currentStrategy: SearchStrategy,
    optimizedStrategy: SearchStrategy
  ): number {
    const currentScore = currentStrategy.estimatedDiscoveryProbability;
    const optimizedScore = optimizedStrategy.estimatedDiscoveryProbability;
    
    const improvement = ((optimizedScore - currentScore) / currentScore) * 100;
    return Math.round(improvement);
  }

  /**
   * 緊急時の戦略調整
   */
  emergencyStrategyAdjustment(
    strategy: SearchStrategy,
    emergencyType: 'storm_approaching' | 'darkness_falling' | 'resources_depleted'
  ): SearchStrategy {
    const adjustedStrategy = JSON.parse(JSON.stringify(strategy)) as SearchStrategy;

    switch (emergencyType) {
      case 'storm_approaching':
        // 嵐が接近：即座に安全な場所を優先
        adjustedStrategy.searchZones = adjustedStrategy.searchZones.filter(
          zone => zone.notes.includes('屋内') || zone.notes.includes('軒下')
        );
        adjustedStrategy.priority = 'high';
        adjustedStrategy.resources.estimatedTimeHours = 1;
        break;

      case 'darkness_falling':
        // 日没：照明のある場所に集中
        adjustedStrategy.searchZones.forEach(zone => {
          zone.searchMethod = ['flashlight_search', 'thermal_camera'];
        });
        adjustedStrategy.resources.recommendedVolunteers = 
          Math.floor(adjustedStrategy.resources.recommendedVolunteers * 0.3);
        break;

      case 'resources_depleted':
        // リソース枯渇：最重要エリアのみ
        adjustedStrategy.searchZones = adjustedStrategy.searchZones
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 2);
        break;
    }

    return adjustedStrategy;
  }
}

// シングルトンインスタンス
export const strategyOptimizer = new StrategyOptimizer();