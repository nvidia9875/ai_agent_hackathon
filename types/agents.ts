// AIエージェント共通型定義

export interface AgentBase {
  id: string;
  name: string;
  status: 'idle' | 'processing' | 'error';
  lastActivity: Date;
}

export interface VisualAnalysisResult {
  petType: 'dog' | 'cat' | 'other';
  breed?: string;
  color: string[];
  size: 'small' | 'medium' | 'large';
  confidence: number;
  features: number[]; // 1024次元特徴ベクトル
  imageQuality: number;
  description: string;
}

export interface BehaviorPrediction {
  currentLocation: {
    lat: number;
    lng: number;
    confidence: number;
  };
  searchRadius: number;
  behaviorPattern: string;
  riskFactors: string[];
  recommendedActions: string[];
}

export interface SearchStrategy {
  priority: 'high' | 'medium' | 'low';
  assignedVolunteers: number;
  searchAreas: SearchArea[];
  estimatedDuration: number;
  successProbability: number;
}

export interface SearchArea {
  id: string;
  center: { lat: number; lng: number };
  radius: number;
  priority: number;
  assignedTo?: string;
}

export interface PetMatchResult {
  missingPetId: string;
  foundPetId: string;
  matchScore: number; // 0-100のマッチング率
  visualSimilarity: number; // 視覚的類似度
  locationProximity: number; // 場所の近さ
  timeDifference: number; // 日数差
  matchDetails: {
    type: boolean;
    size: boolean;
    color: string[]; // マッチした色
    features: string[]; // マッチした特徴
  };
  analysisResult: VisualAnalysisResult;
  confidence: number;
  recommendedAction: 'high_match' | 'possible_match' | 'low_match';
  createdAt: Date;
  exclusionReason?: string; // 除外理由
}