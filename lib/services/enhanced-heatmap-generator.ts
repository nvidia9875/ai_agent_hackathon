/**
 * 高密度・高詳細ヒートマップ生成サービス
 * グリッドベースのアプローチで滑らかなヒートマップを生成
 */

import { HeatmapData } from '@/lib/types/behavior-predictor';

export interface EnhancedHeatmapOptions {
  center: google.maps.LatLngLiteral;
  radius: number; // km
  gridResolution: number; // グリッド解像度（メートル単位）
  zoomLevel: number;
  timeElapsed: number; // 経過時間（時間）
  petSize: 'small' | 'medium' | 'large';
  terrainType?: string;
}

export interface GridPoint {
  lat: number;
  lng: number;
  probability: number;
  weight: number;
}

export class EnhancedHeatmapGenerator {
  private readonly MIN_GRID_SIZE = 25; // 最小グリッドサイズ（メートル）
  private readonly MAX_GRID_SIZE = 200; // 最大グリッドサイズ（メートル）
  private readonly INTERPOLATION_RADIUS = 3; // 補間用の近傍グリッド数

  /**
   * ズームレベルに応じた詳細なヒートマップデータを生成
   */
  generateDetailedHeatmap(options: EnhancedHeatmapOptions): HeatmapData[] {
    // ズームレベルに応じてグリッドサイズを動的に調整
    const gridSize = this.calculateOptimalGridSize(options.zoomLevel);
    
    // グリッドポイントを生成
    const gridPoints = this.generateGridPoints(options, gridSize);
    
    // 各グリッドポイントの確率を計算
    const probabilityGrid = this.calculateGridProbabilities(gridPoints, options);
    
    // 補間処理で滑らかにする
    const interpolatedGrid = this.interpolateGrid(probabilityGrid);
    
    // ヒートマップデータに変換
    return this.convertToHeatmapData(interpolatedGrid);
  }

  /**
   * ズームレベルに基づく最適なグリッドサイズを計算
   */
  private calculateOptimalGridSize(zoomLevel: number): number {
    // ズーム10-20の範囲を想定
    // ズームが大きいほど細かいグリッド
    if (zoomLevel >= 18) return this.MIN_GRID_SIZE;
    if (zoomLevel >= 16) return 50;
    if (zoomLevel >= 14) return 100;
    if (zoomLevel >= 12) return 150;
    return this.MAX_GRID_SIZE;
  }

  /**
   * グリッドポイントを生成
   */
  private generateGridPoints(
    options: EnhancedHeatmapOptions,
    gridSize: number
  ): GridPoint[] {
    const points: GridPoint[] = [];
    const { center, radius } = options;
    
    // メートルを緯度・経度の差分に変換
    const latDegPerMeter = 1 / 111320;
    const lngDegPerMeter = 1 / (111320 * Math.cos(center.lat * Math.PI / 180));
    
    const gridSizeLat = gridSize * latDegPerMeter;
    const gridSizeLng = gridSize * lngDegPerMeter;
    
    const radiusInMeters = radius * 1000;
    const numGrids = Math.ceil((radiusInMeters * 2) / gridSize);
    
    for (let i = -numGrids / 2; i <= numGrids / 2; i++) {
      for (let j = -numGrids / 2; j <= numGrids / 2; j++) {
        const lat = center.lat + (i * gridSizeLat);
        const lng = center.lng + (j * gridSizeLng);
        
        // 円形範囲内のポイントのみ追加
        const distance = this.calculateDistance(center, { lat, lng });
        if (distance <= radiusInMeters) {
          points.push({
            lat,
            lng,
            probability: 0,
            weight: 0
          });
        }
      }
    }
    
    return points;
  }

  /**
   * 各グリッドポイントの確率を計算
   */
  private calculateGridProbabilities(
    gridPoints: GridPoint[],
    options: EnhancedHeatmapOptions
  ): GridPoint[] {
    return gridPoints.map(point => {
      const distance = this.calculateDistance(options.center, point);
      const probability = this.calculateProbabilityAtPoint(
        distance,
        options
      );
      
      return {
        ...point,
        probability,
        weight: this.calculateWeight(probability, distance, options)
      };
    });
  }

  /**
   * 特定地点での発見確率を計算（科学的データに基づく）
   */
  private calculateProbabilityAtPoint(
    distanceInMeters: number,
    options: EnhancedHeatmapOptions
  ): number {
    const distanceKm = distanceInMeters / 1000;
    const { timeElapsed, petSize } = options;
    
    // 研究データに基づく確率分布
    // 50%が402.3m以内、70%が1.6km以内で発見
    let baseProbability: number;
    
    if (distanceKm <= 0.4) {
      // 400m以内：最高確率エリア
      baseProbability = 0.9 - (distanceKm * 0.5);
    } else if (distanceKm <= 1.6) {
      // 1.6km以内：高確率エリア
      baseProbability = 0.7 - ((distanceKm - 0.4) * 0.3);
    } else if (distanceKm <= 3.0) {
      // 3km以内：中確率エリア
      baseProbability = 0.4 - ((distanceKm - 1.6) * 0.15);
    } else {
      // それ以遠：低確率エリア
      baseProbability = Math.max(0.05, 0.25 * Math.exp(-distanceKm / 5));
    }
    
    // 時間経過による減衰
    const timeFactor = this.calculateTimeFactor(timeElapsed);
    
    // ペットサイズによる調整
    const sizeFactor = this.calculateSizeFactor(petSize, distanceKm);
    
    // 地形による調整（オプション）
    const terrainFactor = options.terrainType ? 
      this.calculateTerrainFactor(options.terrainType) : 1.0;
    
    // 最終確率計算
    const finalProbability = baseProbability * timeFactor * sizeFactor * terrainFactor;
    
    // 0.01〜1.0の範囲に正規化
    return Math.max(0.01, Math.min(1.0, finalProbability));
  }

  /**
   * 時間経過による確率減衰
   */
  private calculateTimeFactor(hours: number): number {
    if (hours <= 6) return 1.0;
    if (hours <= 12) return 0.9;
    if (hours <= 24) return 0.75;
    if (hours <= 48) return 0.5;
    if (hours <= 72) return 0.35;
    return 0.2;
  }

  /**
   * ペットサイズによる移動範囲の調整
   */
  private calculateSizeFactor(
    size: 'small' | 'medium' | 'large',
    distanceKm: number
  ): number {
    switch (size) {
      case 'small':
        // 小型：近距離で高確率、遠距離で急減
        return distanceKm <= 1 ? 1.2 : 0.6;
      case 'medium':
        // 中型：標準
        return 1.0;
      case 'large':
        // 大型：遠距離でも確率維持
        return distanceKm > 2 ? 1.3 : 0.9;
    }
  }

  /**
   * 地形による確率調整
   */
  private calculateTerrainFactor(terrainType: string): number {
    const terrainFactors: Record<string, number> = {
      'residential': 1.1,  // 住宅地：発見されやすい
      'park': 1.2,         // 公園：ペットが集まりやすい
      'forest': 0.7,       // 森林：発見困難
      'commercial': 0.9,   // 商業地：人は多いが隠れ場所も多い
      'water': 0.5,        // 水域：アクセス困難
      'road': 0.8          // 道路：危険だが目撃されやすい
    };
    
    return terrainFactors[terrainType] || 1.0;
  }

  /**
   * ヒートマップの重みを計算
   */
  private calculateWeight(
    probability: number,
    distanceInMeters: number,
    options: EnhancedHeatmapOptions
  ): number {
    // 確率をベースに、距離で調整した重みを計算
    const baseWeight = probability * 100;
    
    // 中心に近いほど重みを増加
    const distanceBonus = Math.max(0, 1 - (distanceInMeters / (options.radius * 1000)));
    
    return baseWeight * (1 + distanceBonus * 0.5);
  }

  /**
   * グリッドを補間して滑らかにする
   */
  private interpolateGrid(gridPoints: GridPoint[]): GridPoint[] {
    const interpolated: GridPoint[] = [];
    
    gridPoints.forEach(point => {
      // 近傍のポイントを取得
      const neighbors = this.findNeighbors(point, gridPoints);
      
      if (neighbors.length > 0) {
        // 近傍の値で補間
        const avgProbability = this.weightedAverage(point, neighbors, 'probability');
        const avgWeight = this.weightedAverage(point, neighbors, 'weight');
        
        interpolated.push({
          ...point,
          probability: avgProbability,
          weight: avgWeight
        });
      } else {
        interpolated.push(point);
      }
    });
    
    return interpolated;
  }

  /**
   * 近傍のグリッドポイントを検索
   */
  private findNeighbors(
    point: GridPoint,
    allPoints: GridPoint[],
    radiusMeters: number = 100
  ): GridPoint[] {
    return allPoints.filter(p => {
      if (p === point) return false;
      const distance = this.calculateDistance(point, p);
      return distance <= radiusMeters;
    });
  }

  /**
   * 距離に基づく重み付き平均
   */
  private weightedAverage(
    centerPoint: GridPoint,
    neighbors: GridPoint[],
    property: 'probability' | 'weight'
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;
    
    // 中心点も含める
    const allPoints = [centerPoint, ...neighbors];
    
    allPoints.forEach(point => {
      const distance = point === centerPoint ? 0 : 
        this.calculateDistance(centerPoint, point);
      
      // 距離に基づく重み（ガウス関数）
      const weight = Math.exp(-distance * distance / (2 * 50 * 50));
      
      totalWeight += weight;
      weightedSum += point[property] * weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : centerPoint[property];
  }

  /**
   * グリッドポイントをヒートマップデータに変換
   */
  private convertToHeatmapData(gridPoints: GridPoint[]): HeatmapData[] {
    // 重みでフィルタリング（非常に低い値は除外）
    const filtered = gridPoints.filter(p => p.weight > 0.5);
    
    // 追加のポイントを生成（密度向上）
    const enhanced = this.enhancePointDensity(filtered);
    
    return enhanced.map(point => ({
      location: {
        lat: point.lat,
        lng: point.lng
      },
      weight: point.weight
    }));
  }

  /**
   * ポイント密度を向上させる
   */
  private enhancePointDensity(points: GridPoint[]): GridPoint[] {
    const enhanced: GridPoint[] = [...points];
    
    // 高確率エリアには追加ポイントを生成
    points.forEach(point => {
      if (point.probability > 0.5) {
        // 周囲に小さなランダムポイントを追加
        for (let i = 0; i < 3; i++) {
          const offset = 0.0001; // 約11メートル
          enhanced.push({
            lat: point.lat + (Math.random() - 0.5) * offset,
            lng: point.lng + (Math.random() - 0.5) * offset,
            probability: point.probability * (0.8 + Math.random() * 0.2),
            weight: point.weight * (0.8 + Math.random() * 0.2)
          });
        }
      }
    });
    
    return enhanced;
  }

  /**
   * 2点間の距離を計算（メートル）
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371000; // 地球の半径（メートル）
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  /**
   * 動的にヒートマップを更新（リアルタイム用）
   */
  updateHeatmapWithSighting(
    currentHeatmap: HeatmapData[],
    sightingLocation: google.maps.LatLngLiteral,
    confidence: number
  ): HeatmapData[] {
    const updated = [...currentHeatmap];
    
    // 目撃地点周辺の確率を上昇
    const boostRadius = 500; // メートル
    const boostFactor = 1 + (confidence * 0.5);
    
    // 新しいポイントを追加
    for (let angle = 0; angle < 360; angle += 30) {
      for (let r = 0; r <= boostRadius; r += 50) {
        const lat = sightingLocation.lat + 
          (r * Math.cos(angle * Math.PI / 180)) / 111320;
        const lng = sightingLocation.lng + 
          (r * Math.sin(angle * Math.PI / 180)) / (111320 * Math.cos(sightingLocation.lat * Math.PI / 180));
        
        const weight = confidence * 100 * Math.exp(-r / boostRadius);
        
        updated.push({
          location: { lat, lng },
          weight
        });
      }
    }
    
    return updated;
  }
}

// シングルトンインスタンス
export const enhancedHeatmapGenerator = new EnhancedHeatmapGenerator();