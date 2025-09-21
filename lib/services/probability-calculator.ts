/**
 * 発見確率計算サービス
 * 複数の要因を考慮してペットの発見確率を計算
 */

import { Pet } from '@/types/pet';

export interface ProbabilityFactors {
  timeElapsed: number; // 経過時間（時間）
  weatherCondition: 'clear' | 'rain' | 'snow' | 'cloudy';
  searchAreaSize: number; // 捜索エリアの広さ（km²）
  volunteerCount: number; // ボランティア数
  sightingCount: number; // 目撃情報数
  petType: string;
  petSize: 'small' | 'medium' | 'large';
  petBehavior: 'friendly' | 'shy' | 'aggressive';
  urbanDensity: 'high' | 'medium' | 'low'; // 都市密度
  hasCollar: boolean;
  hasMicrochip: boolean;
}

export class ProbabilityCalculator {
  /**
   * 総合的な発見確率を計算
   */
  calculateDiscoveryProbability(
    pet: Pet,
    factors: Partial<ProbabilityFactors>
  ): {
    probability: number;
    breakdown: ProbabilityBreakdown;
    recommendations: string[];
  } {
    const breakdown: ProbabilityBreakdown = {
      timeFactor: this.calculateTimeFactor(factors.timeElapsed || 0),
      weatherFactor: this.calculateWeatherFactor(factors.weatherCondition || 'clear'),
      searchEfficiency: this.calculateSearchEfficiency(
        factors.searchAreaSize || 10,
        factors.volunteerCount || 1
      ),
      petCharacteristics: this.calculatePetCharacteristics(pet, factors),
      sightingReliability: this.calculateSightingReliability(factors.sightingCount || 0),
      locationFactor: this.calculateLocationFactor(factors.urbanDensity || 'medium')
    };

    // 重み付き平均で総合確率を計算
    const weights = {
      timeFactor: 0.25,
      weatherFactor: 0.1,
      searchEfficiency: 0.2,
      petCharacteristics: 0.2,
      sightingReliability: 0.15,
      locationFactor: 0.1
    };

    let totalProbability = 0;
    for (const [key, weight] of Object.entries(weights)) {
      totalProbability += breakdown[key as keyof ProbabilityBreakdown] * weight;
    }

    // 最小値と最大値で制限
    totalProbability = Math.max(0.05, Math.min(0.95, totalProbability));

    // 改善提案を生成
    const recommendations = this.generateRecommendations(breakdown, factors);

    return {
      probability: totalProbability,
      breakdown,
      recommendations
    };
  }

  /**
   * 時間経過による確率計算
   */
  private calculateTimeFactor(hoursElapsed: number): number {
    if (hoursElapsed < 6) return 0.95;
    if (hoursElapsed < 24) return 0.85;
    if (hoursElapsed < 72) return 0.70;
    if (hoursElapsed < 168) return 0.50; // 1週間
    if (hoursElapsed < 336) return 0.35; // 2週間
    if (hoursElapsed < 720) return 0.25; // 1ヶ月
    return 0.15;
  }

  /**
   * 天候による影響計算
   */
  private calculateWeatherFactor(weather: string): number {
    const weatherImpact = {
      'clear': 1.0,
      'cloudy': 0.9,
      'rain': 0.7,
      'snow': 0.5
    };
    return weatherImpact[weather as keyof typeof weatherImpact] || 0.8;
  }

  /**
   * 捜索効率の計算
   */
  private calculateSearchEfficiency(
    areaSize: number,
    volunteerCount: number
  ): number {
    // 1人あたりの捜索面積
    const areaPerPerson = areaSize / Math.max(1, volunteerCount);
    
    // 理想的な捜索面積は1人あたり0.5km²
    const idealAreaPerPerson = 0.5;
    
    // 効率性を計算
    const efficiency = idealAreaPerPerson / Math.max(idealAreaPerPerson, areaPerPerson);
    
    // ボランティア数によるボーナス
    const volunteerBonus = Math.min(0.2, volunteerCount * 0.02);
    
    return Math.min(1.0, efficiency + volunteerBonus);
  }

  /**
   * ペットの特性による確率計算
   */
  private calculatePetCharacteristics(
    pet: Pet,
    factors: Partial<ProbabilityFactors>
  ): number {
    let score = 0.5; // ベーススコア

    // サイズによる影響
    const sizeImpact = {
      'small': -0.1, // 小型は見つけにくい
      'medium': 0,
      'large': 0.1 // 大型は目立つ
    };
    score += sizeImpact[factors.petSize || 'medium'] || 0;

    // 性格による影響
    const behaviorImpact = {
      'friendly': 0.2, // 人懐っこい
      'shy': -0.1, // 臆病
      'aggressive': 0 // 攻撃的
    };
    score += behaviorImpact[factors.petBehavior || 'friendly'] || 0;

    // 首輪やマイクロチップ
    if (factors.hasCollar) score += 0.15;
    if (factors.hasMicrochip) score += 0.1;

    // 特徴的な見た目
    if (pet.distinctiveFeatures && pet.distinctiveFeatures.length > 0) {
      score += 0.1;
    }

    return Math.min(1.0, Math.max(0, score));
  }

  /**
   * 目撃情報の信頼性計算
   */
  private calculateSightingReliability(sightingCount: number): number {
    if (sightingCount === 0) return 0.3;
    if (sightingCount === 1) return 0.5;
    if (sightingCount === 2) return 0.65;
    if (sightingCount === 3) return 0.75;
    if (sightingCount >= 4) return 0.85;
    return 0.9;
  }

  /**
   * 地域特性による確率計算
   */
  private calculateLocationFactor(urbanDensity: string): number {
    const densityImpact = {
      'high': 0.8, // 都市部：目撃されやすいが隠れ場所も多い
      'medium': 0.7, // 郊外：バランス
      'low': 0.5 // 田舎：広範囲で発見困難
    };
    return densityImpact[urbanDensity as keyof typeof densityImpact] || 0.6;
  }

  /**
   * 改善提案を生成
   */
  private generateRecommendations(
    breakdown: ProbabilityBreakdown,
    factors: Partial<ProbabilityFactors>
  ): string[] {
    const recommendations: string[] = [];

    // 時間要因が低い場合
    if (breakdown.timeFactor < 0.5) {
      recommendations.push('⏰ 時間が経過しています。SNSでの拡散を強化してください');
    }

    // 天候が悪い場合
    if (breakdown.weatherFactor < 0.8) {
      recommendations.push('☔ 天候が悪いため、屋内や軒下を重点的に捜索してください');
    }

    // 捜索効率が低い場合
    if (breakdown.searchEfficiency < 0.6) {
      recommendations.push('👥 ボランティアを増やすか、捜索エリアを絞ってください');
    }

    // 目撃情報が少ない場合
    if (breakdown.sightingReliability < 0.5) {
      recommendations.push('📢 チラシ配布やポスター掲示を増やしてください');
    }

    // ペットの特性スコアが低い場合
    if (breakdown.petCharacteristics < 0.5) {
      recommendations.push('🏷️ ペットの特徴を詳しく記載し、写真を複数用意してください');
    }

    // ボランティアが少ない場合
    if ((factors.volunteerCount || 0) < 5) {
      recommendations.push('🤝 地域のペット愛護団体に協力を依頼してください');
    }

    // マイクロチップがある場合
    if (factors.hasMicrochip) {
      recommendations.push('💉 動物病院や保護施設にマイクロチップ情報を通知済みか確認してください');
    }

    return recommendations;
  }

  /**
   * リアルタイムで確率を更新
   */
  updateProbabilityWithNewData(
    currentProbability: number,
    event: ProbabilityUpdateEvent
  ): number {
    let adjustment = 0;

    switch (event.type) {
      case 'new_sighting':
        adjustment = event.reliability * 0.1;
        break;
      case 'volunteer_joined':
        adjustment = 0.02;
        break;
      case 'area_searched':
        adjustment = event.thoroughness * -0.05; // 徹底的に探して見つからなければ確率減
        break;
      case 'weather_improved':
        adjustment = 0.05;
        break;
      case 'time_passed':
        adjustment = -0.01 * event.hours;
        break;
    }

    const newProbability = currentProbability + adjustment;
    return Math.max(0.05, Math.min(0.95, newProbability));
  }

  /**
   * 発見場所の予測
   */
  predictDiscoveryLocations(
    pet: Pet,
    factors: ProbabilityFactors
  ): PredictedLocation[] {
    const locations: PredictedLocation[] = [];

    // 最後に見た場所周辺
    if (pet.lastSeenLocation) {
      locations.push({
        position: pet.lastSeenLocation,
        probability: 0.4,
        radius: 500,
        reason: '最後の目撃地点周辺'
      });
    }

    // ペットの性格に基づく予測
    if (factors.petBehavior === 'friendly') {
      // 人が多い場所を予測
      locations.push({
        position: this.findNearbyPopularPlace(pet.lastSeenLocation!),
        probability: 0.3,
        radius: 300,
        reason: '人懐っこい性格のため人が集まる場所'
      });
    } else if (factors.petBehavior === 'shy') {
      // 静かな場所を予測
      locations.push({
        position: this.findNearbyQuietPlace(pet.lastSeenLocation!),
        probability: 0.35,
        radius: 400,
        reason: '臆病な性格のため静かな隠れ場所'
      });
    }

    return locations;
  }

  /**
   * 近くの人気スポットを探す（仮実装）
   */
  private findNearbyPopularPlace(
    baseLocation: google.maps.LatLngLiteral
  ): google.maps.LatLngLiteral {
    // 実際にはGoogle Places APIを使用
    return {
      lat: baseLocation.lat + 0.003,
      lng: baseLocation.lng + 0.002
    };
  }

  /**
   * 近くの静かな場所を探す（仮実装）
   */
  private findNearbyQuietPlace(
    baseLocation: google.maps.LatLngLiteral
  ): google.maps.LatLngLiteral {
    // 実際には公園や森林エリアを検索
    return {
      lat: baseLocation.lat - 0.002,
      lng: baseLocation.lng - 0.003
    };
  }
}

// 型定義
interface ProbabilityBreakdown {
  timeFactor: number;
  weatherFactor: number;
  searchEfficiency: number;
  petCharacteristics: number;
  sightingReliability: number;
  locationFactor: number;
}

interface ProbabilityUpdateEvent {
  type: 'new_sighting' | 'volunteer_joined' | 'area_searched' | 'weather_improved' | 'time_passed';
  reliability?: number;
  thoroughness?: number;
  hours?: number;
}

interface PredictedLocation {
  position: google.maps.LatLngLiteral;
  probability: number;
  radius: number;
  reason: string;
}

// シングルトンインスタンス
export const probabilityCalculator = new ProbabilityCalculator();