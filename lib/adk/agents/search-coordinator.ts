import { ADKAgent, ADKContext, ADKTool } from '../agent-framework';
import { getVertexAIClient } from '../vertex-ai-client';
import { SearchTask, SearchResult } from '@/types/agents';

export class ADKSearchCoordinatorAgent extends ADKAgent {
  constructor() {
    super({
      agentId: 'search-coordinator-adk',
      displayName: '捜索統括エージェント',
      description: '迷子ペットの捜索戦略を立案し、他のエージェントと連携して効率的な捜索を実施',
      model: 'gemini-1.5-pro',
      systemPrompt: `あなたは迷子ペット捜索の専門家です。
        以下の役割を担います：
        1. 捜索エリアの分析と優先順位付け
        2. リソースの最適配分
        3. 捜索パターンの決定
        4. 他エージェントとの連携調整
        5. リアルタイムでの戦略調整`,
      tools: [
        {
          name: 'analyze_area',
          description: '捜索エリアを分析して優先順位を決定',
          function: async (params) => this.analyzeSearchArea(params),
        },
        {
          name: 'coordinate_agents',
          description: '他のエージェントと連携',
          function: async (params) => this.coordinateAgents(params),
        },
        {
          name: 'update_strategy',
          description: '捜索戦略を更新',
          function: async (params) => this.updateStrategy(params),
        },
      ],
    });
  }

  async process(task: SearchTask, context: ADKContext): Promise<SearchResult> {
    console.log(`[ADK Search Coordinator] Processing task for pet: ${task.petInfo.name}`);
    
    try {
      // Vertex AIを使用して戦略を生成
      const vertexClient = getVertexAIClient();
      const aiPrompt = this.buildSearchPrompt(task);
      const aiResponse = await vertexClient.generateContent(
        aiPrompt,
        this.config.systemPrompt
      );
      
      console.log('[ADK Search Coordinator] AI strategy generated');
      const searchArea = await this.analyzeSearchArea({
        lastSeenLocation: task.lastSeenLocation,
        petType: task.petInfo.species,
        timeElapsed: this.calculateTimeElapsed(task.lostDate),
      });

      const coordinationPlan = await this.coordinateAgents({
        searchArea,
        availableResources: task.resources || [],
        urgency: task.urgency || 'medium',
      });

      const strategy = await this.updateStrategy({
        searchArea,
        coordinationPlan,
        weatherConditions: task.weatherConditions,
        timeOfDay: new Date().getHours(),
      });

      const priorityZones = this.calculatePriorityZones(
        searchArea,
        strategy,
        task.petInfo
      );

      const searchPattern = this.determineSearchPattern(
        priorityZones,
        task.resources || []
      );

      return {
        success: true,
        data: {
          priorityZones,
          searchPattern,
          recommendedActions: strategy.actions,
          estimatedSearchTime: strategy.estimatedTime,
          confidenceScore: strategy.confidence,
          coordinationPlan,
        },
        timestamp: new Date(),
        agentId: this.config.agentId,
      };
    } catch (error) {
      console.error('[ADK Search Coordinator] Error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        agentId: this.config.agentId,
      };
    }
  }

  private async analyzeSearchArea(params: any): Promise<any> {
    const { lastSeenLocation, petType, timeElapsed } = params;
    
    const baseRadius = this.calculateBaseRadius(petType, timeElapsed);
    
    const terrainAnalysis = {
      urbanDensity: this.estimateUrbanDensity(lastSeenLocation),
      naturalFeatures: this.identifyNaturalFeatures(lastSeenLocation),
      barriers: this.identifyBarriers(lastSeenLocation),
    };

    const zones = this.divideIntoZones(lastSeenLocation, baseRadius, terrainAnalysis);
    
    return {
      centerPoint: lastSeenLocation,
      radius: baseRadius,
      zones,
      terrainAnalysis,
      difficulty: this.assessSearchDifficulty(terrainAnalysis),
    };
  }

  private async coordinateAgents(params: any): Promise<any> {
    const { searchArea, availableResources, urgency } = params;
    
    const agentAssignments = {
      visualDetective: {
        zones: searchArea.zones.filter((z: any) => z.priority === 'high'),
        tasks: ['image_analysis', 'pattern_matching'],
      },
      behaviorPredictor: {
        zones: searchArea.zones,
        tasks: ['movement_prediction', 'hideout_identification'],
      },
      communityNetwork: {
        zones: searchArea.zones,
        tasks: ['witness_gathering', 'social_media_monitoring'],
      },
    };

    const timeline = this.createCoordinationTimeline(
      agentAssignments,
      urgency
    );

    return {
      assignments: agentAssignments,
      timeline,
      communicationProtocol: 'real-time',
      updateFrequency: urgency === 'high' ? 5 : 15, // minutes
    };
  }

  private async updateStrategy(params: any): Promise<any> {
    const { searchArea, coordinationPlan, weatherConditions, timeOfDay } = params;
    
    const strategyFactors = {
      visibility: this.calculateVisibility(weatherConditions, timeOfDay),
      accessibility: this.assessAccessibility(searchArea),
      petBehavior: this.predictPetBehavior(timeOfDay, weatherConditions),
    };

    const actions = this.determineActions(strategyFactors, coordinationPlan);
    const estimatedTime = this.estimateSearchDuration(searchArea, actions);
    const confidence = this.calculateConfidence(strategyFactors);

    return {
      actions,
      estimatedTime,
      confidence,
      factors: strategyFactors,
      adaptations: this.suggestAdaptations(strategyFactors),
    };
  }

  private buildSearchPrompt(task: SearchTask): string {
    return `
迷子ペットの捜索戦略を立案してください。

ペット情報:
- 名前: ${task.petInfo.name}
- 種類: ${task.petInfo.species}
- 品種: ${task.petInfo.breed || '不明'}
- 年齢: ${task.petInfo.age || '不明'}

最後に目撃された場所:
- 緯度: ${task.lastSeenLocation.lat}
- 経度: ${task.lastSeenLocation.lng}

迷子になった日時: ${task.lostDate}

以下の点を考慮して捜索戦略を提案してください:
1. 優先捜索エリア
2. 推奨される捜索方法
3. 時間帯別の捜索パターン
4. 必要なリソース
5. 注意点
`;
  }
  
  private calculateTimeElapsed(lostDate: Date): number {
    return Math.floor((Date.now() - lostDate.getTime()) / (1000 * 60 * 60));
  }

  private calculateBaseRadius(petType: string, hoursElapsed: number): number {
    const baseSpeed = petType === 'dog' ? 3 : 2; // km/h
    return Math.min(baseSpeed * Math.sqrt(hoursElapsed), 10); // max 10km
  }

  private estimateUrbanDensity(location: any): number {
    return 0.7; // Mock値
  }

  private identifyNaturalFeatures(location: any): string[] {
    return ['park', 'river', 'forest'];
  }

  private identifyBarriers(location: any): string[] {
    return ['highway', 'railway'];
  }

  private divideIntoZones(center: any, radius: number, terrain: any): any[] {
    const zones = [];
    const numZones = 8;
    
    for (let i = 0; i < numZones; i++) {
      const angle = (i * 360) / numZones;
      zones.push({
        id: `zone-${i}`,
        center: this.calculateZoneCenter(center, radius / 2, angle),
        priority: i < 3 ? 'high' : i < 6 ? 'medium' : 'low',
        terrain: terrain,
        searchDifficulty: Math.random() * 5 + 1,
      });
    }
    
    return zones;
  }

  private calculateZoneCenter(center: any, distance: number, angle: number): any {
    const rad = (angle * Math.PI) / 180;
    return {
      lat: center.lat + (distance / 111) * Math.cos(rad),
      lng: center.lng + (distance / 111) * Math.sin(rad) / Math.cos(center.lat * Math.PI / 180),
    };
  }

  private assessSearchDifficulty(terrain: any): string {
    const score = terrain.urbanDensity * 2 + terrain.naturalFeatures.length + terrain.barriers.length;
    return score > 5 ? 'high' : score > 3 ? 'medium' : 'low';
  }

  private calculatePriorityZones(searchArea: any, strategy: any, petInfo: any): any[] {
    return searchArea.zones
      .map((zone: any) => ({
        ...zone,
        finalPriority: this.calculateZonePriority(zone, strategy, petInfo),
      }))
      .sort((a: any, b: any) => b.finalPriority - a.finalPriority);
  }

  private calculateZonePriority(zone: any, strategy: any, petInfo: any): number {
    let priority = 0;
    
    if (zone.priority === 'high') priority += 3;
    if (zone.priority === 'medium') priority += 2;
    if (zone.priority === 'low') priority += 1;
    
    priority *= strategy.confidence;
    
    if (petInfo.species === 'cat' && zone.terrain.naturalFeatures.includes('forest')) {
      priority *= 1.2;
    }
    
    return priority;
  }

  private determineSearchPattern(zones: any[], resources: any[]): string {
    const resourceCount = resources.length || 1;
    
    if (resourceCount >= zones.length) {
      return 'parallel-comprehensive';
    } else if (resourceCount >= zones.length / 2) {
      return 'parallel-priority';
    } else {
      return 'sequential-priority';
    }
  }

  private createCoordinationTimeline(assignments: any, urgency: string): any[] {
    const timeline = [];
    const interval = urgency === 'high' ? 15 : 30;
    
    Object.keys(assignments).forEach((agent, index) => {
      timeline.push({
        time: index * interval,
        agent,
        action: 'deploy',
        zones: assignments[agent].zones,
      });
    });
    
    return timeline;
  }

  private calculateVisibility(weather: any, timeOfDay: number): number {
    let visibility = 1.0;
    
    if (weather?.conditions === 'rain') visibility *= 0.7;
    if (weather?.conditions === 'fog') visibility *= 0.5;
    
    if (timeOfDay < 6 || timeOfDay > 20) visibility *= 0.5;
    
    return visibility;
  }

  private assessAccessibility(searchArea: any): number {
    return 0.8; // Mock値
  }

  private predictPetBehavior(timeOfDay: number, weather: any): string {
    if (timeOfDay >= 6 && timeOfDay <= 18 && weather?.conditions === 'clear') {
      return 'active-exploring';
    } else {
      return 'hiding-resting';
    }
  }

  private determineActions(factors: any, coordinationPlan: any): string[] {
    const actions = [];
    
    if (factors.visibility < 0.5) {
      actions.push('use-thermal-imaging');
    }
    
    if (factors.petBehavior === 'hiding-resting') {
      actions.push('check-sheltered-areas');
    }
    
    actions.push('distribute-flyers');
    actions.push('setup-feeding-stations');
    actions.push('monitor-social-media');
    
    return actions;
  }

  private estimateSearchDuration(searchArea: any, actions: string[]): number {
    const baseTime = searchArea.zones.length * 30; // 30 minutes per zone
    const actionTime = actions.length * 15; // 15 minutes per action
    return baseTime + actionTime;
  }

  private calculateConfidence(factors: any): number {
    let confidence = 0.5;
    
    confidence += factors.visibility * 0.3;
    confidence += factors.accessibility * 0.2;
    
    return Math.min(confidence, 0.95);
  }

  private suggestAdaptations(factors: any): string[] {
    const adaptations = [];
    
    if (factors.visibility < 0.6) {
      adaptations.push('increase-search-team-size');
    }
    
    if (factors.petBehavior === 'active-exploring') {
      adaptations.push('expand-search-radius');
    }
    
    return adaptations;
  }
}