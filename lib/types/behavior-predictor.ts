export interface PetProfile {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed?: string;
  age?: number;
  size: 'small' | 'medium' | 'large';
  personality: string[];
  lastSeenLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  lastSeenTime: Date;
  weatherCondition?: WeatherCondition;
}

export interface WeatherCondition {
  temperature: number;
  humidity: number;
  precipitation: boolean;
  windSpeed: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
}

export interface PredictionTimeFrame {
  hours: 1 | 3 | 6 | 12 | 24;
  label: string;
}

export interface BehaviorPattern {
  petType: 'dog' | 'cat';
  weatherInfluence: number;
  terrainPreference: TerrainType[];
  movementSpeed: number;
  hidingTendency: number;
  waterAttraction: number;
  foodSourceAttraction: number;
  humanInteractionTendency: number;
}

export type TerrainType = 
  | 'residential' 
  | 'commercial' 
  | 'park' 
  | 'forest' 
  | 'water' 
  | 'road' 
  | 'building';

export interface DangerZone {
  id: string;
  type: 'road' | 'highway' | 'railway' | 'water' | 'cliff' | 'construction';
  location: {
    lat: number;
    lng: number;
  };
  radius: number;
  dangerLevel: 'low' | 'medium' | 'high';
}

export interface PointOfInterest {
  id: string;
  type: 'food' | 'water' | 'shelter' | 'park' | 'vet' | 'petstore';
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  attractionScore: number;
}

export interface PredictionArea {
  center: {
    lat: number;
    lng: number;
  };
  radius: number;
  probability: number;
  timeFrame: PredictionTimeFrame;
}

export interface SearchZone {
  id: string;
  priority: 'high' | 'medium' | 'low';
  areas: PredictionArea[];
  dangerZones: DangerZone[];
  pointsOfInterest: PointOfInterest[];
  searchStrategy: string;
  estimatedSearchTime: number;
}

export interface HeatmapData {
  location: {
    lat: number;
    lng: number;
  };
  weight: number;
}

export interface PredictionResult {
  petProfile: PetProfile;
  searchZones: SearchZone[];
  heatmapData: HeatmapData[];
  recommendations: string[];
  confidenceScore: number;
  lastUpdated: Date;
}