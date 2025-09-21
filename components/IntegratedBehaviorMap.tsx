'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  Box, 
  Typography, 
  Alert, 
  CircularProgress, 
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Switch,
  FormControlLabel,
  Stack,
  Chip,
  LinearProgress,
  Avatar,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from '@mui/material';
import {
  Psychology as AIIcon,
  Psychology,
  Pets as PetsIcon,
  Schedule as TimeIcon,
  Visibility as VisibilityIcon,
  MyLocation as LocationIcon,
  Warning as WarningIcon,
  AutoAwesome as MatchingIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@/lib/google-maps-loader';
import { BehaviorPredictor } from '@/lib/services/behavior-predictor';
import { WeatherService } from '@/lib/services/weather-service';
import { GeocodingService } from '@/lib/services/geocoding-service';
import { enhancedHeatmapGenerator } from '@/lib/services/enhanced-heatmap-generator';
import { getUserPets, getAllMissingPets, getMatchedPets } from '@/lib/firestore/pets';
import type { PetInfo } from '@/types/pet';
import { useAuth } from '@/lib/auth/auth-context';
import dynamic from 'next/dynamic';

const PetMatchingCard = dynamic(() => import('@/components/PetMatchingCard'), { 
  ssr: false,
  loading: () => <CircularProgress />
});
import type { 
  PetProfile, 
  PredictionResult,
  PredictionTimeFrame,
  HeatmapData
} from '@/lib/types/behavior-predictor';

const TIME_FRAMES: PredictionTimeFrame[] = [
  { hours: 1, label: '1時間以内' },
  { hours: 3, label: '3時間以内' },
  { hours: 6, label: '6時間以内' },
  { hours: 12, label: '12時間以内' },
  { hours: 24, label: '24時間以内' },
];

// Paw icon SVG for lost pets
const PAW_ICON_SVG = `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f44336'%3E%3Cpath d='M4.5 10.5C4.5 12.9853 6.51472 15 9 15C11.4853 15 13.5 12.9853 13.5 10.5C13.5 8.01472 11.4853 6 9 6C6.51472 6 4.5 8.01472 4.5 10.5ZM9.00003 1C7.34317 1 6.00003 2.34315 6.00003 4C6.00003 5.65685 7.34317 7 9.00003 7C10.6569 7 12 5.65685 12 4C12 2.34315 10.6569 1 9.00003 1ZM3.00003 4C3.00003 2.34315 4.34317 1 6.00003 1C4.34317 1 3.00003 2.34315 3.00003 4C3.00003 5.65685 4.34317 7 6.00003 7C4.34317 7 3.00003 5.65685 3.00003 4ZM15 4C15 2.34315 16.3432 1 18 1C19.6569 1 21 2.34315 21 4C21 5.65685 19.6569 7 18 7C16.3432 7 15 5.65685 15 4ZM15 7C13.3432 7 12 5.65685 12 4C12 5.65685 13.3432 7 15 7C16.6569 7 18 5.65685 18 4C18 5.65685 16.6569 7 15 7ZM10.5 10.5C10.5 12.9853 12.5147 15 15 15C17.4853 15 19.5 12.9853 19.5 10.5C19.5 8.01472 17.4853 6 15 6C12.5147 6 10.5 8.01472 10.5 10.5ZM8.20711 16.2071C7.81658 15.8166 7.18342 15.8166 6.79289 16.2071C6.40237 16.5976 6.40237 17.2308 6.79289 17.6213L11.2929 22.1213C11.6834 22.5118 12.3166 22.5118 12.7071 22.1213L17.2071 17.6213C17.5976 17.2308 17.5976 16.5976 17.2071 16.2071C16.8166 15.8166 16.1834 15.8166 15.7929 16.2071L12 20L8.20711 16.2071Z'/%3E%3C/svg%3E`;

export default function IntegratedBehaviorMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [map, setMap] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  
  // User and pet data
  const [userLostPets, setUserLostPets] = useState<PetInfo[]>([]);
  const [allLostPets, setAllLostPets] = useState<PetInfo[]>([]);
  const [matchedPets, setMatchedPets] = useState<PetInfo[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [selectedPet, setSelectedPet] = useState<PetInfo | null>(null);
  const [selectedMatchedPet, setSelectedMatchedPet] = useState<PetInfo | null>(null);
  
  // Behavior prediction states
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showDangerZones, setShowDangerZones] = useState(true);
  const [showPointsOfInterest, setShowPointsOfInterest] = useState(true);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [elapsedHours, setElapsedHours] = useState<number>(0);
  
  // Map elements refs
  const heatmapLayer = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const pathLineRef = useRef<any>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(14);

  // Get current user from auth context
  const { user } = useAuth();
  const currentUserId = user?.uid || null;

  useEffect(() => {
    const loadPets = async () => {
      try {
        // Load all missing pets
        const allMissing = await getAllMissingPets();
        setAllLostPets(allMissing);
        
        // Load matched pets
        const matched = await getMatchedPets();
        setMatchedPets(matched);
        
        // Load user's pets if logged in
        if (currentUserId) {
          const userPets = await getUserPets(currentUserId);
          // Filter only missing pets for the user
          const userMissingPets = userPets.filter(pet => pet.status === 'missing');
          setUserLostPets(userMissingPets);
          
          // Auto-select first pet if available
          if (userMissingPets.length > 0) {
            setSelectedPetId(userMissingPets[0].id || '');
            setSelectedPet(userMissingPets[0]);
          }
        }
      } catch (error) {
        console.error('Error loading pets:', error);
      }
    };
    
    loadPets();
  }, [currentUserId]);

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
    if (map) {
      addPetMarkers();
    }
  }, [map, allLostPets, matchedPets]);

  useEffect(() => {
    if (map && predictionResult) {
      updatePredictionVisualization();
    }
  }, [map, predictionResult, elapsedHours, showHeatmap, showDangerZones, showPointsOfInterest]);

  // 経過時間を自動計算
  useEffect(() => {
    if (selectedPet && selectedPet.lastSeen?.date && selectedPet.lastSeen?.time) {
      const calculateElapsedTime = () => {
        const lostDate = new Date(`${selectedPet.lastSeen.date} ${selectedPet.lastSeen.time}`);
        const now = new Date();
        const elapsedMs = now.getTime() - lostDate.getTime();
        const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
        setElapsedHours(hours);
      };
      
      calculateElapsedTime();
      // 1分ごとに更新
      const interval = setInterval(calculateElapsedTime, 60000);
      return () => clearInterval(interval);
    }
  }, [selectedPet]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) {
      setTimeout(initializeMap, 100);
      return;
    }

    try {
      // 選択されたペットの位置を初期位置に、なければ東京
      let initialCenter = { lat: 35.6762, lng: 139.6503 }; // デフォルト（東京）
      
      if (selectedPet?.lastSeen?.location || selectedPet?.lastSeenLocation) {
        initialCenter = selectedPet.lastSeenLocation || initialCenter;
      } else if (userLostPets.length > 0) {
        // ユーザーの最初のペットの位置を使用
        const firstPet = userLostPets[0];
        if (firstPet.lastSeenLocation) {
          initialCenter = firstPet.lastSeenLocation;
        }
      }
      
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: 13,
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

  const addPetMarkers = async () => {
    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker.petMarker) {
        marker.setMap(null);
      }
    });
    markersRef.current = markersRef.current.filter(marker => !marker.petMarker);

    const geocodingService = GeocodingService.getInstance();

    // Add markers for matched pets at FOUND location
    for (const pet of matchedPets) {
      const isUserPet = pet.userId === currentUserId;
      const isSelected = pet.id === selectedPetId;
      
      // 発見場所の座標を取得（マッチングした場所）
      let position = { lat: 35.6762, lng: 139.6503 }; // デフォルト（東京）
      
      // 発見場所の住所がある場合はそれを使用
      if (pet.foundAddress) {
        // 東京都板橋区中板橋などの住所から座標を取得
        const geocoded = await geocodingService.estimateLocation(pet.foundAddress);
        if (geocoded) {
          position = geocoded;
        }
      } else if (pet.foundLocation) {
        // 発見場所の座標がある場合
        position = pet.foundLocation;
      } else if (pet.lastSeen?.location) {
        // フォールバック: 最後に見た場所
        const geocoded = await geocodingService.estimateLocation(pet.lastSeen.location);
        if (geocoded) {
          position = geocoded;
        }
      } else if (pet.lastSeenLocation) {
        position = pet.lastSeenLocation;
      }
      
      // マッチしたペット用の特別なアイコン（緑色のチェックマーク）
      const marker = new window.google.maps.Marker({
        position: position,
        map,
        title: `${pet.name} (マッチ済み - ${pet.foundAddress || '発見場所'})`,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234CAF50'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E`,
          scaledSize: new window.google.maps.Size(45, 45),
        },
        animation: window.google.maps.Animation.DROP,
        zIndex: 1000 // マッチしたペットを最前面に
      });

      (marker as any).petMarker = true;
      (marker as any).matchedPet = pet;
      (marker as any).isMatchedMarker = true;

      // クリックでマッチング結果モーダルを開く
      marker.addListener('click', () => {
        console.log('マッチングマーカーがクリックされました:', pet);
        setSelectedMatchedPet(pet);
        setShowMatchingModal(true);
      });

      markersRef.current.push(marker);
      
      // 迷子になった場所から発見場所へのラインを引く
      if (pet.lastSeenLocation && position !== pet.lastSeenLocation) {
        const matchLine = new window.google.maps.Polyline({
          path: [
            pet.lastSeenLocation,
            position
          ],
          geodesic: true,
          strokeColor: '#4CAF50',
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map,
          icons: [{
            icon: {
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#4CAF50'
            },
            offset: '100%'
          }]
        });
        
        // ラインも保存して後で削除できるように
        (matchLine as any).matchLine = true;
        markersRef.current.push(matchLine as any);
      }
    }
    
    // Add markers for non-matched lost pets (smaller and less prominent)
    for (const pet of allLostPets.filter(p => !p.hasMatch)) {
      const isUserPet = pet.userId === currentUserId;
      const isSelected = pet.id === selectedPetId;
      
      // 住所から座標を取得
      let position = { lat: 35.6762, lng: 139.6503 }; // デフォルト（東京）
      if (pet.lastSeen?.location) {
        const geocoded = await geocodingService.estimateLocation(pet.lastSeen.location);
        if (geocoded) {
          position = geocoded;
        }
      } else if (pet.lastSeenLocation) {
        position = pet.lastSeenLocation;
      }
      
      const marker = new window.google.maps.Marker({
        position: position,
        map,
        title: pet.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${isUserPet ? '%23ff5722' : '%23f44336'}'%3E%3Cpath d='M9,11.5c-1.4,0-2.5,1.1-2.5,2.5s1.1,2.5,2.5,2.5s2.5-1.1,2.5-2.5S10.4,11.5,9,11.5z M9,15c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S9.6,15,9,15z M15,11.5c-1.4,0-2.5,1.1-2.5,2.5s1.1,2.5,2.5,2.5s2.5-1.1,2.5-2.5S16.4,11.5,15,11.5z M15,15c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S15.6,15,15,15z M10.2,7.7c0,1.3-0.7,2.3-1.5,2.3S7.2,9,7.2,7.7S7.9,5.5,8.7,5.5S10.2,6.5,10.2,7.7z M16.8,7.7c0,1.3-0.7,2.3-1.5,2.3s-1.5-1-1.5-2.3s0.7-2.3,1.5-2.3S16.8,6.5,16.8,7.7z M12,19c-3.8,0-5-4.4-5-5c0-1.7,2.2-3,5-3s5,1.3,5,3C17,14.6,15.8,19,12,19z'/%3E%3C/svg%3E`,
          scaledSize: new window.google.maps.Size(isSelected ? 40 : 28, isSelected ? 40 : 28),
          opacity: 0.6
        },
        animation: isSelected ? window.google.maps.Animation.BOUNCE : null,
      });

      (marker as any).petMarker = true;

      marker.addListener('click', () => {
        infoWindowRef.current.setContent(`
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: ${isUserPet ? '#ff5722' : '#f44336'};">
              ${pet.name}
            </h3>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>種類:</strong> ${pet.type === 'dog' || pet.type === '犬' ? '犬' : '猫'}（${pet.breed || '不明'}）
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>最終目撃:</strong> ${pet.lastSeen?.date ? `${pet.lastSeen.date} ${pet.lastSeen.time}` : '不明'}
            </p>
            ${pet.specialFeatures ? `<p style="margin: 4px 0; font-size: 14px;"><strong>特徴:</strong> ${pet.specialFeatures}</p>` : ''}
            ${isUserPet ? '<p style="margin: 8px 0 0 0; color: #ff5722; font-weight: bold;">あなたのペット</p>' : ''}
          </div>
        `);
        infoWindowRef.current.open(map, marker);
      });

      markersRef.current.push(marker);
    }
  };

  const clearHeatmap = () => {
    if (heatmapLayer.current) {
      heatmapLayer.current.setMap(null);
      heatmapLayer.current = null;
    }
  };
  
  const clearPredictionElements = () => {
    clearHeatmap();

    if (pathLineRef.current) {
      pathLineRef.current.setMap(null);
      pathLineRef.current = null;
    }

    markersRef.current.forEach(marker => {
      // ペットマーカーとマッチラインは残す
      if (!(marker as any).petMarker && !(marker as any).matchLine) {
        marker.setMap(null);
      }
    });
    markersRef.current = markersRef.current.filter(marker => 
      (marker as any).petMarker || (marker as any).matchLine
    );

    circlesRef.current.forEach(circle => circle.setMap(null));
    circlesRef.current = [];
  };

  const updatePredictionVisualization = () => {
    clearPredictionElements();

    if (!predictionResult) return;

    // 経過時間に最も近いゾーンを選択
    const selectedZone = predictionResult.searchZones.reduce((closest, zone) => {
      const zoneHours = parseInt(zone.id.match(/\d+/)?.[0] || '0');
      const closestHours = parseInt(closest.id.match(/\d+/)?.[0] || '0');
      return Math.abs(zoneHours - elapsedHours) < Math.abs(closestHours - elapsedHours) ? zone : closest;
    }, predictionResult.searchZones[0]);

    if (!selectedZone) return;

    // Add tracking path line (渋谷から新宿への経路)
    addTrackingPath();

    // Add heatmap
    if (showHeatmap && predictionResult.heatmapData.length > 0) {
      addHeatmap(predictionResult.heatmapData);
    }

    // Add search zones
    selectedZone.areas.forEach(area => {
      const circle = new window.google.maps.Circle({
        center: area.center,
        radius: area.radius * 1000,
        map,
        fillColor: '#2196F3',
        fillOpacity: 0.1 * area.probability,
        strokeColor: '#2196F3',
        strokeOpacity: 0.5,
        strokeWeight: 2,
      });
      circlesRef.current.push(circle);
    });

    // Add danger zones
    if (showDangerZones) {
      selectedZone.dangerZones.forEach(zone => {
        const circle = new window.google.maps.Circle({
          center: zone.location,
          radius: zone.radius * 1000,
          map,
          fillColor: zone.dangerLevel === 'high' ? '#FF0000' : '#FFA500',
          fillOpacity: 0.3,
          strokeColor: zone.dangerLevel === 'high' ? '#FF0000' : '#FFA500',
          strokeOpacity: 0.8,
          strokeWeight: 2,
        });
        circlesRef.current.push(circle);
      });
    }

    // Add points of interest
    if (showPointsOfInterest) {
      selectedZone.pointsOfInterest.forEach(poi => {
        const iconColors: { [key: string]: string } = {
          food: '#4CAF50',
          water: '#2196F3',
          shelter: '#9C27B0',
          park: '#8BC34A',
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
        markersRef.current.push(marker);
      });
    }
  };

  const addHeatmap = (heatmapData: HeatmapData[]) => {
    if (!window.google.maps.visualization) {
      console.error('Google Maps Visualization library not loaded');
      return;
    }

    // ペットが迷子になった場所を中心に重みを調整
    const lostLocation = selectedPet?.lastSeenLocation || 
                        (selectedPet?.lastSeen?.location ? predictionResult?.petProfile.lastSeenLocation : null) ||
                        { lat: 35.6762, lng: 139.6503 };
    
    // 中心点に高い重みを追加
    const enhancedData = [...heatmapData];
    enhancedData.push({
      location: lostLocation,
      weight: 1.0  // 最高の重み
    });

    const points = enhancedData.map(data => ({
      location: new window.google.maps.LatLng(data.location.lat, data.location.lng),
      weight: data.weight,
    }));

    heatmapLayer.current = new window.google.maps.visualization.HeatmapLayer({
      data: points,
      map,
      radius: 50,
      opacity: 0.6,
    });
  };

  const addTrackingPath = () => {
    if (!predictionResult || !selectedPet) return;
    
    // ペットの実際のデータから経路を生成
    const pathCoordinates = [];
    
    // 開始地点（最後に目撃された場所）
    if (selectedPet.lastSeen?.location) {
      const startPoint = predictionResult.petProfile.lastSeenLocation;
      pathCoordinates.push(startPoint);
    }
    
    // 中間地点を追加（予測された移動経路）
    if (predictionResult.searchZones.length > 0) {
      const zones = predictionResult.searchZones;
      
      // 時間経過に応じた予測位置を追加
      zones.forEach((zone, index) => {
        if (zone.areas.length > 0) {
          // 各ゾーンの主要エリアの中心を経路に追加
          const mainArea = zone.areas[0];
          if (index < 3) { // 最初の3つのゾーンのみ
            pathCoordinates.push(mainArea.center);
          }
        }
      });
    }
    
    // 経路が2点以上ある場合のみ描画
    if (pathCoordinates.length < 2) {
      // デフォルトの経路を生成（現在位置から予測範囲）
      const center = predictionResult.petProfile.lastSeenLocation;
      pathCoordinates.push(center);
      
      // 移動方向を推定
      for (let i = 1; i <= 3; i++) {
        const angle = (Math.PI / 3) * i;
        const distance = i * 0.5; // km
        const nextPoint = {
          lat: center.lat + (distance / 111) * Math.cos(angle),
          lng: center.lng + (distance / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle)
        };
        pathCoordinates.push(nextPoint);
      }
    }

    // 時間経過を表す経路マーカー
    pathCoordinates.forEach((coord, index) => {
      const timeLabel = index === 0 ? '失踪地点' : 
                       index === pathCoordinates.length - 1 ? `${pathCoordinates.length - 1}時間後` : 
                       `${index}時間後`;
      
      const marker = new window.google.maps.Marker({
        position: coord,
        map,
        label: {
          text: timeLabel,
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: 'bold',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: index === pathCoordinates.length - 1 ? 10 : 8,
          fillColor: index === 0 ? '#FF5722' : 
                     index === pathCoordinates.length - 1 ? '#4CAF50' : 
                     '#FFC107',
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(marker);
    });

    // 経路ライン
    pathLineRef.current = new window.google.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: '#2196F3',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map,
    });

    // アニメーション用の矢印シンボル
    const lineSymbol = {
      path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 3,
      strokeColor: '#2196F3',
    };

    pathLineRef.current.setOptions({
      icons: [{
        icon: lineSymbol,
        offset: '100%',
        repeat: '100px',
      }],
    });
  };

  const handlePetSelection = (event: SelectChangeEvent) => {
    const petId = event.target.value;
    setSelectedPetId(petId);
    
    // Find pet from userLostPets or allLostPets
    const pet = userLostPets.find(p => p.id === petId) || 
                allLostPets.find(p => p.id === petId);
    setSelectedPet(pet || null);
    
    // Clear previous predictions when changing pet
    setPredictionResult(null);
    clearPredictionElements();
  };

  const handleAnalyze = async () => {
    if (!selectedPet) {
      alert('分析するペットを選択してください');
      return;
    }

    setIsAnalyzing(true);

    try {
      const geocodingService = GeocodingService.getInstance();
      
      // 最後に目撃された場所の座標を取得
      let lastSeenLocation = { lat: 35.6762, lng: 139.6503 }; // デフォルト（東京）
      if (selectedPet.lastSeen?.location) {
        const geocoded = await geocodingService.estimateLocation(selectedPet.lastSeen.location);
        if (geocoded) {
          lastSeenLocation = geocoded;
        }
      }
      
      // 自宅の座標を取得（contactInfoの住所から推定）
      let homeLocation: { lat: number; lng: number } | undefined;
      if (selectedPet.contactInfo?.name) {
        // 連絡先住所があれば使用（実装によってはcontactInfoに住所フィールドを追加）
        // 現時点では最後の目撃場所を自宅として仮定
        homeLocation = lastSeenLocation;
      }
      
      // 発見場所の座標を取得（もし既に発見されている場合）
      let foundLocation: { lat: number; lng: number } | undefined;
      if (selectedPet.status === 'found' || selectedPet.status === 'reunited') {
        // Firestoreから発見情報を取得する処理を追加可能
        // 現時点では未実装
      }
      
      // Use location for weather
      const weatherService = WeatherService.getInstance();
      const weather = await weatherService.getWeatherCondition(lastSeenLocation.lat, lastSeenLocation.lng);
      
      // Convert size to standard format
      let standardSize: 'small' | 'medium' | 'large' = 'medium';
      if (selectedPet.size) {
        const sizeStr = selectedPet.size.toLowerCase();
        if (sizeStr.includes('小') || sizeStr.includes('small') || sizeStr.includes('10-30') || sizeStr.includes('10cm')) {
          standardSize = 'small';
        } else if (sizeStr.includes('大') || sizeStr.includes('large') || sizeStr.includes('70') || sizeStr.includes('100')) {
          standardSize = 'large';
        } else {
          standardSize = 'medium';
        }
      }
      
      const petProfile: PetProfile = {
        id: selectedPet.id || '',
        name: selectedPet.name,
        species: selectedPet.type?.toLowerCase() === '犬' || selectedPet.type?.toLowerCase() === 'dog' ? 'dog' : 'cat',
        breed: selectedPet.breed,
        age: parseInt(selectedPet.age) || 1,
        size: standardSize,
        personality: selectedPet.personality || [],
        lastSeenLocation: lastSeenLocation,
        lastSeenTime: selectedPet.lastSeen?.date 
          ? new Date(`${selectedPet.lastSeen.date} ${selectedPet.lastSeen.time}`)
          : new Date(),
        weatherCondition: weather,
      };

      // 経過時間に基づいたタイムフレームを生成
      const calculatedElapsedHours = selectedPet.lastSeen?.date && selectedPet.lastSeen?.time
        ? Math.floor((Date.now() - new Date(`${selectedPet.lastSeen.date} ${selectedPet.lastSeen.time}`).getTime()) / (1000 * 60 * 60))
        : 1;
      
      // 経過時間に応じた動的タイムフレーム
      const dynamicTimeFrames: PredictionTimeFrame[] = [];
      
      if (calculatedElapsedHours <= 1) {
        dynamicTimeFrames.push({ hours: 1, label: '1時間以内' });
      } else if (calculatedElapsedHours <= 3) {
        dynamicTimeFrames.push(
          { hours: 1, label: '1時間以内' },
          { hours: calculatedElapsedHours, label: `現在(${calculatedElapsedHours}時間経過)` }
        );
      } else if (calculatedElapsedHours <= 6) {
        dynamicTimeFrames.push(
          { hours: 1, label: '1時間以内' },
          { hours: 3, label: '3時間以内' },
          { hours: calculatedElapsedHours, label: `現在(${calculatedElapsedHours}時間経過)` }
        );
      } else if (calculatedElapsedHours <= 12) {
        dynamicTimeFrames.push(
          { hours: 3, label: '3時間以内' },
          { hours: 6, label: '6時間以内' },
          { hours: calculatedElapsedHours, label: `現在(${calculatedElapsedHours}時間経過)` }
        );
      } else if (calculatedElapsedHours <= 24) {
        dynamicTimeFrames.push(
          { hours: 6, label: '6時間以内' },
          { hours: 12, label: '12時間以内' },
          { hours: calculatedElapsedHours, label: `現在(${calculatedElapsedHours}時間経過)` }
        );
      } else {
        dynamicTimeFrames.push(
          { hours: 12, label: '12時間以内' },
          { hours: 24, label: '24時間以内' },
          { hours: Math.min(calculatedElapsedHours, 72), label: `現在(${Math.min(calculatedElapsedHours, 72)}時間経過)` }
        );
      }
      
      const predictor = new BehaviorPredictor(petProfile, foundLocation, homeLocation);
      const result = await predictor.predictSearchArea(dynamicTimeFrames);
      
      setPredictionResult(result);
      
      // Center map on the search area
      if (map) {
        // 検索エリアの中心を計算
        let bounds = new window.google.maps.LatLngBounds();
        bounds.extend(lastSeenLocation);
        
        if (foundLocation) {
          bounds.extend(foundLocation);
        }
        
        if (homeLocation && homeLocation !== lastSeenLocation) {
          bounds.extend(homeLocation);
        }
        
        // 予測エリアも含める
        if (result.searchZones.length > 0) {
          const firstZone = result.searchZones[0];
          firstZone.areas.forEach(area => {
            const ne = {
              lat: area.center.lat + (area.radius / 111),
              lng: area.center.lng + (area.radius / (111 * Math.cos(area.center.lat * Math.PI / 180)))
            };
            const sw = {
              lat: area.center.lat - (area.radius / 111),
              lng: area.center.lng - (area.radius / (111 * Math.cos(area.center.lat * Math.PI / 180)))
            };
            bounds.extend(ne);
            bounds.extend(sw);
          });
        }
        
        map.fitBounds(bounds);
        
        // ズームレベルの調整
        const listener = map.addListener('idle', () => {
          if (map.getZoom() > 15) {
            map.setZoom(15);
          }
          window.google.maps.event.removeListener(listener);
        });
      }
    } catch (error) {
      console.error('Prediction error:', error);
      alert('予測中にエラーが発生しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasLostPets = userLostPets.length > 0;

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
    <Box sx={{ height: '100vh', display: 'flex', position: 'relative' }}>
      {/* Map Container - Left Side Full Height */}
      <Box sx={{ 
        position: 'relative', 
        flex: '1 1 70%',
        minWidth: '60%',
        height: '100%' 
      }}>
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
        
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        
        
        {/* Map Legend - Smaller and Translucent */}
        {!isLoading && !error && (
          <Paper sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            p: 1.5,
            maxWidth: 200,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(5px)'
          }}>
            <Typography variant="caption" fontWeight="bold" gutterBottom>
              凡例
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ 
                  width: 16, 
                  height: 16, 
                  bgcolor: '#4CAF50',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Typography variant="caption" sx={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>✓</Typography>
                </Box>
                <Typography variant="caption">マッチ済みペット</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PetsIcon sx={{ fontSize: 16, color: '#ff5722' }} />
                <Typography variant="caption">あなたの迷子ペット</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PetsIcon sx={{ fontSize: 16, color: '#f44336', opacity: 0.6 }} />
                <Typography variant="caption">他の迷子ペット</Typography>
              </Box>
              {predictionResult && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 2, bgcolor: '#2196F3' }} />
                    <Typography variant="caption">追跡経路</Typography>
                  </Box>
                  {showHeatmap && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, background: 'linear-gradient(90deg, #0000FF, #FF0000)' }} />
                      <Typography variant="caption">移動確率</Typography>
                    </Box>
                  )}
                  {showDangerZones && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, bgcolor: '#FF0000', opacity: 0.3 }} />
                      <Typography variant="caption">危険エリア</Typography>
                    </Box>
                  )}
                </>
              )}
            </Stack>
          </Paper>
        )}
      </Box>

      {/* Settings Panel - Right Side */}
      <Paper sx={{ 
        flex: '0 0 30%',
        maxWidth: '40%',
        minWidth: '350px',
        height: '100%',
        overflow: 'auto',
        p: 3,
        borderLeft: 2,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {/* Header with Pet Selection */}
        <Box>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, fontWeight: 'bold' }}>
            <AIIcon color="primary" />
            ペット行動予測システム
          </Typography>
          
          {/* マッチング結果ボタン（シンプル版） */}
          <Button
            variant="outlined"
            fullWidth
            onClick={() => setShowMatchingModal(true)}
            startIcon={<MatchingIcon />}
            sx={{ 
              mb: 2,
              py: 1,
            }}
          >
            マッチング結果
          </Button>
          
          {/* Pet Selection at Top */}
          {hasLostPets && (
            <Paper elevation={3} sx={{ p: 2, bgcolor: 'primary.50', border: '2px solid', borderColor: 'primary.main' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                🔍 捜索対象のペットを選択
              </Typography>
              <FormControl size="medium" fullWidth>
                <InputLabel>迷子のペット</InputLabel>
                <Select
                  value={selectedPetId}
                  onChange={handlePetSelection}
                  label="迷子のペット"
                  sx={{ bgcolor: 'background.paper' }}
                >
                  {userLostPets.map((pet) => (
                    <MenuItem key={pet.id} value={pet.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: pet.type?.toLowerCase() === '犬' || pet.type?.toLowerCase() === 'dog' ? 'orange.300' : 'purple.300',
                            border: '2px solid',
                            borderColor: pet.id === selectedPetId ? 'primary.main' : 'transparent'
                          }}
                        >
                          <PetsIcon sx={{ fontSize: 20 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: pet.id === selectedPetId ? 'bold' : 'normal' }}>
                            {pet.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {pet.type === 'dog' || pet.type === '犬' ? '犬' : '猫'} • {pet.breed || '品種不明'}
                          </Typography>
                        </Box>
                        {pet.id === selectedPetId && (
                          <Chip 
                            label="選択中" 
                            size="small" 
                            color="primary" 
                            sx={{ ml: 'auto' }}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Selected Pet Details */}
              {selectedPet && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>最終目撃:</strong> {selectedPet.lastSeen?.location || '不明'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>日時:</strong> {selectedPet.lastSeen?.date} {selectedPet.lastSeen?.time || '不明'}
                    </Typography>
                    {selectedPet.personality && selectedPet.personality.length > 0 && (
                      <Typography variant="body2">
                        <strong>性格:</strong> {selectedPet.personality.join('、')}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}
            </Paper>
          )}
        </Box>

        {!hasLostPets ? (
          <Alert severity="info" icon={<WarningIcon />}>
            <Typography variant="body2">
              行動予測機能を使用するには、まず迷子のペットを登録してください。
            </Typography>
          </Alert>
        ) : (
          <>
            {/* Analysis Settings */}
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology fontSize="small" />
                分析設定
              </Typography>

              {/* Elapsed Time Display */}
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TimeIcon fontSize="small" />
                  経過時間
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.paper' }}>
                  <Typography variant="body1" fontWeight="bold" color="error">
                    {selectedPet && selectedPet.lastSeen?.date && selectedPet.lastSeen?.time ? 
                      (() => {
                        const lostDate = new Date(`${selectedPet.lastSeen.date} ${selectedPet.lastSeen.time}`);
                        const now = new Date();
                        const elapsedMs = now.getTime() - lostDate.getTime();
                        const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
                        const elapsedMinutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
                        
                        if (elapsedHours >= 24) {
                          const days = Math.floor(elapsedHours / 24);
                          const hours = elapsedHours % 24;
                          return `${days}日 ${hours}時間 ${elapsedMinutes}分経過`;
                        } else if (elapsedHours > 0) {
                          return `${elapsedHours}時間 ${elapsedMinutes}分経過`;
                        } else {
                          return `${elapsedMinutes}分経過`;
                        }
                      })()
                      : '時間情報なし'
                    }
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedPet?.lastSeen?.date} {selectedPet?.lastSeen?.time} から
                  </Typography>
                </Paper>
              </Box>

              {/* Visualization Settings */}
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <VisibilityIcon fontSize="small" />
                  マップ表示オプション
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showHeatmap}
                        onChange={(e) => setShowHeatmap(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="移動確率ヒートマップ"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showDangerZones}
                        onChange={(e) => setShowDangerZones(e.target.checked)}
                        color="error"
                      />
                    }
                    label="危険エリア表示"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showPointsOfInterest}
                        onChange={(e) => setShowPointsOfInterest(e.target.checked)}
                        color="success"
                      />
                    }
                    label="注目ポイント表示"
                  />
                </Paper>
              </Box>

              {/* Analyze Button */}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !selectedPet}
                  startIcon={<LocationIcon />}
                  sx={{ 
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                  }}
                >
                  {isAnalyzing ? '行動パターン分析中...' : 'AI予測を開始'}
                </Button>
                
              </Box>
            </Stack>

            {isAnalyzing && <LinearProgress sx={{ mt: 2 }} />}

            {/* Prediction Results */}
            {predictionResult && (
              <Box sx={{ mt: 'auto', pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  🎯 予測結果
                </Typography>
                <Paper elevation={2} sx={{ p: 2, bgcolor: 'success.50' }}>
                  <Typography variant="subtitle2" gutterBottom>推奨捜索戦略</Typography>
                  <Stack spacing={1}>
                    {predictionResult.recommendations.slice(0, 3).map((rec, index) => (
                      <Chip 
                        key={index} 
                        label={rec} 
                        color="primary" 
                        variant="filled"
                        sx={{ justifyContent: 'flex-start' }}
                      />
                    ))}
                  </Stack>
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={predictionResult.confidenceScore * 100} 
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 50 }}>
                      {(predictionResult.confidenceScore * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    AI信頼度スコア
                  </Typography>
                </Paper>
              </Box>
            )}
          </>
        )}
      </Paper>
      
      {/* マッチング結果モーダル */}
      <Dialog
        open={showMatchingModal}
        onClose={() => setShowMatchingModal(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
        <DialogContent sx={{ p: 0, overflow: 'auto' }}>
          <PetMatchingCard />
        </DialogContent>
      </Dialog>
    </Box>
  );
}