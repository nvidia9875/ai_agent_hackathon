'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Alert, CircularProgress, Paper } from '@mui/material';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@/lib/google-maps-loader';
import type { 
  PredictionResult, 
  SearchZone,
  DangerZone,
  PointOfInterest,
  HeatmapData
} from '@/lib/types/behavior-predictor';

interface BehaviorPredictorMapProps {
  predictionResult?: PredictionResult | null;
  showHeatmap?: boolean;
  showDangerZones?: boolean;
  showPointsOfInterest?: boolean;
  selectedTimeFrame?: number;
}

export default function BehaviorPredictorMap({
  predictionResult,
  showHeatmap = true,
  showDangerZones = true,
  showPointsOfInterest = true,
  selectedTimeFrame,
}: BehaviorPredictorMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [map, setMap] = useState<any>(null);
  const heatmapLayer = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    const loadMap = async () => {
      try {
        if (isGoogleMapsLoaded()) {
          initializeMap();
          return;
        }
        await loadGoogleMaps();
        initializeMap();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google Maps APIの読み込みに失敗しました');
        setIsLoading(false);
      }
    };

    loadMap();
  }, []);

  useEffect(() => {
    if (map && predictionResult) {
      updateMapVisualization();
    }
  }, [map, predictionResult, showHeatmap, showDangerZones, showPointsOfInterest, selectedTimeFrame]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) {
      setTimeout(initializeMap, 100);
      return;
    }

    try {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: 35.6762, lng: 139.6503 },
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
      setMap(mapInstance);
      setIsLoading(false);
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('マップの初期化に失敗しました');
      setIsLoading(false);
    }
  };

  const updateMapVisualization = () => {
    clearMapElements();

    if (!predictionResult) return;

    const selectedZone = selectedTimeFrame 
      ? predictionResult.searchZones.find(z => z.id === `zone-${selectedTimeFrame}h`)
      : predictionResult.searchZones[0];

    if (!selectedZone) return;

    // Center map on last seen location
    map.setCenter(predictionResult.petProfile.lastSeenLocation);
    map.setZoom(14);

    // Add last seen location marker
    addLastSeenMarker(predictionResult.petProfile.lastSeenLocation);

    // Add heatmap
    if (showHeatmap && predictionResult.heatmapData.length > 0) {
      addHeatmap(predictionResult.heatmapData);
    }

    // Add search zones
    addSearchZones(selectedZone);

    // Add danger zones
    if (showDangerZones) {
      addDangerZones(selectedZone.dangerZones);
    }

    // Add points of interest
    if (showPointsOfInterest) {
      addPointsOfInterest(selectedZone.pointsOfInterest);
    }
  };

  const clearMapElements = () => {
    if (heatmapLayer.current) {
      heatmapLayer.current.setMap(null);
      heatmapLayer.current = null;
    }

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    circlesRef.current.forEach(circle => circle.setMap(null));
    circlesRef.current = [];
  };

  const addLastSeenMarker = (location: { lat: number; lng: number }) => {
    const marker = new window.google.maps.Marker({
      position: location,
      map,
      title: '最終目撃地点',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#FF0000',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
      },
      zIndex: 1000,
    });

    marker.addListener('click', () => {
      infoWindowRef.current.setContent(`
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0;">最終目撃地点</h3>
          <p style="margin: 0;">ここで最後に目撃されました</p>
        </div>
      `);
      infoWindowRef.current.open(map, marker);
    });

    markersRef.current.push(marker);
  };

  const addHeatmap = (heatmapData: HeatmapData[]) => {
    if (!window.google.maps.visualization) {
      console.error('Google Maps Visualization library not loaded');
      return;
    }

    const points = heatmapData.map(data => ({
      location: new window.google.maps.LatLng(data.location.lat, data.location.lng),
      weight: data.weight,
    }));

    heatmapLayer.current = new window.google.maps.visualization.HeatmapLayer({
      data: points,
      map,
      radius: 50,
      opacity: 0.7,
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
        'rgba(255, 0, 0, 1)'
      ]
    });
  };

  const addSearchZones = (zone: SearchZone) => {
    zone.areas.forEach(area => {
      const circle = new window.google.maps.Circle({
        center: area.center,
        radius: area.radius * 1000, // Convert km to meters
        map,
        fillColor: '#2196F3',
        fillOpacity: 0.1 * area.probability,
        strokeColor: '#2196F3',
        strokeOpacity: 0.5,
        strokeWeight: 2,
      });

      circle.addListener('click', () => {
        infoWindowRef.current.setContent(`
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0;">予測エリア</h3>
            <p style="margin: 4px 0;">確率: ${(area.probability * 100).toFixed(1)}%</p>
            <p style="margin: 4px 0;">時間枠: ${area.timeFrame.label}</p>
          </div>
        `);
        infoWindowRef.current.setPosition(area.center);
        infoWindowRef.current.open(map);
      });

      circlesRef.current.push(circle);
    });
  };

  const addDangerZones = (dangerZones: DangerZone[]) => {
    dangerZones.forEach(zone => {
      const circle = new window.google.maps.Circle({
        center: zone.location,
        radius: zone.radius * 1000,
        map,
        fillColor: zone.dangerLevel === 'high' ? '#FF0000' : zone.dangerLevel === 'medium' ? '#FFA500' : '#FFFF00',
        fillOpacity: 0.3,
        strokeColor: zone.dangerLevel === 'high' ? '#FF0000' : zone.dangerLevel === 'medium' ? '#FFA500' : '#FFFF00',
        strokeOpacity: 0.8,
        strokeWeight: 2,
      });

      const marker = new window.google.maps.Marker({
        position: zone.location,
        map,
        title: `危険エリア: ${zone.type}`,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: zone.dangerLevel === 'high' ? '#FF0000' : '#FFA500',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        infoWindowRef.current.setContent(`
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; color: ${zone.dangerLevel === 'high' ? '#FF0000' : '#FFA500'};">
              危険エリア: ${zone.type}
            </h3>
            <p style="margin: 4px 0;">危険度: ${zone.dangerLevel}</p>
            <p style="margin: 4px 0;">このエリアには注意が必要です</p>
          </div>
        `);
        infoWindowRef.current.open(map, marker);
      });

      circlesRef.current.push(circle);
      markersRef.current.push(marker);
    });
  };

  const addPointsOfInterest = (pois: PointOfInterest[]) => {
    pois.forEach(poi => {
      const iconColors = {
        food: '#4CAF50',
        water: '#2196F3',
        shelter: '#9C27B0',
        park: '#8BC34A',
        vet: '#FF9800',
        petstore: '#795548',
      };

      const marker = new window.google.maps.Marker({
        position: poi.location,
        map,
        title: poi.name,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: iconColors[poi.type] || '#757575',
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        infoWindowRef.current.setContent(`
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; color: ${iconColors[poi.type] || '#757575'};">
              ${poi.name}
            </h3>
            <p style="margin: 4px 0;">タイプ: ${poi.type}</p>
            <p style="margin: 4px 0;">誘引スコア: ${(poi.attractionScore * 100).toFixed(0)}%</p>
          </div>
        `);
        infoWindowRef.current.open(map, marker);
      });

      markersRef.current.push(marker);
    });
  };

  if (error) {
    return (
      <Box sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>マップエラー</Typography>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      {isLoading && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.paper',
          zIndex: 1
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              マップを読み込んでいます...
            </Typography>
          </Box>
        </Box>
      )}
      
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '400px'
        }} 
      />
      
      {/* 凡例 */}
      {!isLoading && !error && predictionResult && (
        <Paper sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          p: 2,
          maxWidth: 280,
          maxHeight: '40%',
          overflow: 'auto'
        }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            行動予測マップ凡例
          </Typography>
          
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                backgroundColor: '#FF0000', 
                borderRadius: '50%', 
                mr: 1 
              }} />
              <Typography variant="caption">最終目撃地点</Typography>
            </Box>
            
            {showHeatmap && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Box sx={{ 
                  width: 16, 
                  height: 16, 
                  background: 'linear-gradient(90deg, #0000FF, #FF0000)', 
                  mr: 1 
                }} />
                <Typography variant="caption">移動確率ヒートマップ</Typography>
              </Box>
            )}
            
            {showDangerZones && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    backgroundColor: '#FF0000', 
                    opacity: 0.3,
                    mr: 1 
                  }} />
                  <Typography variant="caption">高危険エリア</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    backgroundColor: '#FFA500', 
                    opacity: 0.3,
                    mr: 1 
                  }} />
                  <Typography variant="caption">中危険エリア</Typography>
                </Box>
              </>
            )}
            
            {showPointsOfInterest && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ 
                    width: 0, 
                    height: 0, 
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderBottom: '12px solid #4CAF50',
                    mr: 1 
                  }} />
                  <Typography variant="caption">食料源</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ 
                    width: 0, 
                    height: 0, 
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderBottom: '12px solid #2196F3',
                    mr: 1 
                  }} />
                  <Typography variant="caption">水源</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ 
                    width: 0, 
                    height: 0, 
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderBottom: '12px solid #8BC34A',
                    mr: 1 
                  }} />
                  <Typography variant="caption">公園</Typography>
                </Box>
              </>
            )}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            信頼度: {predictionResult.confidenceScore ? (predictionResult.confidenceScore * 100).toFixed(0) : 0}%
          </Typography>
        </Paper>
      )}
    </Box>
  );
}