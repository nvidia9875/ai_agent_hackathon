import type { 
  PetProfile, 
  BehaviorPattern, 
  PredictionArea, 
  SearchZone, 
  HeatmapData,
  PredictionResult,
  PredictionTimeFrame,
  DangerZone,
  PointOfInterest
} from '@/lib/types/behavior-predictor';
import { GeocodingService } from './geocoding-service';

const DOG_BEHAVIOR_PATTERNS: BehaviorPattern = {
  petType: 'dog',
  weatherInfluence: 0.7,
  terrainPreference: ['park', 'residential', 'forest'],
  movementSpeed: 4.5, // km/h
  hidingTendency: 0.3,
  waterAttraction: 0.8,
  foodSourceAttraction: 0.9,
  humanInteractionTendency: 0.7,
};

const CAT_BEHAVIOR_PATTERNS: BehaviorPattern = {
  petType: 'cat',
  weatherInfluence: 0.9,
  terrainPreference: ['residential', 'building', 'forest'],
  movementSpeed: 2.5, // km/h
  hidingTendency: 0.9,
  waterAttraction: 0.3,
  foodSourceAttraction: 0.7,
  humanInteractionTendency: 0.3,
};

export class BehaviorPredictor {
  private petProfile: PetProfile;
  private behaviorPattern: BehaviorPattern;
  private foundLocation?: { lat: number; lng: number };
  private homeLocation?: { lat: number; lng: number };

  constructor(petProfile: PetProfile, foundLocation?: { lat: number; lng: number }, homeLocation?: { lat: number; lng: number }) {
    this.petProfile = petProfile;
    this.behaviorPattern = petProfile.species === 'dog' 
      ? DOG_BEHAVIOR_PATTERNS 
      : CAT_BEHAVIOR_PATTERNS;
    this.foundLocation = foundLocation;
    this.homeLocation = homeLocation;
  }

  public async predictSearchArea(timeFrames: PredictionTimeFrame[]): Promise<PredictionResult> {
    const searchZones: SearchZone[] = [];
    const allHeatmapData: HeatmapData[] = [];

    // 実際の追跡シナリオを生成
    const trackingPath = this.generateTrackingPath();

    for (const timeFrame of timeFrames) {
      const predictionAreas = this.calculatePredictionAreas(timeFrame, trackingPath);
      const dangerZones = await this.identifyDangerZones(predictionAreas);
      const pointsOfInterest = await this.findPointsOfInterest(predictionAreas);
      const heatmapData = this.generateHeatmapData(predictionAreas, trackingPath, timeFrame);

      allHeatmapData.push(...heatmapData);

      searchZones.push({
        id: `zone-${timeFrame.hours}h`,
        priority: this.calculatePriority(timeFrame.hours),
        areas: predictionAreas,
        dangerZones,
        pointsOfInterest,
        searchStrategy: this.generateSearchStrategy(timeFrame),
        estimatedSearchTime: this.estimateSearchTime(predictionAreas),
      });
    }

    const recommendations = this.generateRecommendations();
    const confidenceScore = this.calculateConfidenceScore();

    return {
      petProfile: this.petProfile,
      searchZones,
      heatmapData: allHeatmapData,
      recommendations,
      confidenceScore,
      lastUpdated: new Date(),
    };
  }

  private calculatePredictionAreas(timeFrame: PredictionTimeFrame, trackingPath: Array<{location: {lat: number; lng: number}; time: number}>): PredictionArea[] {
    const areas: PredictionArea[] = [];
    
    // 研究データに基づく距離計算
    const baseRadius = this.calculateScientificMovementRadius(timeFrame.hours);
    
    // 迷子になった場所を中心とした円形予測エリア
    const lostLocation = this.petProfile.lastSeenLocation;
    
    // メインエリア（最も確率の高いエリア）
    areas.push({
      center: lostLocation,
      radius: baseRadius,
      probability: this.calculateCircularProbability(0, timeFrame.hours), // 中心部は最高確率
      timeFrame,
    });
    
    // 同心円状の追加エリア（時間経過に応じて）
    if (timeFrame.hours >= 6) {
      // 6時間以降は拡張エリアを追加
      areas.push({
        center: lostLocation,
        radius: baseRadius * 1.5,
        probability: this.calculateCircularProbability(baseRadius, timeFrame.hours),
        timeFrame,
      });
    }
    
    if (timeFrame.hours >= 12) {
      // 12時間以降はさらに拡張
      areas.push({
        center: lostLocation,
        radius: baseRadius * 2,
        probability: this.calculateCircularProbability(baseRadius * 1.5, timeFrame.hours),
        timeFrame,
      });
    }

    return areas;
  }

  private calculateMovementRadius(hours: number): number {
    const baseSpeed = this.behaviorPattern.movementSpeed || 3;
    const weatherFactor = this.getWeatherFactor();
    const sizeFactor = this.getSizeFactor();
    
    const radius = baseSpeed * hours * weatherFactor * sizeFactor;
    
    // Validate result
    if (isNaN(radius) || radius <= 0) {
      console.warn('Invalid movement radius calculated:', { baseSpeed, hours, weatherFactor, sizeFactor, radius });
      return 1; // Return minimum 1km radius
    }
    
    return radius;
  }

  private calculateScientificMovementRadius(hours: number): number {
    // lostDogsReport.mdの研究データに基づく計算
    const species = this.petProfile.species;
    const size = this.petProfile.size;
    const breed = this.petProfile.breed?.toLowerCase();
    
    // 基本移動距離（研究データの中央値）
    let baseDistanceKm: number;
    
    if (hours <= 1) {
      baseDistanceKm = 0.75; // 0.5-1km
    } else if (hours <= 3) {
      baseDistanceKm = 1.5; // 1-2km  
    } else if (hours <= 6) {
      baseDistanceKm = 2; // 1.5-3km
    } else if (hours <= 12) {
      baseDistanceKm = 2.5; // 2-4km
    } else if (hours <= 24) {
      baseDistanceKm = 3; // 2-4km
    } else {
      baseDistanceKm = 5; // 5km+
    }
    
    // サイズ別の調整（研究データに基づく）
    let sizeFactor = 1.0;
    if (size === 'small') {
      // 小型犬: 0.75-1マイル (1.2-1.6km)
      sizeFactor = 0.6;
    } else if (size === 'medium') {
      // 中型犬: 1-2マイル (1.6-3.2km)
      sizeFactor = 1.0;
    } else if (size === 'large') {
      // 大型犬: 2-5マイル (3.2-8km)
      sizeFactor = 1.5;
    }
    
    // 日本犬の特殊な考慮（柴犬、秋田犬など）
    if (breed && (breed.includes('柴') || breed.includes('shiba') || 
                  breed.includes('秋田') || breed.includes('akita'))) {
      // 独立心が強く、より遠距離まで移動する可能性
      sizeFactor *= 1.5;
    }
    
    // 環境要因の影響
    const weatherFactor = this.getWeatherFactor();
    const urbanFactor = this.getUrbanFactor(); // 都市部は移動制限
    
    // 最終的な半径計算
    const radius = baseDistanceKm * sizeFactor * weatherFactor * urbanFactor;
    
    // 研究データの最大値制限
    // 50%が402.3m以内、70%が1マイル(1.6km)以内で発見
    if (hours <= 24) {
      return Math.min(radius, 4); // 24時間以内は最大4km
    }
    
    return radius;
  }

  private getUrbanFactor(): number {
    // 都市部の制限要因を考慮
    // TODO: 実際の地域情報から判定
    // 現時点では中間値を使用
    return 0.8; // 都市部は移動が制限される
  }

  private calculateCircularProbability(distanceFromCenter: number, hours: number): number {
    // 研究データ: 50%が402.3m以内、70%が1マイル(1.6km)以内で発見
    const maxRadius = this.calculateScientificMovementRadius(hours);
    
    if (distanceFromCenter === 0) {
      // 中心部（失踪地点）は最高確率
      return 0.9;
    }
    
    // 距離に応じた確率の減衰（正規分布に近い）
    const normalizedDistance = distanceFromCenter / maxRadius;
    const probability = Math.exp(-2 * normalizedDistance * normalizedDistance) * 0.8;
    
    // 時間経過による確率の減少
    const timeFactor = Math.exp(-hours / 48); // 48時間で大幅に減少
    
    return Math.max(0.1, probability * timeFactor);
  }

  private adjustDistanceByBehavior(baseRadius: number, angle: number): number {
    const randomFactor = 0.7 + Math.random() * 0.6;
    const hidingFactor = 1 - (this.behaviorPattern.hidingTendency * 0.5);
    
    return baseRadius * randomFactor * hidingFactor;
  }

  private calculateNewPosition(
    origin: { lat: number; lng: number },
    distance: number,
    angle: number
  ): { lat: number; lng: number } {
    // Validate input
    if (!origin || isNaN(origin.lat) || isNaN(origin.lng) || 
        isNaN(distance) || isNaN(angle)) {
      console.error('Invalid input to calculateNewPosition:', { origin, distance, angle });
      return { lat: 35.6762, lng: 139.6503 }; // Return default Tokyo location
    }
    
    const R = 6371;
    const lat1 = origin.lat * (Math.PI / 180);
    const lng1 = origin.lng * (Math.PI / 180);
    const d = distance / R;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(angle)
    );
    
    const lng2 = lng1 + Math.atan2(
      Math.sin(angle) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

    const result = {
      lat: lat2 * (180 / Math.PI),
      lng: lng2 * (180 / Math.PI),
    };
    
    // Validate output
    if (isNaN(result.lat) || isNaN(result.lng)) {
      console.error('NaN result in calculateNewPosition:', { origin, distance, angle, result });
      return { lat: 35.6762, lng: 139.6503 };
    }
    
    return result;
  }

  private calculateAreaProbability(
    distance: number,
    angle: number,
    hours: number
  ): number {
    const timeFactor = Math.exp(-hours / 24);
    const distanceFactor = Math.exp(-distance / 10);
    const baseProbability = 0.8;
    
    return baseProbability * timeFactor * distanceFactor;
  }

  private async identifyDangerZones(areas: PredictionArea[]): Promise<DangerZone[]> {
    // Firestoreから実際の危険エリアデータを取得する場合はここに実装
    // 現時点では空配列を返す
    return [];
  }

  private async findPointsOfInterest(areas: PredictionArea[]): Promise<PointOfInterest[]> {
    // Firestoreから実際のPOIデータを取得する場合はここに実装
    // Google Maps APIなどと連携して周辺施設を取得することも可能
    // 現時点では空配列を返す
    return [];
  }

  private generateHeatmapData(areas: PredictionArea[], trackingPath: Array<{location: {lat: number; lng: number}; time: number}>, timeFrame: PredictionTimeFrame): HeatmapData[] {
    const heatmapData: HeatmapData[] = [];
    
    // 失踪地点を中心とした円形ヒートマップを生成
    const center = this.petProfile.lastSeenLocation;
    const maxRadius = this.calculateScientificMovementRadius(timeFrame.hours);
    
    // 円形グリッドの生成
    const gridResolution = 20; // グリッドの解像度
    const angleStep = (2 * Math.PI) / gridResolution;
    const radiusStep = maxRadius / 10;
    
    // 中心点に最高の重み
    heatmapData.push({
      location: center,
      weight: 1.0,
    });
    
    // 同心円状にヒートマップデータを生成
    for (let r = radiusStep; r <= maxRadius; r += radiusStep) {
      const pointsInRing = Math.floor(gridResolution * (r / maxRadius)); // 外側ほど多くの点
      
      for (let i = 0; i < pointsInRing; i++) {
        const angle = (2 * Math.PI * i) / pointsInRing;
        const point = this.calculateNewPosition(center, r, angle);
        
        // 中心からの距離に基づく重み（研究データに基づく）
        let weight: number;
        
        if (r <= 0.4) {
          // 402.3m以内: 50%の確率
          weight = 0.9;
        } else if (r <= 1.6) {
          // 1.6km以内: 70%の確率
          weight = 0.7;
        } else if (r <= maxRadius * 0.5) {
          // 半径の50%以内
          weight = 0.5;
        } else if (r <= maxRadius * 0.75) {
          // 半径の75%以内
          weight = 0.3;
        } else {
          // 外周部
          weight = 0.15;
        }
        
        // 時間による重みの調整
        const timeFactor = Math.exp(-timeFrame.hours / 24);
        weight *= timeFactor;
        
        // ランダムな変動を加える（自然な見た目のため）
        weight *= (0.8 + Math.random() * 0.4);
        
        heatmapData.push({
          location: point,
          weight: weight,
        });
      }
    }
    
    // 行動パターンに基づく重点エリアの追加
    const attractionPoints = this.getAttractionPoints(maxRadius);
    for (const attPoint of attractionPoints) {
      // 誘引地点周辺にも重みを追加
      const attractionRadius = maxRadius * 0.2;
      for (let i = 0; i < 8; i++) {
        const angle = (2 * Math.PI * i) / 8;
        const distance = attractionRadius * (0.5 + Math.random() * 0.5);
        const point = this.calculateNewPosition(attPoint.location, distance, angle);
        
        heatmapData.push({
          location: point,
          weight: attPoint.probability * 0.6,
        });
      }
    }

    return heatmapData;
  }

  private calculatePriority(hours: number): 'high' | 'medium' | 'low' {
    if (hours <= 3) return 'high';
    if (hours <= 12) return 'medium';
    return 'low';
  }

  private generateSearchStrategy(timeFrame: PredictionTimeFrame): string {
    const strategies = {
      1: `${timeFrame.hours}時間以内の捜索: 最終目撃地点から半径${this.calculateMovementRadius(timeFrame.hours).toFixed(1)}km圏内を重点的に捜索。`,
      3: `${timeFrame.hours}時間経過の捜索: ${this.behaviorPattern.petType === 'dog' ? '公園や住宅地' : '建物の隙間や茂み'}を中心に捜索。`,
      6: `${timeFrame.hours}時間経過の捜索: 食料源や水源の周辺を重点的に確認。`,
      12: `${timeFrame.hours}時間経過の捜索: 広域捜索を実施。保護施設への確認も推奨。`,
      24: `${timeFrame.hours}時間経過の捜索: SNSや地域コミュニティへの情報拡散を強化。`,
    };

    return strategies[timeFrame.hours as keyof typeof strategies] || strategies[24];
  }

  private estimateSearchTime(areas: PredictionArea[]): number {
    const totalArea = areas.reduce((sum, area) => sum + Math.PI * area.radius * area.radius, 0);
    const searchSpeed = 2;
    return Math.ceil(totalArea / searchSpeed * 60);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [
      `${this.behaviorPattern.petType === 'dog' ? '犬' : '猫'}の習性を考慮した捜索を推奨`,
      '最終目撃地点の周辺住民への聞き込みを実施',
      'SNSでの情報拡散と目撃情報の収集',
    ];

    if (this.behaviorPattern.hidingTendency > 0.7) {
      recommendations.push('物陰や狭い場所を重点的に確認');
    }

    if (this.behaviorPattern.foodSourceAttraction > 0.8) {
      recommendations.push('レストランやゴミ集積所周辺を確認');
    }

    if (this.behaviorPattern.waterAttraction > 0.7) {
      recommendations.push('川や池などの水源地を確認');
    }

    if (this.petProfile.weatherCondition?.precipitation) {
      recommendations.push('雨宿りできる場所（軒下、橋の下など）を確認');
    }

    return recommendations;
  }

  private calculateConfidenceScore(): number {
    const timeSinceLastSeen = Date.now() - this.petProfile.lastSeenTime.getTime();
    const hoursElapsed = timeSinceLastSeen / (1000 * 60 * 60);
    
    const timeFactor = Math.max(0, 1 - hoursElapsed / 72);
    const weatherFactor = this.petProfile.weatherCondition ? 0.9 : 0.7;
    
    return Math.min(0.95, timeFactor * weatherFactor);
  }

  private getWeatherFactor(): number {
    if (!this.petProfile.weatherCondition) return 1;
    
    const { condition, temperature } = this.petProfile.weatherCondition;
    
    if (condition === 'stormy' || condition === 'snowy') return 0.3;
    if (condition === 'rainy') return 0.6;
    if (temperature < 5 || temperature > 35) return 0.5;
    
    return 1;
  }

  private getSizeFactor(): number {
    const factors: Record<string, number> = {
      small: 0.7,
      medium: 1.0,
      large: 1.2,
    };
    
    const factor = factors[this.petProfile.size] || 1.0;
    
    if (isNaN(factor)) {
      console.warn('Invalid size factor for size:', this.petProfile.size);
      return 1.0;
    }
    
    return factor;
  }

  private getAttractionPoints(maxRadius: number): Array<{ location: { lat: number; lng: number }; probability: number }> {
    const points: Array<{ location: { lat: number; lng: number }; probability: number }> = [];
    
    // Validate maxRadius
    if (isNaN(maxRadius) || maxRadius <= 0) {
      console.warn('Invalid maxRadius in getAttractionPoints:', maxRadius);
      return points;
    }
    
    // 食料源への誘引
    if (this.behaviorPattern.foodSourceAttraction > 0.5) {
      const foodAngle = Math.random() * 2 * Math.PI;
      const foodDistance = maxRadius * 0.6 * Math.random();
      points.push({
        location: this.calculateNewPosition(this.petProfile.lastSeenLocation, foodDistance, foodAngle),
        probability: this.behaviorPattern.foodSourceAttraction,
      });
    }
    
    // 水源への誘引
    if (this.behaviorPattern.waterAttraction > 0.5) {
      const waterAngle = Math.random() * 2 * Math.PI;
      const waterDistance = maxRadius * 0.5 * Math.random();
      points.push({
        location: this.calculateNewPosition(this.petProfile.lastSeenLocation, waterDistance, waterAngle),
        probability: this.behaviorPattern.waterAttraction,
      });
    }
    
    // 隠れ場所への誘引（特に猫）
    if (this.behaviorPattern.hidingTendency > 0.7) {
      for (let i = 0; i < 2; i++) {
        const hideAngle = Math.random() * 2 * Math.PI;
        const hideDistance = maxRadius * 0.3 * Math.random();
        points.push({
          location: this.calculateNewPosition(this.petProfile.lastSeenLocation, hideDistance, hideAngle),
          probability: this.behaviorPattern.hidingTendency * 0.8,
        });
      }
    }
    
    return points;
  }

  private generateTrackingPath(): Array<{location: {lat: number; lng: number}; time: number}> {
    const path: Array<{location: {lat: number; lng: number}; time: number}> = [];
    
    // 失踪地点を開始点とする
    const lostLocation = this.petProfile.lastSeenLocation;
    path.push({ location: lostLocation, time: 0 });
    
    // 研究データに基づく予測経路を生成
    // 時間別の典型的な移動パターン
    const timePoints = [1, 3, 6, 12, 24];
    
    for (const hours of timePoints) {
      if (hours > 24) break; // 24時間までの予測
      
      const radius = this.calculateScientificMovementRadius(hours);
      
      // ペットの行動パターンに基づく移動方向の決定
      let preferredAngle: number;
      
      if (this.behaviorPattern.petType === 'dog') {
        // 犬の場合: より直線的な動き
        preferredAngle = this.getDogMovementAngle(hours);
      } else {
        // 猫の場合: より円形的な動き（隠れ場所を探す）
        preferredAngle = this.getCatMovementAngle(hours);
      }
      
      // 研究データの確率分布に基づく位置
      const actualDistance = radius * this.getDistanceProbability(hours);
      const location = this.calculateNewPosition(lostLocation, actualDistance, preferredAngle);
      
      path.push({ location, time: hours });
    }
    
    return path;
  }

  private getDogMovementAngle(hours: number): number {
    // 犬の移動パターン: 匂いを追跡、直線的
    const baseAngle = Math.PI / 4; // 北東方向を基準
    const variation = (Math.PI / 6) * Math.sin(hours * 0.5); // 時間による変動
    return baseAngle + variation;
  }

  private getCatMovementAngle(hours: number): number {
    // 猫の移動パターン: 建物沿い、円形的
    const segmentAngle = (2 * Math.PI * hours) / 24; // 24時間で一周
    const variation = (Math.PI / 8) * Math.random(); // ランダムな変動
    return segmentAngle + variation;
  }

  private getDistanceProbability(hours: number): number {
    // 研究データに基づく距離の確率分布
    // 50%が402.3m以内、70%が1マイル以内で発見
    if (hours <= 1) {
      return 0.5; // 初期は近距離
    } else if (hours <= 6) {
      return 0.6; // 徐々に拡大
    } else if (hours <= 12) {
      return 0.7;
    } else {
      return 0.8; // 長時間経過後は広範囲
    }
  }

  private calculateDistance(loc1: {lat: number; lng: number}, loc2: {lat: number; lng: number}): number {
    const R = 6371; // 地球の半径（km）
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private getPreferredDirection(hour: number): number {
    // ペットの種類と時間に基づいて優先される移動方向を決定
    if (this.behaviorPattern.petType === 'dog') {
      // 犬は公園や開けた場所を好む傾向
      return (Math.PI / 4) * hour; // 北東→東→南東方向
    } else {
      // 猫は建物沿いや狭い場所を好む傾向
      return (Math.PI / 6) * hour + Math.random() * (Math.PI / 3); // よりランダムな動き
    }
  }

  private getPositionOnPath(path: Array<{location: {lat: number; lng: number}; time: number}>, elapsedHours: number): {lat: number; lng: number} {
    // 経過時間に基づいて経路上の位置を推定
    if (elapsedHours <= 0) return path[0].location;
    if (elapsedHours >= path[path.length - 1].time) return path[path.length - 1].location;
    
    // 線形補間で中間位置を計算
    for (let i = 0; i < path.length - 1; i++) {
      if (elapsedHours >= path[i].time && elapsedHours <= path[i + 1].time) {
        const ratio = (elapsedHours - path[i].time) / (path[i + 1].time - path[i].time);
        return {
          lat: path[i].location.lat + (path[i + 1].location.lat - path[i].location.lat) * ratio,
          lng: path[i].location.lng + (path[i + 1].location.lng - path[i].location.lng) * ratio,
        };
      }
    }
    
    return path[0].location;
  }

  private getPathSegments(path: Array<{location: {lat: number; lng: number}; time: number}>, elapsedHours: number): Array<{location: {lat: number; lng: number}; probability: number}> {
    const segments: Array<{location: {lat: number; lng: number}; probability: number}> = [];
    
    for (const point of path) {
      if (point.time <= elapsedHours) {
        // 時間差に基づく確率（最近の地点ほど高確率）
        const timeDiff = elapsedHours - point.time;
        const probability = Math.exp(-timeDiff * 0.5) * 0.8;
        segments.push({
          location: point.location,
          probability: probability,
        });
      }
    }
    
    return segments;
  }

  private interpolatePath(path: Array<{location: {lat: number; lng: number}; time: number}>, maxHours: number): Array<{location: {lat: number; lng: number}; probability: number}> {
    const interpolated: Array<{location: {lat: number; lng: number}; probability: number}> = [];
    const steps = 20; // 補間ステップ数
    
    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i];
      const end = path[i + 1];
      
      if (start.time <= maxHours) {
        for (let j = 0; j <= steps; j++) {
          const ratio = j / steps;
          const time = start.time + (end.time - start.time) * ratio;
          
          if (time <= maxHours) {
            const location = {
              lat: start.location.lat + (end.location.lat - start.location.lat) * ratio,
              lng: start.location.lng + (end.location.lng - start.location.lng) * ratio,
            };
            
            // 時間に基づく確率の減衰
            const probability = Math.exp(-time * 0.2) * 0.9;
            
            interpolated.push({
              location,
              probability,
            });
          }
        }
      }
    }
    
    return interpolated;
  }
}