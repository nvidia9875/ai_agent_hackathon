'use client';

import { useEffect, useState, useRef } from 'react';
import { Box, Paper, IconButton, Stack } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, MyLocation as MyLocationIcon } from '@mui/icons-material';

declare global {
  interface Window {
    google: any;
    googleMapsCallback: () => void;
  }
}

let mapInstance: any = null;
let scriptLoaded = false;

export default function MapContainer() {
  const [isLoaded, setIsLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const currentMapInstance = useRef<any>(null);

  useEffect(() => {
    const initializeMap = () => {
      if (!mapRef.current) return;
      
      try {
        if (window.google && window.google.maps && window.google.maps.Map) {
          // Clear existing map instance if any
          if (currentMapInstance.current) {
            currentMapInstance.current = null;
          }
          
          currentMapInstance.current = new window.google.maps.Map(mapRef.current, {
            center: { lat: 35.6762, lng: 139.6503 },
            zoom: 12,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
          });
          mapInstance = currentMapInstance.current;
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Error initializing Google Map:', error);
      }
    };

    const loadGoogleMaps = () => {
      // Don't load script if it's already loaded
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // Wait for existing script to load
        existingScript.addEventListener('load', initializeMap);
        return;
      }
      
      // Set up callback function
      window.googleMapsCallback = () => {
        initializeMap();
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&callback=googleMapsCallback&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        scriptLoaded = false;
      };
      
      document.head.appendChild(script);
    };

    // Always try to initialize if we have a container but no map instance
    if (mapRef.current && !currentMapInstance.current) {
      // Check if Google Maps API is already loaded
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }
    }

    // If map is already initialized for this component instance, don't reinitialize
    if (currentMapInstance.current && mapRef.current) {
      return;
    }

    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      loadGoogleMaps();
    }, 100);

    return () => {
      clearTimeout(timer);
      // Clean up when component unmounts
      if (currentMapInstance.current) {
        currentMapInstance.current = null;
      }
      mapInstance = null;
      setIsLoaded(false);
      if (window.googleMapsCallback) {
        delete window.googleMapsCallback;
      }
    };
  }, []);

  const handleZoomIn = () => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstance) {
      mapInstance.setZoom(mapInstance.getZoom() - 1);
    }
  };

  const handleCurrentLocation = () => {
    if (mapInstance && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          mapInstance.setCenter(pos);
          mapInstance.setZoom(15);
        },
        () => {
          console.error('Error: The Geolocation service failed.');
        }
      );
    }
  };

  return (
    <Box sx={{ flex: 1, p: 3 }}>
      <Paper
        elevation={1}
        sx={{
          position: 'relative',
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: 'grey.200'
        }}
      >
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        
        {/* Map Controls */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Stack spacing={0}>
            <IconButton
              onClick={handleZoomIn}
              disabled={!isLoaded}
              sx={{
                backgroundColor: 'background.paper',
                borderRadius: '8px 8px 0 0',
                '&:hover': { backgroundColor: 'grey.100' },
                boxShadow: 1
              }}
            >
              <AddIcon />
            </IconButton>
            <IconButton
              onClick={handleZoomOut}
              disabled={!isLoaded}
              sx={{
                backgroundColor: 'background.paper',
                borderRadius: '0 0 8px 8px',
                '&:hover': { backgroundColor: 'grey.100' },
                boxShadow: 1
              }}
            >
              <RemoveIcon />
            </IconButton>
          </Stack>
          
          <IconButton
            onClick={handleCurrentLocation}
            disabled={!isLoaded}
            sx={{
              backgroundColor: 'background.paper',
              borderRadius: 2,
              mt: 1,
              '&:hover': { backgroundColor: 'grey.100' },
              boxShadow: 1
            }}
          >
            <MyLocationIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
}