'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@/lib/google-maps-loader';

interface MapLocation {
  lat: number;
  lng: number;
  title: string;
  type: 'lost' | 'found';
}

const sampleLocations: MapLocation[] = [
  { lat: 35.6762, lng: 139.6503, title: '迷子: 柴犬', type: 'lost' },
  { lat: 35.6854, lng: 139.7531, title: '発見: 三毛猫', type: 'found' },
  { lat: 35.6586, lng: 139.7454, title: '発見: ゴールデンレトリーバー', type: 'found' },
];

export default function GoogleMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    const loadMap = async () => {
      try {
        // 既に読み込まれている場合はすぐに初期化
        if (isGoogleMapsLoaded()) {
          initializeMap();
          return;
        }

        // Google Maps APIを読み込み
        await loadGoogleMaps();
        initializeMap();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google Maps APIの読み込みに失敗しました');
        setIsLoading(false);
      }
    };

    loadMap();
  }, []);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) {
      setTimeout(initializeMap, 100);
      return;
    }

    try {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: 35.6762, lng: 139.6503 }, // 東京の座標
        zoom: 12,
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

      // マーカーを追加
      sampleLocations.forEach(location => {
        const marker = new window.google.maps.Marker({
          position: { lat: location.lat, lng: location.lng },
          map: mapInstance,
          title: location.title,
          icon: {
            url: location.type === 'lost' 
              ? 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%23f44336"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E'
              : 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%234caf50"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
            scaledSize: new window.google.maps.Size(32, 32)
          }
        });

        // 情報ウィンドウを追加
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; color: ${location.type === 'lost' ? '#f44336' : '#4caf50'};">
                ${location.title}
              </h3>
              <p style="margin: 0; font-size: 14px;">
                ${location.type === 'lost' ? '迷子の場所' : '発見・保護場所'}
              </p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstance, marker);
        });
      });

      setMap(mapInstance);
      setIsLoading(false);
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('マップの初期化に失敗しました');
      setIsLoading(false);
    }
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
      {!isLoading && !error && (
        <Box sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          boxShadow: 2,
          p: 2,
          minWidth: 200
        }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            凡例
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              backgroundColor: '#f44336', 
              borderRadius: '50%', 
              mr: 1 
            }} />
            <Typography variant="caption">迷子ペット</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              backgroundColor: '#4caf50', 
              borderRadius: '50%', 
              mr: 1 
            }} />
            <Typography variant="caption">発見・保護されたペット</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}