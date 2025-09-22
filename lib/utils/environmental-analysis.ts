import { WeatherCondition, TerrainType, DangerZone, HeatmapData } from '@/types/behavior-predictor';
import { WeatherService } from '@/lib/services/weather-service';

export interface EnvironmentalFactors {
  weather: WeatherCondition;
  timeOfDay: TimeOfDay;
  terrain: TerrainInfo[];
  dangerZones: DangerZone[];
}

export interface TimeOfDay {
  hour: number;
  period: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
  lightLevel: number; // 0-1
}

export interface TerrainInfo {
  type: TerrainType;
  location: {
    lat: number;
    lng: number;
  };
  radius: number;
  accessibility: number; // 0-1
  shelterQuality: number; // 0-1
}

export class EnvironmentalAnalysis {
  
  // 現在の時間帯を取得
  static getTimeOfDay(): TimeOfDay {
    const now = new Date();
    const hour = now.getHours();
    
    let period: TimeOfDay['period'];
    let lightLevel: number;
    
    if (hour >= 5 && hour < 7) {
      period = 'dawn';
      lightLevel = 0.3;
    } else if (hour >= 7 && hour < 12) {
      period = 'morning';
      lightLevel = 0.9;
    } else if (hour >= 12 && hour < 17) {
      period = 'afternoon';
      lightLevel = 1.0;
    } else if (hour >= 17 && hour < 20) {
      period = 'evening';
      lightLevel = 0.5;
    } else {
      period = 'night';
      lightLevel = 0.1;
    }
    
    return { hour, period, lightLevel };
  }
  
  // 天候データを取得（OpenWeatherMap APIを使用）
  static async getWeatherCondition(lat: number, lng: number): Promise<WeatherCondition> {
    const weatherService = WeatherService.getInstance();
    return await weatherService.getWeatherCondition(lat, lng);
  }
  
  // 地形データを分析（実際のマップAPIと統合可能）
  static async analyzeTerrain(center: { lat: number; lng: number }, radius: number): Promise<TerrainInfo[]> {
    const terrainTypes: TerrainType[] = ['residential', 'commercial', 'park', 'forest', 'water', 'road', 'building'];
    const terrainInfo: TerrainInfo[] = [];
    
    // 実際にはGoogle Maps Places APIやOpenStreetMapを使用
    // ここではモックデータを生成
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const distance = Math.random() * radius;
      
      terrainInfo.push({
        type: terrainTypes[Math.floor(Math.random() * terrainTypes.length)],
        location: {
          lat: center.lat + (distance / 111) * Math.cos(angle),
          lng: center.lng + (distance / 111) * Math.sin(angle) / Math.cos(center.lat * Math.PI / 180)
        },
        radius: 100 + Math.random() * 200,
        accessibility: Math.random(),
        shelterQuality: Math.random()
      });
    }
    
    return terrainInfo;
  }
  
  // 危険エリアを識別
  static identifyDangerZones(center: { lat: number; lng: number }, _radius: number): DangerZone[] {
    const dangerZones: DangerZone[] = [];
    
    // 主要道路の危険エリア
    dangerZones.push({
      id: 'dz-road-1',
      type: 'road',
      location: { lat: center.lat + 0.002, lng: center.lng },
      radius: 50,
      dangerLevel: 'medium'
    });
    
    // 高速道路の危険エリア
    dangerZones.push({
      id: 'dz-highway-1',
      type: 'highway',
      location: { lat: center.lat + 0.005, lng: center.lng + 0.003 },
      radius: 100,
      dangerLevel: 'high'
    });
    
    // 水域の危険エリア
    dangerZones.push({
      id: 'dz-water-1',
      type: 'water',
      location: { lat: center.lat - 0.003, lng: center.lng + 0.004 },
      radius: 150,
      dangerLevel: 'medium'
    });
    
    // 線路の危険エリア
    dangerZones.push({
      id: 'dz-railway-1',
      type: 'railway',
      location: { lat: center.lat, lng: center.lng - 0.004 },
      radius: 30,
      dangerLevel: 'high'
    });
    
    // 工事現場の危険エリア
    if (Math.random() > 0.5) {
      dangerZones.push({
        id: 'dz-construction-1',
        type: 'construction',
        location: { lat: center.lat + 0.001, lng: center.lng - 0.002 },
        radius: 75,
        dangerLevel: 'low'
      });
    }
    
    return dangerZones;
  }
  
  // 環境要因を考慮した移動確率を計算
  static calculateMovementProbability(
    location: { lat: number; lng: number },
    petType: 'dog' | 'cat',
    weather: WeatherCondition,
    timeOfDay: TimeOfDay,
    terrain: TerrainInfo[],
    dangerZones: DangerZone[]
  ): number {
    let probability = 0.5; // ベース確率
    
    // 天候の影響
    if (weather.precipitation) {
      probability -= 0.2; // 雨天時は移動が減少
      
      // 猫は特に雨を嫌う
      if (petType === 'cat') {
        probability -= 0.1;
      }
    }
    
    if (weather.condition === 'stormy') {
      probability -= 0.3; // 嵐の時はさらに移動減少
    }
    
    // 気温の影響
    if (weather.temperature < 10 || weather.temperature > 35) {
      probability -= 0.15; // 極端な気温では移動減少
    }
    
    // 時間帯の影響
    switch (timeOfDay.period) {
      case 'dawn':
        probability += petType === 'cat' ? 0.15 : 0.1; // 夜明けは活発
        break;
      case 'morning':
        probability += 0.1;
        break;
      case 'afternoon':
        if (weather.temperature > 25) {
          probability -= 0.1; // 暑い午後は活動低下
        }
        break;
      case 'evening':
        probability += petType === 'cat' ? 0.2 : 0.15; // 夕方は活発
        break;
      case 'night':
        probability += petType === 'cat' ? 0.1 : -0.2; // 猫は夜行性
        break;
    }
    
    // 地形の影響
    const nearbyTerrain = terrain.filter(t => 
      this.calculateDistance(location, t.location) < t.radius / 1000
    );
    
    nearbyTerrain.forEach(t => {
      switch (t.type) {
        case 'park':
        case 'forest':
          probability += 0.1 * t.accessibility; // 公園や森は探索しやすい
          break;
        case 'water':
          probability += petType === 'dog' ? 0.05 : -0.1; // 犬は水に興味、猫は避ける
          break;
        case 'road':
        case 'commercial':
          probability -= 0.1; // 道路や商業地は避ける傾向
          break;
        case 'residential':
          probability += 0.05; // 住宅地は適度に探索
          break;
      }
    });
    
    // 危険エリアの影響
    const nearbyDangers = dangerZones.filter(d => 
      this.calculateDistance(location, d.location) < d.radius / 1000
    );
    
    nearbyDangers.forEach(d => {
      switch (d.dangerLevel) {
        case 'high':
          probability -= 0.3;
          break;
        case 'medium':
          probability -= 0.2;
          break;
        case 'low':
          probability -= 0.1;
          break;
      }
    });
    
    // 確率を0-1の範囲に制限
    return Math.max(0.05, Math.min(0.95, probability));
  }
  
  // ヒートマップデータを生成
  static generateEnhancedHeatmap(
    center: { lat: number; lng: number },
    radius: number,
    petType: 'dog' | 'cat',
    lostDuration: number // hours
  ): HeatmapData[] {
    const heatmapData: HeatmapData[] = [];
    const gridSize = 20; // グリッドの細かさ
    
    // 環境要因を取得
    const timeOfDay = this.getTimeOfDay();
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const latOffset = (i - gridSize / 2) * (radius / gridSize) / 111;
        const lngOffset = (j - gridSize / 2) * (radius / gridSize) / 111 / Math.cos(center.lat * Math.PI / 180);
        
        const location = {
          lat: center.lat + latOffset,
          lng: center.lng + lngOffset
        };
        
        const distance = this.calculateDistance(center, location);
        
        // 基本重み（距離に基づく）
        let weight = Math.exp(-distance * distance / (radius * radius / 4));
        
        // 時間経過による拡散
        const diffusionFactor = Math.min(1, lostDuration / 24);
        weight *= (1 - diffusionFactor * 0.5);
        
        // 時間帯による調整
        if (timeOfDay.period === 'night' && petType === 'cat') {
          weight *= 1.2; // 猫は夜活発
        } else if (timeOfDay.period === 'night' && petType === 'dog') {
          weight *= 0.7; // 犬は夜は活動低下
        }
        
        // 特定エリアへの傾向
        if (i < gridSize / 3) { // 北側（家の方向と仮定）
          weight *= petType === 'dog' ? 1.3 : 1.1; // 犬は家に戻りやすい
        }
        
        if (weight > 0.1) { // 閾値以上のみ追加
          heatmapData.push({ location, weight });
        }
      }
    }
    
    return heatmapData;
  }
  
  // 距離計算（km）
  private static calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // 地球の半径（km）
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  // 環境リスクスコアを計算
  static calculateEnvironmentalRisk(
    weather: WeatherCondition,
    timeOfDay: TimeOfDay,
    dangerZones: DangerZone[]
  ): number {
    let riskScore = 0;
    
    // 天候リスク
    if (weather.condition === 'stormy') riskScore += 3;
    if (weather.precipitation) riskScore += 1;
    if (weather.temperature < 5 || weather.temperature > 35) riskScore += 2;
    if (weather.windSpeed > 15) riskScore += 1;
    
    // 時間帯リスク
    if (timeOfDay.lightLevel < 0.3) riskScore += 2; // 暗い時間帯
    
    // 危険エリアの数と重要度
    dangerZones.forEach(zone => {
      switch (zone.dangerLevel) {
        case 'high': riskScore += 3; break;
        case 'medium': riskScore += 2; break;
        case 'low': riskScore += 1; break;
      }
    });
    
    return Math.min(10, riskScore); // 最大10に正規化
  }
}