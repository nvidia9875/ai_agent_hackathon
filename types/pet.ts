export interface PetInfo {
  id?: string;
  userId: string;
  name: string;
  type: string;
  breed: string;
  age: string;
  size: string;
  colors: string[];
  specialFeatures: string;
  microchipId?: string;
  images: string[];
  lastSeen: {
    location: string;
    date: string;
    time: string;
    circumstances: string;
  };
  contactInfo: {
    name: string;
    phone: string;
    email: string;
    alternativeContact?: string;
  };
  status: 'missing' | 'found' | 'reunited';
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
  size: string;
  color: string;
  features: string;
  hasCollar: boolean;
  collarDescription?: string;
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