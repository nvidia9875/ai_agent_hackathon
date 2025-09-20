'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow, Polyline } from '@react-google-maps/api';
import { LostDogPredictor } from '@/lib/services/lost-dog-predictor';
import ScientificHeatMap, { HeatMapControls } from './ScientificHeatMap';
import type { PetProfile, PredictionResult, SearchZone } from '@/lib/types/behavior-predictor';

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places', 'visualization'];

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const defaultCenter = {
  lat: 35.6762,
  lng: 139.6503,
};

interface LostDogSearchMapProps {
  petProfile: PetProfile | null;
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
}

export default function LostDogSearchMap({ petProfile, onLocationSelect }: LostDogSearchMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [selectedZone, setSelectedZone] = useState<SearchZone | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapIntensity, setHeatmapIntensity] = useState(2);
  const [heatmapRadius, setHeatmapRadius] = useState(20);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.6);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  // 現在位置の取得
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(pos);
          if (map) {
            map.setCenter(pos);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, [map]);

  // ペット情報が更新されたら予測を実行
  useEffect(() => {
    if (petProfile && petProfile.lastSeenLocation) {
      runPrediction();
    }
  }, [petProfile]);

  const runPrediction = async () => {
    if (!petProfile) return;

    setIsSearching(true);
    try {
      const predictor = new LostDogPredictor(petProfile);
      
      // 時間枠の設定（1時間、6時間、24時間、72時間）
      const timeFrames = [
        { hours: 1, label: '1時間以内' },
        { hours: 6, label: '6時間経過' },
        { hours: 24, label: '24時間経過' },
        { hours: 72, label: '72時間経過' },
      ];

      const result = await predictor.predictSearchArea(timeFrames);
      setPrediction(result);

      // マップを最適なビューに調整
      if (map && result.searchZones.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        
        // すべての探索エリアを含むように境界を設定
        result.searchZones.forEach((zone) => {
          zone.areas.forEach((area) => {
            const center = new google.maps.LatLng(area.center.lat, area.center.lng);
            const distance = area.radius / 111000; // メートルを度に変換（概算）
            
            bounds.extend(new google.maps.LatLng(
              area.center.lat + distance,
              area.center.lng + distance
            ));
            bounds.extend(new google.maps.LatLng(
              area.center.lat - distance,
              area.center.lng - distance
            ));
          });
        });

        map.fitBounds(bounds);
      }
    } catch (error) {
      console.error('Prediction error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const getZoneColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return '#FF0000'; // 赤
      case 'medium':
        return '#FFA500'; // オレンジ
      case 'low':
        return '#0000FF'; // 青
      default:
        return '#808080'; // グレー
    }
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng && onLocationSelect) {
      const location = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      onLocationSelect(location);
    }
  }, [onLocationSelect]);

  if (loadError) {
    return <div>マップの読み込みエラー: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return <div>マップを読み込み中...</div>;
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={petProfile?.lastSeenLocation || currentLocation || defaultCenter}
        zoom={14}
        onLoad={onMapLoad}
        onClick={handleMapClick}
        options={{
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        }}
      >
        {/* 最終目撃地点 */}
        {petProfile?.lastSeenLocation && (
          <Marker
            position={petProfile.lastSeenLocation}
            title="最終目撃地点"
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            }}
          />
        )}

        {/* 現在地 */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            title="現在地"
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            }}
          />
        )}

        {/* 探索ゾーン */}
        {prediction?.searchZones.map((zone) => (
          <div key={zone.id}>
            {zone.areas.map((area, index) => (
              <Circle
                key={`${zone.id}-area-${index}`}
                center={area.center}
                radius={area.radius}
                options={{
                  strokeColor: getZoneColor(zone.priority),
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillColor: getZoneColor(zone.priority),
                  fillOpacity: 0.2 * area.probability,
                  clickable: true,
                }}
                onClick={() => setSelectedZone(zone)}
              />
            ))}
          </div>
        ))}

        {/* ヒートマップ */}
        {map && prediction?.heatmapData && (
          <ScientificHeatMap
            map={map}
            heatmapData={prediction.heatmapData}
            visible={showHeatmap}
            intensity={heatmapIntensity}
            radius={heatmapRadius}
            opacity={heatmapOpacity}
          />
        )}

        {/* 選択されたゾーンの情報ウィンドウ */}
        {selectedZone && selectedZone.areas[0] && (
          <InfoWindow
            position={selectedZone.areas[0].center}
            onCloseClick={() => setSelectedZone(null)}
          >
            <div className="p-2">
              <h3 className="font-bold text-lg mb-2">探索ゾーン: {selectedZone.id}</h3>
              <p className="text-sm mb-1">
                <strong>優先度:</strong> {
                  selectedZone.priority === 'high' ? '高' :
                  selectedZone.priority === 'medium' ? '中' : '低'
                }
              </p>
              <p className="text-sm mb-1">
                <strong>推定探索時間:</strong> {selectedZone.estimatedSearchTime}分
              </p>
              <div className="mt-2">
                <strong className="text-sm">探索戦略:</strong>
                <p className="text-xs mt-1 whitespace-pre-line">{selectedZone.searchStrategy}</p>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* コントロールパネル */}
      <div className="absolute top-4 right-4 space-y-4">
        {/* ヒートマップコントロール */}
        <HeatMapControls
          visible={showHeatmap}
          onVisibilityChange={setShowHeatmap}
          intensity={heatmapIntensity}
          onIntensityChange={setHeatmapIntensity}
          radius={heatmapRadius}
          onRadiusChange={setHeatmapRadius}
          opacity={heatmapOpacity}
          onOpacityChange={setHeatmapOpacity}
        />

        {/* 推奨事項パネル */}
        {prediction && (
          <div className="bg-white rounded-lg shadow-md p-4 max-w-sm">
            <h3 className="text-lg font-semibold mb-2">推奨事項</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {prediction.recommendations.map((rec, index) => (
                <p key={index} className="text-sm">{rec}</p>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-gray-600">
                信頼度: {Math.round(prediction.confidenceScore * 100)}%
              </p>
            </div>
          </div>
        )}

        {/* 探索ボタン */}
        <button
          onClick={runPrediction}
          disabled={!petProfile || isSearching}
          className={`px-6 py-3 rounded-lg text-white font-semibold shadow-md transition-colors ${
            isSearching 
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSearching ? '探索中...' : '探索範囲を更新'}
        </button>
      </div>

      {/* 凡例 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
        <h4 className="text-sm font-semibold mb-2">凡例</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full opacity-40"></div>
            <span className="text-xs">高優先度エリア</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full opacity-40"></div>
            <span className="text-xs">中優先度エリア</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full opacity-40"></div>
            <span className="text-xs">低優先度エリア</span>
          </div>
        </div>
      </div>
    </div>
  );
}