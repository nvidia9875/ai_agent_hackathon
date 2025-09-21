import { ADKAgent, ADKContext } from '../agent-framework';
import { getVertexAIClient } from '../vertex-ai-client';
import { PetInfo, SearchResult } from '@/types/agents';

export class ADKBehaviorPredictorAgent extends ADKAgent {
  constructor() {
    super({
      agentId: 'behavior-predictor-adk',
      displayName: 'ペット行動予測エージェント',
      description: '迷子ペットの行動パターンを分析し、次の移動先を予測',
      model: 'gemini-1.5-pro',
      systemPrompt: `あなたはペット行動学の専門家です。
        以下の分析を行います：
        1. ペットの種類と性格に基づく行動予測
        2. 環境要因を考慮した移動パターン分析
        3. 時間帯による活動パターンの推定
        4. ストレス状況下での行動変化予測
        5. 過去の類似ケースからの学習`,
      tools: [
        {
          name: 'analyze_behavior',
          description: 'ペットの行動パターンを分析',
          function: async (params) => this.analyzeBehavior(params),
        },
        {
          name: 'predict_movement',
          description: '次の移動先を予測',
          function: async (params) => this.predictMovement(params),
        },
        {
          name: 'identify_hideouts',
          description: '隠れ場所を特定',
          function: async (params) => this.identifyHideouts(params),
        },
      ],
    });
  }

  async process(input: any, context: ADKContext): Promise<SearchResult> {
    console.log(`[ADK Behavior Predictor] Analyzing pet behavior`);
    
    try {
      const petInfo: PetInfo = input.petInfo;
      
      // Vertex AIを使用して行動予測
      const vertexClient = getVertexAIClient();
      const aiPrompt = this.buildBehaviorPrompt(input);
      const aiResponse = await vertexClient.generateContent(
        aiPrompt,
        this.config.systemPrompt
      );
      
      console.log('[ADK Behavior Predictor] AI prediction generated');
      const lastSeenLocation = input.lastSeenLocation;
      const timeElapsed = this.calculateTimeElapsed(input.lostDate);
      
      const behaviorAnalysis = await this.analyzeBehavior({
        species: petInfo.species,
        breed: petInfo.breed,
        age: petInfo.age,
        personality: petInfo.personality || 'unknown',
        healthStatus: petInfo.healthStatus || 'healthy',
      });

      const movementPrediction = await this.predictMovement({
        behaviorProfile: behaviorAnalysis,
        lastSeenLocation,
        timeElapsed,
        environmentalFactors: input.environmentalFactors,
      });

      const hideoutLocations = await this.identifyHideouts({
        petProfile: behaviorAnalysis,
        searchArea: movementPrediction.searchArea,
        weatherConditions: input.weatherConditions,
      });

      const behaviorMap = this.generateBehaviorMap(
        behaviorAnalysis,
        movementPrediction,
        hideoutLocations
      );

      return {
        success: true,
        data: {
          behaviorProfile: behaviorAnalysis,
          predictedLocations: movementPrediction.locations,
          hideoutSpots: hideoutLocations,
          behaviorMap,
          searchRecommendations: this.generateRecommendations(
            behaviorAnalysis,
            movementPrediction
          ),
          confidenceScore: this.calculateConfidence(
            behaviorAnalysis,
            movementPrediction
          ),
        },
        timestamp: new Date(),
        agentId: this.config.agentId,
      };
    } catch (error) {
      console.error('[ADK Behavior Predictor] Error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        agentId: this.config.agentId,
      };
    }
  }

  private async analyzeBehavior(params: any): Promise<any> {
    const { species, breed, age, personality, healthStatus } = params;
    
    const baseProfile = this.getBaseProfile(species, breed);
    const ageModifier = this.getAgeModifier(age);
    const personalityTraits = this.analyzePersonality(personality);
    const healthImpact = this.assessHealthImpact(healthStatus);
    
    const stressResponse = this.predictStressResponse(
      baseProfile,
      personalityTraits
    );
    
    const activityPattern = this.determineActivityPattern(
      species,
      age,
      healthStatus
    );
    
    return {
      species,
      breed,
      baseProfile,
      ageModifier,
      personalityTraits,
      healthImpact,
      stressResponse,
      activityPattern,
      explorationTendency: this.calculateExplorationTendency(
        personalityTraits,
        ageModifier
      ),
      socialBehavior: this.analyzeSocialBehavior(species, personalityTraits),
      territorialRange: this.estimateTerritorialRange(species, breed, age),
    };
  }

  private async predictMovement(params: any): Promise<any> {
    const { behaviorProfile, lastSeenLocation, timeElapsed, environmentalFactors } = params;
    
    const movementSpeed = this.calculateMovementSpeed(
      behaviorProfile,
      timeElapsed
    );
    
    const directionBias = this.determineDirectionBias(
      behaviorProfile,
      environmentalFactors
    );
    
    const searchRadius = this.calculateSearchRadius(
      movementSpeed,
      timeElapsed,
      behaviorProfile.territorialRange
    );
    
    const predictedLocations = this.generatePredictedLocations(
      lastSeenLocation,
      searchRadius,
      directionBias,
      environmentalFactors
    );
    
    return {
      searchArea: {
        center: lastSeenLocation,
        radius: searchRadius,
      },
      locations: predictedLocations,
      movementPattern: this.identifyMovementPattern(behaviorProfile),
      speed: movementSpeed,
      directionBias,
    };
  }

  private async identifyHideouts(params: any): Promise<any[]> {
    const { petProfile, searchArea, weatherConditions } = params;
    
    const hideoutTypes = this.determineHideoutTypes(
      petProfile,
      weatherConditions
    );
    
    const hideoutLocations = [];
    
    for (const type of hideoutTypes) {
      const locations = this.findLocationsByType(
        type,
        searchArea,
        petProfile
      );
      hideoutLocations.push(...locations);
    }
    
    return hideoutLocations
      .map(location => ({
        ...location,
        probability: this.calculateHideoutProbability(
          location,
          petProfile,
          weatherConditions
        ),
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10);
  }

  private buildBehaviorPrompt(input: any): string {
    const petInfo = input.petInfo;
    return `
迷子ペットの行動パターンを分析し、次の移動先を予測してください。

ペット情報:
- 種類: ${petInfo.species}
- 品種: ${petInfo.breed || '不明'}
- 年齢: ${petInfo.age || '不明'}
- 性格: ${petInfo.personality || '不明'}
- 健康状態: ${petInfo.healthStatus || '健康'}

最後に目撃された場所:
- 緯度: ${input.lastSeenLocation?.lat}
- 経度: ${input.lastSeenLocation?.lng}

経過時間: ${this.calculateTimeElapsed(input.lostDate)}時間

以下の点を分析してください:
1. ストレス下での行動傾向
2. 移動速度と距離の推定
3. 好みそうな隠れ場所
4. 活動的になる時間帯
5. 人間や他の動物への反応
`;
  }
  
  private calculateTimeElapsed(lostDate: Date): number {
    return Math.floor((Date.now() - lostDate.getTime()) / (1000 * 60 * 60));
  }

  private getBaseProfile(species: string, breed?: string): any {
    const profiles: Record<string, any> = {
      dog: {
        socialNeed: 0.8,
        territorialRange: 5,
        explorationDrive: 0.7,
        humanAffinity: 0.9,
      },
      cat: {
        socialNeed: 0.3,
        territorialRange: 2,
        explorationDrive: 0.5,
        humanAffinity: 0.4,
      },
    };
    
    return profiles[species] || profiles.dog;
  }

  private getAgeModifier(age?: number): number {
    if (!age) return 1.0;
    if (age < 1) return 0.6;
    if (age < 3) return 1.2;
    if (age < 8) return 1.0;
    return 0.7;
  }

  private analyzePersonality(personality: string): any {
    const traits: Record<string, any> = {
      friendly: { socialNeed: 1.2, fearLevel: 0.3, curiosity: 0.8 },
      timid: { socialNeed: 0.5, fearLevel: 0.9, curiosity: 0.4 },
      adventurous: { socialNeed: 0.8, fearLevel: 0.2, curiosity: 1.0 },
      calm: { socialNeed: 0.7, fearLevel: 0.4, curiosity: 0.6 },
      unknown: { socialNeed: 0.7, fearLevel: 0.5, curiosity: 0.6 },
    };
    
    return traits[personality] || traits.unknown;
  }

  private assessHealthImpact(healthStatus: string): number {
    const impacts: Record<string, number> = {
      healthy: 1.0,
      injured: 0.5,
      sick: 0.3,
      elderly: 0.6,
    };
    
    return impacts[healthStatus] || 1.0;
  }

  private predictStressResponse(baseProfile: any, personalityTraits: any): string {
    const stressLevel = personalityTraits.fearLevel;
    
    if (stressLevel > 0.7) return 'hide-freeze';
    if (stressLevel > 0.4) return 'cautious-movement';
    return 'explore-search';
  }

  private determineActivityPattern(species: string, age?: number, healthStatus?: string): any {
    const basePattern = {
      dawn: 0.7,
      morning: 0.8,
      afternoon: 0.6,
      evening: 0.9,
      night: species === 'cat' ? 0.8 : 0.3,
    };
    
    const healthModifier = this.assessHealthImpact(healthStatus || 'healthy');
    
    Object.keys(basePattern).forEach(time => {
      basePattern[time] *= healthModifier;
    });
    
    return basePattern;
  }

  private calculateExplorationTendency(personality: any, ageModifier: number): number {
    return Math.min(personality.curiosity * ageModifier, 1.0);
  }

  private analyzeSocialBehavior(species: string, personality: any): string {
    const socialScore = personality.socialNeed;
    
    if (socialScore > 0.8) return 'seek-interaction';
    if (socialScore > 0.5) return 'neutral';
    return 'avoid-interaction';
  }

  private estimateTerritorialRange(species: string, breed?: string, age?: number): number {
    const baseRange = species === 'dog' ? 5 : 2;
    const ageModifier = this.getAgeModifier(age);
    return baseRange * ageModifier;
  }

  private calculateMovementSpeed(behaviorProfile: any, hoursElapsed: number): number {
    const baseSpeed = behaviorProfile.species === 'dog' ? 3 : 2;
    const fatigueFactor = Math.max(0.3, 1 - (hoursElapsed / 48));
    return baseSpeed * behaviorProfile.healthImpact * fatigueFactor;
  }

  private determineDirectionBias(behaviorProfile: any, environmentalFactors: any): any {
    return {
      towardHome: behaviorProfile.baseProfile.humanAffinity * 0.8,
      towardNature: behaviorProfile.explorationTendency * 0.6,
      awayFromDanger: behaviorProfile.stressResponse === 'hide-freeze' ? 0.9 : 0.5,
    };
  }

  private calculateSearchRadius(speed: number, hoursElapsed: number, territorialRange: number): number {
    const distance = speed * Math.sqrt(hoursElapsed);
    return Math.min(distance, territorialRange * 2);
  }

  private generatePredictedLocations(
    center: any,
    radius: number,
    directionBias: any,
    environmentalFactors: any
  ): any[] {
    const locations = [];
    const numPoints = 8;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 360) / numPoints;
      const biasedRadius = radius * this.applyDirectionBias(angle, directionBias);
      
      locations.push({
        lat: center.lat + (biasedRadius / 111) * Math.cos(angle * Math.PI / 180),
        lng: center.lng + (biasedRadius / 111) * Math.sin(angle * Math.PI / 180) / Math.cos(center.lat * Math.PI / 180),
        probability: this.calculateLocationProbability(angle, directionBias),
        type: 'predicted',
      });
    }
    
    return locations;
  }

  private applyDirectionBias(angle: number, bias: any): number {
    if (angle < 90 || angle > 270) {
      return 1 + bias.towardHome * 0.2;
    }
    return 1;
  }

  private calculateLocationProbability(angle: number, bias: any): number {
    let probability = 0.5;
    
    if (angle < 90 || angle > 270) {
      probability += bias.towardHome * 0.3;
    }
    
    return Math.min(probability, 0.95);
  }

  private identifyMovementPattern(behaviorProfile: any): string {
    if (behaviorProfile.stressResponse === 'hide-freeze') {
      return 'minimal-movement';
    }
    if (behaviorProfile.explorationTendency > 0.7) {
      return 'exploratory-wandering';
    }
    return 'purposeful-travel';
  }

  private determineHideoutTypes(petProfile: any, weatherConditions: any): string[] {
    const types = [];
    
    if (petProfile.species === 'cat') {
      types.push('elevated-spots', 'enclosed-spaces', 'quiet-areas');
    } else {
      types.push('sheltered-areas', 'familiar-scents', 'food-sources');
    }
    
    if (weatherConditions?.conditions === 'rain') {
      types.push('dry-shelters');
    }
    
    return types;
  }

  private findLocationsByType(type: string, searchArea: any, petProfile: any): any[] {
    const mockLocations: Record<string, any[]> = {
      'elevated-spots': [
        { name: '樹木', lat: searchArea.center.lat + 0.001, lng: searchArea.center.lng + 0.001 },
        { name: '屋根', lat: searchArea.center.lat - 0.001, lng: searchArea.center.lng + 0.002 },
      ],
      'enclosed-spaces': [
        { name: '物置', lat: searchArea.center.lat + 0.002, lng: searchArea.center.lng - 0.001 },
        { name: '車の下', lat: searchArea.center.lat - 0.002, lng: searchArea.center.lng - 0.002 },
      ],
      'sheltered-areas': [
        { name: '公園の東屋', lat: searchArea.center.lat + 0.003, lng: searchArea.center.lng },
        { name: '橋の下', lat: searchArea.center.lat, lng: searchArea.center.lng + 0.003 },
      ],
    };
    
    return mockLocations[type] || [];
  }

  private calculateHideoutProbability(location: any, petProfile: any, weatherConditions: any): number {
    let probability = 0.5;
    
    if (petProfile.stressResponse === 'hide-freeze') {
      probability += 0.3;
    }
    
    if (weatherConditions?.conditions === 'rain' && location.name.includes('屋')) {
      probability += 0.2;
    }
    
    return Math.min(probability, 0.95);
  }

  private generateBehaviorMap(
    behaviorAnalysis: any,
    movementPrediction: any,
    hideoutLocations: any[]
  ): any {
    return {
      centerPoint: movementPrediction.searchArea.center,
      searchRadius: movementPrediction.searchArea.radius,
      behaviorZones: [
        {
          type: 'high-probability',
          locations: movementPrediction.locations.filter((l: any) => l.probability > 0.7),
        },
        {
          type: 'hideout-spots',
          locations: hideoutLocations.slice(0, 5),
        },
        {
          type: 'movement-corridor',
          path: this.generateMovementPath(
            movementPrediction.searchArea.center,
            movementPrediction.locations[0]
          ),
        },
      ],
      timeBasedActivity: behaviorAnalysis.activityPattern,
    };
  }

  private generateMovementPath(start: any, end: any): any[] {
    const path = [];
    const steps = 5;
    
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      path.push({
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio,
      });
    }
    
    return path;
  }

  private generateRecommendations(behaviorAnalysis: any, movementPrediction: any): string[] {
    const recommendations = [];
    
    if (behaviorAnalysis.stressResponse === 'hide-freeze') {
      recommendations.push('静かに近づき、大きな音を立てない');
      recommendations.push('隠れ場所を重点的に確認');
    }
    
    if (behaviorAnalysis.socialBehavior === 'seek-interaction') {
      recommendations.push('飼い主の声で呼びかける');
      recommendations.push('好きな音（おもちゃ、餌袋）を使用');
    }
    
    const currentHour = new Date().getHours();
    const activityLevel = this.getActivityLevel(behaviorAnalysis.activityPattern, currentHour);
    
    if (activityLevel > 0.7) {
      recommendations.push('現在は活動的な時間帯 - 積極的に捜索');
    } else {
      recommendations.push('現在は休息時間帯 - 隠れ場所を重点確認');
    }
    
    return recommendations;
  }

  private getActivityLevel(pattern: any, hour: number): number {
    if (hour >= 5 && hour < 8) return pattern.dawn;
    if (hour >= 8 && hour < 12) return pattern.morning;
    if (hour >= 12 && hour < 17) return pattern.afternoon;
    if (hour >= 17 && hour < 21) return pattern.evening;
    return pattern.night;
  }

  private calculateConfidence(behaviorAnalysis: any, movementPrediction: any): number {
    let confidence = 0.5;
    
    if (behaviorAnalysis.personalityTraits.curiosity !== 0.6) {
      confidence += 0.2;
    }
    
    if (behaviorAnalysis.healthImpact === 1.0) {
      confidence += 0.1;
    }
    
    if (movementPrediction.movementPattern !== 'exploratory-wandering') {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 0.9);
  }
}