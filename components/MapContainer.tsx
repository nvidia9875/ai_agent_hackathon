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
          mapInstance = currentMapInstance.current;
          setIsLoaded(true);
          console.log('Map initialized successfully');
        } else {
          console.error('Google Maps API not available');
        }
      } catch (error) {
        console.error('Error initializing Google Map:', error);
      }
    };

    const loadGoogleMaps = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps API already loaded');
        initializeMap();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Script already exists, waiting for load...');
        existingScript.addEventListener('load', initializeMap);
        return;
      }
      
      console.log('Loading Google Maps API...');
      
      // Set up callback function
      window.googleMapsCallback = () => {
        console.log('Google Maps callback executed');
        initializeMap();
      };

      const script = document.createElement('script');
      // Use a mock key or remove the key requirement for testing
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDummyKeyForTesting&callback=googleMapsCallback&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps script loaded successfully');
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps script', error);
        setIsLoaded(false);
      };
      
      document.head.appendChild(script);
    };

    // Don't initialize if we already have a map
    if (currentMapInstance.current) {
      return;
    }

    // Add small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (mapRef.current) {
        loadGoogleMaps();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
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