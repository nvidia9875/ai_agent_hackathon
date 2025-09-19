'use client';

import { useEffect, useState, useRef } from 'react';
import { Box, Paper, IconButton, Stack } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, MyLocation as MyLocationIcon } from '@mui/icons-material';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@/lib/google-maps-loader';

export default function MapContainer() {
  const [isLoaded, setIsLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const currentMapInstance = useRef<any>(null);

  useEffect(() => {
    const initializeMap = () => {
      if (!mapRef.current || currentMapInstance.current) return;
      
      try {
        if (window.google && window.google.maps && window.google.maps.Map) {
          console.log('Initializing Google Map...');
          currentMapInstance.current = new window.google.maps.Map(mapRef.current, {
            center: { lat: 35.6762, lng: 139.6503 }, // Tokyo
            zoom: 12,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
          });
          setIsLoaded(true);
          console.log('Map initialized successfully');
        } else {
          console.error('Google Maps API not available');
        }
      } catch (error) {
        console.error('Error initializing Google Map:', error);
      }
    };

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
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
      }
    };

    loadMap();
  }, []);

  const zoomIn = () => {
    if (currentMapInstance.current) {
      const currentZoom = currentMapInstance.current.getZoom();
      currentMapInstance.current.setZoom(currentZoom + 1);
    }
  };

  const zoomOut = () => {
    if (currentMapInstance.current) {
      const currentZoom = currentMapInstance.current.getZoom();
      currentMapInstance.current.setZoom(currentZoom - 1);
    }
  };

  const centerOnUserLocation = () => {
    if (navigator.geolocation && currentMapInstance.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          currentMapInstance.current.setCenter(pos);
          currentMapInstance.current.setZoom(15);
        },
        () => {
          console.error('Error: The Geolocation service failed.');
        }
      );
    }
  };

  if (!isLoaded) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'grey.100',
        color: 'text.secondary'
      }}>
        地図を読み込み中...
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Map Controls */}
      <Paper sx={{ 
        position: 'absolute', 
        top: 16, 
        right: 16, 
        p: 1,
        bgcolor: 'background.paper',
        boxShadow: 2
      }}>
        <Stack spacing={1}>
          <IconButton size="small" onClick={zoomIn} title="ズームイン">
            <AddIcon />
          </IconButton>
          <IconButton size="small" onClick={zoomOut} title="ズームアウト">
            <RemoveIcon />
          </IconButton>
          <IconButton size="small" onClick={centerOnUserLocation} title="現在地">
            <MyLocationIcon />
          </IconButton>
        </Stack>
      </Paper>
    </Box>
  );
}