export interface PetInfo {
  id?: string;
  userId: string;
  name: string;
  type: string;
  breed: string;
  age: string;
  size: string;
  weight?: number; // 体重（kg）
  colors: string[];
  personality?: string[];
  specialFeatures: string;
  microchipId?: string;
  hasCollar?: boolean;
  collarColor?: string;
  images: string[];
  lastSeen: {
    location: string;
    date: string;
    time: string;
    circumstances: string;
  };
  lastSeenLocation?: { lat: number; lng: number }; // 座標情報（キャッシュ用）
  homeLocation?: { lat: number; lng: number }; // 自宅の座標
  foundLocation?: { lat: number; lng: number }; // 発見場所の座標
  contactInfo: {
    name: string;
    phone: string;
    email: string;
    alternativeContact?: string;
    address?: string; // 自宅住所
  };
  status: 'missing' | 'found' | 'reunited';
  hasMatch?: boolean; // マッチング有無
  matchScore?: number; // マッチングスコア
  matchedPetId?: string; // マッチした発見ペットのID
  matchDetails?: any; // マッチング詳細情報
  foundAddress?: string; // 発見場所の住所（マッチング時）
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoundPetInfo {
  id?: string;
  petType: string;
  petBreed?: string;
  size: string;
  weight?: number; // 体重（kg）
  color: string;
  features: string;
  hasCollar: boolean;
  collarDescription?: string;
  microchipNumber?: string;
  foundDate: string;
  foundTime: string;
  foundAddress: string;
  foundLocationDetails: string;
  currentLocation: string;
  petCondition: string;
  finderName: string;
  finderPhone: string;
  finderEmail: string;
  canKeepTemporarily: boolean;
  keepUntilDate?: string;
  additionalInfo: string;
  imageUrls: string[];
  status: 'found' | 'matched' | 'claimed';
  createdAt: Date;
  updatedAt: Date;
}