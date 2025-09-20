'use client';

import { useEffect, useRef, useState } from 'react';
import { HeatmapData } from '@/lib/types/behavior-predictor';

interface ScientificHeatMapProps {
  map: google.maps.Map | null;
  heatmapData: HeatmapData[];
  visible: boolean;
  intensity?: number;
  radius?: number;
  opacity?: number;
}

export default function ScientificHeatMap({
  map,
  heatmapData,
  visible,
  intensity = 2,
  radius = 20,
  opacity = 0.6,
}: ScientificHeatMapProps) {
  const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);

  // Visualization ライブラリのロード
  useEffect(() => {
    if (!window.google || !map) return;

    const loadVisualizationLibrary = async () => {
      const { HeatmapLayer } = await google.maps.importLibrary('visualization') as google.maps.VisualizationLibrary;
      setIsLibraryLoaded(true);
    };

    loadVisualizationLibrary();
  }, [map]);

  // ヒートマップレイヤーの作成と更新
  useEffect(() => {
    if (!map || !isLibraryLoaded || heatmapData.length === 0) return;

    // 既存のレイヤーをクリア
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setMap(null);
    }

    // データを Google Maps 形式に変換
    const googleHeatmapData = heatmapData.map(point => ({
      location: new google.maps.LatLng(point.location.lat, point.location.lng),
      weight: point.weight,
    }));

    // 新しいヒートマップレイヤーを作成
    const heatmapLayer = new google.maps.visualization.HeatmapLayer({
      data: googleHeatmapData,
      map: visible ? map : null,
      radius,
      opacity,
      maxIntensity: intensity,
      gradient: [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)',
      ],
    });

    heatmapLayerRef.current = heatmapLayer;

    return () => {
      if (heatmapLayerRef.current) {
        heatmapLayerRef.current.setMap(null);
      }
    };
  }, [map, heatmapData, visible, intensity, radius, opacity, isLibraryLoaded]);

  // 表示/非表示の切り替え
  useEffect(() => {
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setMap(visible ? map : null);
    }
  }, [visible, map]);

  // オプションの動的更新
  useEffect(() => {
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.set('radius', radius);
      heatmapLayerRef.current.set('opacity', opacity);
      heatmapLayerRef.current.set('maxIntensity', intensity);
    }
  }, [intensity, radius, opacity]);

  return null; // このコンポーネントはマップ上にレンダリングされるだけ
}

// ヒートマップコントロールパネル
export function HeatMapControls({
  visible,
  onVisibilityChange,
  intensity,
  onIntensityChange,
  radius,
  onRadiusChange,
  opacity,
  onOpacityChange,
}: {
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  intensity: number;
  onIntensityChange: (intensity: number) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">ヒートマップ設定</h3>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => onVisibilityChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {visible && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              強度: {intensity}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={intensity}
              onChange={(e) => onIntensityChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              半径: {radius}px
            </label>
            <input
              type="range"
              min="10"
              max="50"
              value={radius}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              透明度: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity * 100}
              onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      <div className="text-xs text-gray-600">
        <p>🔴 高確率エリア（赤）</p>
        <p>🟡 中確率エリア（黄）</p>
        <p>🔵 低確率エリア（青）</p>
      </div>
    </div>
  );
}