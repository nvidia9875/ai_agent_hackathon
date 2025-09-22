import type { 
  PetProfile,
  PredictionResult,
  SearchZone,
  HeatmapData,
  PredictionTimeFrame,
  DangerZone,
  PointOfInterest,
  PredictionArea,
  WeatherCondition
} from '@/lib/types/behavior-predictor';
import { WeatherService } from '@/lib/services/weather-service';
import { EnvironmentalAnalysis } from '@/lib/utils/environmental-analysis';

// 文献データに基づく時間別移動距離（メートル）
const TIME_BASED_RADIUS: Record<number, { median: number; range: [number, number] }> = {
  1: { median: 750, range: [200, 2000] },
  6: { median: 1500, range: [500, 5000] },
  12: { median: 2250, range: [1000, 7000] },
  24: { median: 3000, range: [1000, 10000] },
  48: { median: 4500, range: [2000, 15000] },
  72: { median: 6000, range: [3000, 20000] },
  168: { median: 10000, range: [4000, 30000] },
  336: { median: 20000, range: [5000, 100000] },
};

// サイズ別移動特性
const SIZE_FACTORS: Record<string, { multiplier: number; typicalRange: [number, number] }> = {
  small: { multiplier: 0.6, typicalRange: [1200, 1600] }, // 小型犬：1-2マイル
  medium: { multiplier: 1.0, typicalRange: [1600, 3200] }, // 中型犬：1-2マイル
  large: { multiplier: 1.5, typicalRange: [3200, 8000] }, // 大型犬：2-5マイル
  xlarge: { multiplier: 1.8, typicalRange: [5000, 16000] }, // 超大型犬
};

// 日本犬種の特性
const JAPANESE_BREED_PATTERNS: Record<string, { independence: number; trackingTendency: number; searchMultiplier: number }> = {
  shiba: { independence: 0.9, trackingTendency: 0.73, searchMultiplier: 1.5 },
  akita: { independence: 0.95, trackingTendency: 0.8, searchMultiplier: 2.0 },
  kishu: { independence: 0.85, trackingTendency: 0.7, searchMultiplier: 1.4 },
  shikoku: { independence: 0.88, trackingTendency: 0.75, searchMultiplier: 1.6 },
  kai: { independence: 0.87, trackingTendency: 0.72, searchMultiplier: 1.5 },
  hokkaido: { independence: 0.86, trackingTendency: 0.7, searchMultiplier: 1.4 },
};

// 性格タイプによる移動パターン
const PERSONALITY_PATTERNS = {
  gregarious: { radius: 1600, approachability: 0.9 }, // 社交的：1-2マイル半径
  aloof: { radius: 3200, approachability: 0.5 }, // よそよそしい
  xenophobic: { radius: 8000, approachability: 0.1 }, // 恐怖心が強い：5-10マイル
  homesick: { radius: 2000, approachability: 0.7 }, // 帰巣本能が強い
  adventurous: { radius: 5000, approachability: 0.4 }, // 冒険好き
};

export class LostDogPredictor {
  private petProfile: PetProfile;
  private currentWeather: WeatherCondition | null = null;
  private environment: 'urban' | 'suburban' | 'rural';
  private weatherCondition: 'clear' | 'rain' | 'storm' | 'snow';

  constructor(petProfile: PetProfile) {
    this.petProfile = petProfile;
    this.environment = this.detectEnvironment();
    this.weatherCondition = this.detectWeatherCondition();
  }

  public async predictSearchArea(timeFrames: PredictionTimeFrame[]): Promise<PredictionResult> {
    const searchZones: SearchZone[] = [];
    const allHeatmapData: HeatmapData[] = [];
    
    // 時間経過を計算
    const hoursSinceLost = this.calculateHoursSinceLost();
    
    // 最後に目撃された位置の天気情報を取得
    if (this.petProfile.lastSeenLocation) {
      const weatherService = WeatherService.getInstance();
      this.currentWeather = await weatherService.getWeatherCondition(
        this.petProfile.lastSeenLocation.lat,
        this.petProfile.lastSeenLocation.lng
      );
    }

    for (const timeFrame of timeFrames) {
      const searchRadius = this.calculateScientificSearchRadius(timeFrame.hours);
      const predictionAreas = this.generatePredictionAreas(timeFrame, searchRadius);
      const dangerZones = await this.identifyDangerZones(predictionAreas);
      const pointsOfInterest = await this.findPointsOfInterest(predictionAreas);
      const heatmapData = await this.generateEnhancedScientificHeatmap(timeFrame, searchRadius);

      allHeatmapData.push(...heatmapData);

      searchZones.push({
        id: `zone-${timeFrame.hours}h`,
        priority: this.calculatePriority(timeFrame.hours),
        areas: predictionAreas,
        dangerZones,
        pointsOfInterest,
        searchStrategy: this.generateScientificStrategy(timeFrame.hours),
        estimatedSearchTime: this.estimateSearchTime(predictionAreas),
      });
    }

    const recommendations = this.generateScientificRecommendations(hoursSinceLost);
    const confidenceScore = this.calculateConfidenceScore(hoursSinceLost);

    return {
      petProfile: this.petProfile,
      searchZones,
      heatmapData: allHeatmapData,
      recommendations,
      confidenceScore,
      lastUpdated: new Date(),
    };
  }

  private calculateScientificSearchRadius(hours: number): number {
    // 時間に基づく基本半径を取得
    let baseRadius = this.getTimeBasedRadius(hours);
    
    // サイズ補正
    const sizeFactor = SIZE_FACTORS[this.petProfile.size] || SIZE_FACTORS.medium;
    baseRadius *= sizeFactor.multiplier;
    
    // 犬種特性による補正（日本犬は独立心が強い）
    const breedMultiplier = this.getBreedMultiplier();
    baseRadius *= breedMultiplier;
    
    // 年齢による補正
    const ageMultiplier = this.getAgeMultiplier();
    baseRadius *= ageMultiplier;
    
    // 環境による補正
    const envMultiplier = this.getEnvironmentMultiplier();
    baseRadius *= envMultiplier;
    
    // 天候による補正
    const weatherMultiplier = this.getWeatherMultiplier();
    baseRadius *= weatherMultiplier;
    
    return Math.min(baseRadius, 30000); // 最大30km
  }

  private getTimeBasedRadius(hours: number): number {
    // 文献データに基づく時間別移動距離（中央値）
    if (hours <= 1) return TIME_BASED_RADIUS[1].median;
    if (hours <= 6) return TIME_BASED_RADIUS[6].median;
    if (hours <= 12) return TIME_BASED_RADIUS[12].median;
    if (hours <= 24) return TIME_BASED_RADIUS[24].median;
    if (hours <= 48) return TIME_BASED_RADIUS[48].median;
    if (hours <= 72) return TIME_BASED_RADIUS[72].median;
    if (hours <= 168) return TIME_BASED_RADIUS[168].median;
    return TIME_BASED_RADIUS[336].median;
  }

  private getBreedMultiplier(): number {
    const breed = this.petProfile.breed?.toLowerCase() || '';
    
    // 日本犬種チェック
    for (const [key, pattern] of Object.entries(JAPANESE_BREED_PATTERNS)) {
      if (breed.includes(key) || breed.includes(this.getJapaneseBreedName(key))) {
        return pattern.searchMultiplier;
      }
    }
    
    return 1.0;
  }

  private getJapaneseBreedName(breed: string): string {
    const names: Record<string, string> = {
      shiba: '柴犬',
      akita: '秋田犬',
      kishu: '紀州犬',
      shikoku: '四国犬',
      kai: '甲斐犬',
      hokkaido: '北海道犬',
    };
    return names[breed] || breed;
  }

  private getAgeMultiplier(): number {
    const age = this.petProfile.age;
    if (!age) return 1.0;
    
    if (age < 1) return 0.5; // 子犬は近距離
    if (age > 7) return 0.7; // 高齢犬は移動能力低下
    return 1.0; // 成犬
  }

  private getEnvironmentMultiplier(): number {
    switch (this.environment) {
      case 'urban': return 0.6; // 都市部：交通や建物で制限
      case 'suburban': return 1.0; // 郊外：標準
      case 'rural': return 1.8; // 農村・山間部：3倍の移動距離
      default: return 1.0;
    }
  }

  private getWeatherMultiplier(): number {
    switch (this.weatherCondition) {
      case 'storm': return 0.3; // 嵐：大幅に移動制限
      case 'snow': return 0.4; // 雪：移動困難
      case 'rain': return 0.6; // 雨：移動制限
      case 'clear': return 1.0; // 晴れ：標準
      default: return 1.0;
    }
  }

  private generatePredictionAreas(timeFrame: PredictionTimeFrame, searchRadius: number): PredictionArea[] {
    const areas: PredictionArea[] = [];
    const center = this.petProfile.lastSeenLocation;
    
    // 文献に基づく確率分布エリア
    if (timeFrame.hours <= 24) {
      // 50%が402m以内
      areas.push({
        center,
        radius: 402,
        probability: 0.5,
        timeFrame,
      });
      
      // 70%が1.6km以内
      areas.push({
        center,
        radius: 1600,
        probability: 0.7,
        timeFrame,
      });
    }
    
    // 段階的な探索エリア
    areas.push({
      center,
      radius: searchRadius * 0.3,
      probability: this.calculateAreaProbability(searchRadius * 0.3, timeFrame.hours),
      timeFrame,
    });
    
    areas.push({
      center,
      radius: searchRadius * 0.6,
      probability: this.calculateAreaProbability(searchRadius * 0.6, timeFrame.hours),
      timeFrame,
    });
    
    areas.push({
      center,
      radius: searchRadius,
      probability: this.calculateAreaProbability(searchRadius, timeFrame.hours),
      timeFrame,
    });
    
    // 犬種特性に基づく追加エリア
    this.addBreedSpecificAreas(areas, center, searchRadius, timeFrame);
    
    return areas;
  }

  private addBreedSpecificAreas(areas: PredictionArea[], center: {lat: number; lng: number}, radius: number, timeFrame: PredictionTimeFrame): void {
    const breed = this.petProfile.breed?.toLowerCase() || '';
    
    // 柴犬の場合（73%が獲物追跡中に迷子）
    if (breed.includes('shiba') || breed.includes('柴')) {
      const trackingAngle = Math.random() * 2 * Math.PI;
      const trackingDistance = radius * 0.7;
      const trackingLocation = this.calculateNewPosition(center, trackingDistance, trackingAngle);
      
      areas.push({
        center: trackingLocation,
        radius: 500,
        probability: 0.73,
        timeFrame,
      });
    }
  }

  private async generateEnhancedScientificHeatmap(
    timeFrame: PredictionTimeFrame, 
    searchRadius: number
  ): Promise<HeatmapData[]> {
    const center = this.petProfile.lastSeenLocation;
    
    // 環境要因を考慮した詳細なヒートマップを生成
    const { enhancedHeatmapGenerator } = await import('@/lib/services/enhanced-heatmap-generator');
    
    const heatmapData = await enhancedHeatmapGenerator.generateDetailedHeatmap({
      center: center,
      radius: searchRadius / 1000, // メートルをキロメートルに変換
      gridResolution: 50,
      zoomLevel: 14,
      timeElapsed: timeFrame.hours,
      petSize: this.petProfile.size,
      petType: this.petProfile.species,
      weather: this.currentWeather || undefined,
      timeOfDay: EnvironmentalAnalysis.getTimeOfDay(),
      dangerZones: EnvironmentalAnalysis.identifyDangerZones(
        center,
        searchRadius / 1000
      ),
      terrainInfo: await EnvironmentalAnalysis.analyzeTerrain(
        center,
        searchRadius / 1000
      )
    });
    
    // 性格による集中エリアを追加
    this.addPersonalityHotspots(heatmapData, center, searchRadius);
    
    return heatmapData;
  }

  private addPersonalityHotspots(heatmapData: HeatmapData[], center: {lat: number; lng: number}, radius: number): void {
    const characteristics = this.petProfile.characteristics || [];
    
    // 食べ物に惹かれやすい
    if (characteristics.includes('food motivated')) {
      const foodSpots = 5;
      for (let i = 0; i < foodSpots; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = radius * 0.4 * Math.random();
        const location = this.calculateNewPosition(center, distance / 1000, angle);
        heatmapData.push({ location, weight: 0.8 });
      }
    }
    
    // 人懐っこい（社交的）
    if (characteristics.includes('friendly')) {
      // 住宅地エリアに集中
      const residentialSpots = 8;
      for (let i = 0; i < residentialSpots; i++) {
        const angle = (Math.PI * 2 * i) / residentialSpots;
        const distance = PERSONALITY_PATTERNS.gregarious.radius * 0.8;
        const location = this.calculateNewPosition(center, distance / 1000, angle);
        heatmapData.push({ location, weight: 0.6 });
      }
    }
    
    // 恐怖心が強い
    if (characteristics.includes('fearful') || characteristics.includes('shy')) {
      // より広範囲に分散
      const fearSpots = 10;
      for (let i = 0; i < fearSpots; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = PERSONALITY_PATTERNS.xenophobic.radius * (0.5 + Math.random() * 0.5);
        const location = this.calculateNewPosition(center, distance / 1000, angle);
        heatmapData.push({ location, weight: 0.3 });
      }
    }
  }

  private generateScientificStrategy(hours: number): string {
    const strategies: string[] = [];
    
    if (hours <= 24) {
      strategies.push('【即時対応】脱走地点から同心円状に探索を開始');
      strategies.push('50%の確率で402m以内、70%の確率で1.6km以内に存在');
      strategies.push('見慣れた物や飼い主の匂いのする物を最終目撃地点に設置');
    } else if (hours <= 72) {
      strategies.push('【中期対応】探索範囲を2倍に拡大');
      strategies.push('地域の動物保護施設・獣医に連絡（93%が48時間以内に回収）');
      strategies.push('SNSでの情報拡散・ポスター掲示を実施');
    } else {
      strategies.push('【長期対応】専門捜索犬チームの活用を検討');
      strategies.push('広域探索（10-15km半径）を実施');
      strategies.push('継続的な目撃情報の収集と分析');
    }
    
    // サイズ別戦略
    const size = this.petProfile.size;
    if (size === 'small') {
      strategies.push('小型犬：1km半径を重点的に探索、小さな隙間や物陰を確認');
    } else if (size === 'large') {
      strategies.push('大型犬：3-5km半径を探索、公園や開けた場所を重点確認');
    }
    
    // 環境別戦略
    if (this.environment === 'urban') {
      strategies.push('都市部：交通量の多い道路周辺を優先的に探索');
    } else if (this.environment === 'rural') {
      strategies.push('農村部：移動距離が3倍になる可能性、森林や畑を重点探索');
    }
    
    return strategies.join('\n');
  }

  private generateScientificRecommendations(hoursSinceLost: number): string[] {
    const recommendations: string[] = [];
    
    // 天気による推奨事項を追加
    if (this.currentWeather) {
      const weatherService = WeatherService.getInstance();
      const weatherImpact = weatherService.getWeatherImpactOnBehavior(
        this.currentWeather,
        this.petProfile.species
      );
      
      if (weatherImpact.description) {
        recommendations.push(weatherImpact.description);
      }
      
      if (this.currentWeather.precipitation) {
        recommendations.push('📍 雨宿りできる場所（軒下、橋の下、車の下など）を重点的に確認');
      }
      
      if (this.currentWeather.temperature < 10) {
        recommendations.push('🌡️ 暖かい場所（日向、換気口付近、建物の入口）を確認');
      } else if (this.currentWeather.temperature > 30) {
        recommendations.push('🌡️ 涼しい場所（日陰、水辺、地下駐車場）を確認');
      }
    }
    
    // 時間帯別推奨事項（文献データに基づく）
    if (hoursSinceLost <= 24) {
      recommendations.push('🔍 50%の確率で402m以内、70%の確率で1.6km以内で発見');
      recommendations.push('📍 脱走地点から同心円状に探索を開始');
      recommendations.push('👕 飼い主の匂いのする衣類を最終目撃地点に設置');
      recommendations.push('📢 静かに名前を呼びながら探索（大声は避ける）');
    }
    
    if (hoursSinceLost > 24 && hoursSinceLost <= 72) {
      recommendations.push('📞 地域の動物保護施設・獣医師に連絡');
      recommendations.push('📱 SNSでの拡散（#迷い犬 #[地域名]）');
      recommendations.push('🎥 野生動物カメラの設置を検討');
      recommendations.push('⚠️ 93%が48時間以内に回収 - この期間が重要');
    }
    
    if (hoursSinceLost > 72) {
      recommendations.push('🐕 専門捜索犬チームへの依頼を検討');
      recommendations.push('🗺️ 10-15km半径の広域探索を実施');
      recommendations.push('📊 目撃情報をマッピングしてパターン分析');
    }
    
    // 犬種特性による推奨事項
    const breed = this.petProfile.breed?.toLowerCase() || '';
    if (breed.includes('shiba') || breed.includes('柴')) {
      recommendations.push('🦊 柴犬特性：独立心が強く人を避ける - GPS首輪を強く推奨');
      recommendations.push('🏃 73%が獲物追跡中に迷子 - 森林や公園周辺を重点探索');
    }
    
    if (breed.includes('akita') || breed.includes('秋田')) {
      recommendations.push('🐕 秋田犬特性：長距離追跡の可能性 - 5km以上の広範囲探索必要');
    }
    
    // 性格特性による推奨事項
    const characteristics = this.petProfile.characteristics || [];
    if (characteristics.includes('shy') || characteristics.includes('fearful')) {
      recommendations.push('😰 恐怖心が強い犬：5-10km範囲に拡大・交通事故リスク最高');
      recommendations.push('🌅 静かな時間帯（早朝・夕方）に探索');
    }
    
    if (characteristics.includes('friendly')) {
      recommendations.push('😊 社交的な犬：1-2km範囲・最初に呼んだ人に接近する可能性');
    }
    
    // 技術的推奨
    recommendations.push('💡 マイクロチップで回収率23倍向上・GPSトラッカーで93%回収');
    
    // 天候による推奨
    if (this.weatherCondition === 'rain') {
      recommendations.push('☔ 雨天時：雨宿りできる場所（軒下、橋の下）を確認');
    }
    
    return recommendations;
  }

  private calculatePriority(hours: number): 'high' | 'medium' | 'low' {
    if (hours <= 24) return 'high'; // 最初の24時間が最重要
    if (hours <= 72) return 'medium'; // 93%が48時間以内に回収
    return 'low';
  }

  private calculateAreaProbability(distance: number, hours: number): number {
    // 文献データに基づく確率計算
    if (hours <= 24) {
      if (distance <= 402) return 0.5;
      if (distance <= 1600) return 0.7;
      if (distance <= 3000) return 0.85;
      return 0.93;
    }
    
    // 時間経過による減衰
    const timeDecay = Math.exp(-hours / 72);
    const distanceDecay = Math.exp(-distance / 10000);
    return timeDecay * distanceDecay * 0.9;
  }

  private calculateConfidenceScore(hours: number): number {
    // 文献データに基づく信頼度
    if (hours <= 24) return 0.93; // 93%の回収率
    if (hours <= 48) return 0.85;
    if (hours <= 72) return 0.70;
    if (hours <= 168) return 0.34; // 34%が7日以内に発見
    return 0.20;
  }

  private calculateNewPosition(
    origin: { lat: number; lng: number },
    distanceKm: number,
    angle: number
  ): { lat: number; lng: number } {
    const R = 6371; // 地球の半径（km）
    const lat1 = origin.lat * (Math.PI / 180);
    const lng1 = origin.lng * (Math.PI / 180);
    const d = distanceKm / R;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(angle)
    );
    
    const lng2 = lng1 + Math.atan2(
      Math.sin(angle) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      lat: lat2 * (180 / Math.PI),
      lng: lng2 * (180 / Math.PI),
    };
  }

  private estimateSearchTime(areas: PredictionArea[]): number {
    // 各エリアの面積から探索時間を推定
    const totalArea = areas.reduce((sum, area) => {
      return sum + Math.PI * Math.pow(area.radius / 1000, 2); // km²に変換
    }, 0);
    
    // 徒歩での探索速度を2km/hと仮定
    const searchSpeed = 2;
    const searchEfficiency = 0.3; // 実際の探索効率
    
    return Math.ceil(totalArea / (searchSpeed * searchEfficiency) * 60); // 分単位
  }

  private calculateHoursSinceLost(): number {
    const now = new Date();
    const lostTime = this.petProfile.lastSeenTime;
    return (now.getTime() - lostTime.getTime()) / (1000 * 60 * 60);
  }

  private detectEnvironment(): 'urban' | 'suburban' | 'rural' {
    // 実際の実装では位置情報からAPIで判定
    // ここではダミー実装
    return 'suburban';
  }

  private detectWeatherCondition(): 'clear' | 'rain' | 'storm' | 'snow' {
    // 実際の実装では天気APIから取得
    // ここではダミー実装
    const weather = this.petProfile.weatherCondition;
    if (!weather) return 'clear';
    
    if (weather.condition === 'stormy') return 'storm';
    if (weather.condition === 'rainy') return 'rain';
    if (weather.condition === 'snowy') return 'snow';
    return 'clear';
  }

  private async identifyDangerZones(areas: PredictionArea[]): Promise<DangerZone[]> {
    // 将来的にはAPIから取得
    return [];
  }

  private async findPointsOfInterest(areas: PredictionArea[]): Promise<PointOfInterest[]> {
    // 将来的にはGoogle Places APIから取得
    return [];
  }
}