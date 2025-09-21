/**
 * Behavior Predictor Agent（行動予測エージェント）
 * ペットの行動パターンを分析し、移動可能性の高いエリアを予測
 */

import { Pet } from '@/types/pet';

export interface PredictedLocation {
  position: google.maps.LatLngLiteral;
  confidence: number; // 0-1
  reason: string;
  radius: number; // meters
}

export interface BehaviorPrediction {
  predictedLocations: PredictedLocation[];
  overallConfidence: number;
  searchStrategy: string[];
  lastUpdated: Date;
}

export class BehaviorPredictorAgent {
  private predictionCache: Map<string, BehaviorPrediction> = new Map();

  /**
   * ペットの行動を予測
   */
  async predictBehavior(pet: Pet): Promise<BehaviorPrediction> {
    // キャッシュチェック
    if (this.predictionCache.has(pet.id)) {
      const cached = this.predictionCache.get(pet.id)!;
      const cacheAge = Date.now() - cached.lastUpdated.getTime();
      if (cacheAge < 5 * 60 * 1000) { // 5分以内なら再利用
        return cached;
      }
    }

    const prediction = await this.analyzeBehaviorPatterns(pet);
    this.predictionCache.set(pet.id, prediction);
    return prediction;
  }

  /**
   * 行動パターンを分析
   */
  private async analyzeBehaviorPatterns(pet: Pet): Promise<BehaviorPrediction> {
    const lastSeenLoc = pet.lastSeenLocation;
    if (!lastSeenLoc) {
      return this.getDefaultPrediction();
    }

    const predictedLocations: PredictedLocation[] = [];
    
    // 1. 家への帰巣本能
    if (pet.homeLocation) {
      predictedLocations.push({
        position: pet.homeLocation,
        confidence: 0.8,
        reason: '帰巣本能により自宅方向への移動',
        radius: 500
      });
    }

    // 2. 種類別の行動パターン
    const speciesPatterns = this.getSpeciesSpecificPatterns(pet);
    predictedLocations.push(...speciesPatterns);

    // 3. 時間帯による予測
    const timeBasedPatterns = this.getTimeBasedPatterns(pet, lastSeenLoc);
    predictedLocations.push(...timeBasedPatterns);

    // 4. 地形・環境による予測
    const environmentalPatterns = this.getEnvironmentalPatterns(pet, lastSeenLoc);
    predictedLocations.push(...environmentalPatterns);

    // 信頼度でソート
    predictedLocations.sort((a, b) => b.confidence - a.confidence);

    return {
      predictedLocations: predictedLocations.slice(0, 5), // 上位5箇所
      overallConfidence: this.calculateOverallConfidence(predictedLocations),
      searchStrategy: this.generateSearchStrategy(pet, predictedLocations),
      lastUpdated: new Date()
    };
  }

  /**
   * 種類別の行動パターン
   */
  private getSpeciesSpecificPatterns(pet: Pet): PredictedLocation[] {
    const patterns: PredictedLocation[] = [];
    const lastSeen = pet.lastSeenLocation;
    if (!lastSeen) return patterns;

    switch (pet.species?.toLowerCase()) {
      case '犬':
        // 犬は広範囲を移動する傾向
        patterns.push({
          position: this.getOffsetLocation(lastSeen, 0.01, 0.01),
          confidence: 0.7,
          reason: '犬の探索行動による移動範囲',
          radius: 1000
        });
        break;
      case '猫':
        // 猫は狭い範囲に隠れる傾向
        patterns.push({
          position: this.getOffsetLocation(lastSeen, 0.003, 0.003),
          confidence: 0.75,
          reason: '猫の縄張り意識による近距離滞在',
          radius: 300
        });
        break;
      default:
        patterns.push({
          position: this.getOffsetLocation(lastSeen, 0.005, 0.005),
          confidence: 0.5,
          reason: '一般的な移動パターン',
          radius: 500
        });
    }

    return patterns;
  }

  /**
   * 時間帯による予測
   */
  private getTimeBasedPatterns(pet: Pet, lastSeenLoc: google.maps.LatLngLiteral): PredictedLocation[] {
    const patterns: PredictedLocation[] = [];
    const currentHour = new Date().getHours();

    if (currentHour >= 6 && currentHour < 10) {
      // 朝の活動時間
      patterns.push({
        position: this.getOffsetLocation(lastSeenLoc, 0.008, 0),
        confidence: 0.6,
        reason: '朝の活動時間帯での移動',
        radius: 600
      });
    } else if (currentHour >= 17 && currentHour < 20) {
      // 夕方の活動時間
      patterns.push({
        position: this.getOffsetLocation(lastSeenLoc, -0.008, 0),
        confidence: 0.65,
        reason: '夕方の活動時間帯での移動',
        radius: 700
      });
    } else if (currentHour >= 20 || currentHour < 6) {
      // 夜間は移動が少ない
      patterns.push({
        position: this.getOffsetLocation(lastSeenLoc, 0.002, 0.002),
        confidence: 0.7,
        reason: '夜間の隠れ場所',
        radius: 200
      });
    }

    return patterns;
  }

  /**
   * 環境による予測
   */
  private getEnvironmentalPatterns(pet: Pet, lastSeenLoc: google.maps.LatLngLiteral): PredictedLocation[] {
    const patterns: PredictedLocation[] = [];

    // 公園や緑地への移動
    patterns.push({
      position: this.getOffsetLocation(lastSeenLoc, 0.006, -0.006),
      confidence: 0.55,
      reason: '公園・緑地への移動可能性',
      radius: 400
    });

    // 水源への移動
    patterns.push({
      position: this.getOffsetLocation(lastSeenLoc, -0.005, 0.007),
      confidence: 0.5,
      reason: '水源（川・池）への移動可能性',
      radius: 500
    });

    return patterns;
  }

  /**
   * 位置をオフセット
   */
  private getOffsetLocation(
    base: google.maps.LatLngLiteral, 
    latOffset: number, 
    lngOffset: number
  ): google.maps.LatLngLiteral {
    return {
      lat: base.lat + latOffset,
      lng: base.lng + lngOffset
    };
  }

  /**
   * 全体的な信頼度を計算
   */
  private calculateOverallConfidence(locations: PredictedLocation[]): number {
    if (locations.length === 0) return 0.3;
    const avgConfidence = locations.reduce((sum, loc) => sum + loc.confidence, 0) / locations.length;
    return Math.min(avgConfidence * 1.1, 0.95); // 最大95%
  }

  /**
   * 捜索戦略を生成
   */
  private generateSearchStrategy(pet: Pet, locations: PredictedLocation[]): string[] {
    const strategies: string[] = [];

    // 高優先度エリア
    if (locations.length > 0 && locations[0].confidence > 0.7) {
      strategies.push('高優先度エリアを集中捜索');
    }

    // ペットの種類による戦略
    if (pet.species === '犬') {
      strategies.push('広範囲の目撃情報収集');
      strategies.push('散歩コースの確認');
    } else if (pet.species === '猫') {
      strategies.push('建物の隙間や車の下を重点確認');
      strategies.push('夜間の捜索を推奨');
    }

    // 時間経過による戦略
    const hoursElapsed = pet.lostDate ? 
      (Date.now() - new Date(pet.lostDate).getTime()) / (1000 * 60 * 60) : 0;
    
    if (hoursElapsed < 24) {
      strategies.push('初動24時間の集中捜索');
    } else if (hoursElapsed < 72) {
      strategies.push('地域への情報拡散を強化');
    } else {
      strategies.push('広域での長期捜索体制');
    }

    return strategies;
  }

  /**
   * デフォルトの予測
   */
  private getDefaultPrediction(): BehaviorPrediction {
    return {
      predictedLocations: [],
      overallConfidence: 0.3,
      searchStrategy: ['基本的な周辺捜索', '情報収集の継続'],
      lastUpdated: new Date()
    };
  }

  /**
   * 予測を更新
   */
  async updatePrediction(pet: Pet): Promise<BehaviorPrediction> {
    // キャッシュをクリアして再予測
    this.predictionCache.delete(pet.id);
    return this.predictBehavior(pet);
  }

  /**
   * 目撃情報を処理
   */
  async processSighting(
    location: google.maps.LatLngLiteral,
    timestamp: Date
  ): Promise<void> {
    // 目撃情報に基づいて予測を調整
    console.log('Processing sighting at', location, 'at', timestamp);
    // 実際の実装では、目撃情報を分析して予測モデルを更新
  }
}