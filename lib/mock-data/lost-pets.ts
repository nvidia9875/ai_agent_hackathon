export interface LostPet {
  id: string;
  userId: string;
  name: string;
  species: 'dog' | 'cat';
  breed?: string;
  size: 'small' | 'medium' | 'large';
  age?: number;
  colors: string[];
  personality: string[];
  microchipId?: string;
  lastSeenLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  lastSeenTime: Date;
  status: 'lost' | 'found' | 'reunited';
  description?: string;
  photoUrls?: string[];
  contactInfo: {
    name: string;
    phone?: string;
    email?: string;
  };
}

// Mock data for lost pets
export const mockLostPets: LostPet[] = [
  {
    id: 'pet-001',
    userId: 'user-001',
    name: 'マロン',
    species: 'dog',
    breed: '柴犬',
    size: 'medium',
    age: 3,
    colors: ['茶色', '白'],
    personality: ['人懐っこい', '活発', '遊び好き'],
    lastSeenLocation: {
      lat: 35.6762,
      lng: 139.6503,
      address: '東京都渋谷区'
    },
    lastSeenTime: new Date(Date.now() - 3600000 * 4), // 4 hours ago
    status: 'lost',
    description: '赤い首輪をしています',
    contactInfo: {
      name: '田中太郎',
      phone: '090-1234-5678'
    }
  },
  {
    id: 'pet-002',
    userId: 'user-001',
    name: 'ミケ',
    species: 'cat',
    breed: '三毛猫',
    size: 'small',
    age: 2,
    colors: ['白', '茶色', '黒'],
    personality: ['臆病', '警戒心が強い', '独立心が強い'],
    lastSeenLocation: {
      lat: 35.6854,
      lng: 139.7531,
      address: '東京都新宿区'
    },
    lastSeenTime: new Date(Date.now() - 3600000 * 8), // 8 hours ago
    status: 'lost',
    description: '青い首輪、鈴付き',
    contactInfo: {
      name: '田中太郎',
      phone: '090-1234-5678'
    }
  },
  {
    id: 'pet-003',
    userId: 'user-002',
    name: 'ポチ',
    species: 'dog',
    breed: 'ゴールデンレトリーバー',
    size: 'large',
    age: 5,
    colors: ['金色'],
    personality: ['人懐っこい', '忠実', '社交的', '活発'],
    lastSeenLocation: {
      lat: 35.6586,
      lng: 139.7454,
      address: '東京都港区'
    },
    lastSeenTime: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    status: 'lost',
    description: 'マイクロチップ装着済み',
    microchipId: '392148000123456',
    contactInfo: {
      name: '佐藤花子',
      phone: '080-9876-5432'
    }
  },
  {
    id: 'pet-004',
    userId: 'user-003',
    name: 'タマ',
    species: 'cat',
    breed: 'アメリカンショートヘア',
    size: 'medium',
    age: 4,
    colors: ['シルバー', '黒'],
    personality: ['好奇心旺盛', '甘えん坊', '遊び好き'],
    lastSeenLocation: {
      lat: 35.6674,
      lng: 139.7292,
      address: '東京都目黒区'
    },
    lastSeenTime: new Date(Date.now() - 3600000 * 12), // 12 hours ago
    status: 'lost',
    description: 'ピンクの首輪',
    contactInfo: {
      name: '鈴木一郎',
      phone: '070-1111-2222'
    }
  }
];

// Helper function to get lost pets by user ID
export function getLostPetsByUserId(userId: string): LostPet[] {
  return mockLostPets.filter(pet => pet.userId === userId && pet.status === 'lost');
}

// Helper function to get all lost pets
export function getAllLostPets(): LostPet[] {
  return mockLostPets.filter(pet => pet.status === 'lost');
}

// Helper function to get pet by ID
export function getLostPetById(petId: string): LostPet | undefined {
  return mockLostPets.find(pet => pet.id === petId);
}