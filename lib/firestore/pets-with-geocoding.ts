import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PetInfo } from '@/types/pet';
import { GeocodingService } from '@/lib/services/geocoding-service';

const PETS_COLLECTION = 'pets';

export async function createPetWithGeocoding(petData: Omit<PetInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const geocodingService = GeocodingService.getInstance();
    const enhancedPetData = { ...petData };
    
    // 最後に目撃された場所の座標を取得
    if (petData.lastSeen?.location) {
      const lastSeenCoords = await geocodingService.estimateLocation(petData.lastSeen.location);
      if (lastSeenCoords) {
        enhancedPetData.lastSeenLocation = lastSeenCoords;
      }
    }
    
    // 自宅の座標を取得
    if (petData.contactInfo?.address) {
      const homeCoords = await geocodingService.estimateLocation(petData.contactInfo.address);
      if (homeCoords) {
        enhancedPetData.homeLocation = homeCoords;
      }
    }
    
    const docRef = await addDoc(collection(db, PETS_COLLECTION), {
      ...enhancedPetData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating pet with geocoding:', error);
    throw error;
  }
}

export async function updatePetWithGeocoding(petId: string, updates: Partial<PetInfo>): Promise<void> {
  try {
    const geocodingService = GeocodingService.getInstance();
    const enhancedUpdates = { ...updates };
    
    // 最後に目撃された場所が更新された場合、座標も更新
    if (updates.lastSeen?.location) {
      const lastSeenCoords = await geocodingService.estimateLocation(updates.lastSeen.location);
      if (lastSeenCoords) {
        enhancedUpdates.lastSeenLocation = lastSeenCoords;
      }
    }
    
    // 自宅住所が更新された場合、座標も更新
    if (updates.contactInfo?.address) {
      const homeCoords = await geocodingService.estimateLocation(updates.contactInfo.address);
      if (homeCoords) {
        enhancedUpdates.homeLocation = homeCoords;
      }
    }
    
    // ステータスが'found'または'reunited'に変更された場合
    if (updates.status === 'found' || updates.status === 'reunited') {
      // 発見場所の座標を保存（実装に応じて調整）
      if (updates.lastSeen?.location) {
        const foundCoords = await geocodingService.estimateLocation(updates.lastSeen.location);
        if (foundCoords) {
          enhancedUpdates.foundLocation = foundCoords;
        }
      }
    }
    
    const petRef = doc(db, PETS_COLLECTION, petId);
    await updateDoc(petRef, {
      ...enhancedUpdates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating pet with geocoding:', error);
    throw error;
  }
}

// バッチ処理で既存のペットデータに座標を追加
export async function geocodeExistingPets(pets: PetInfo[]): Promise<void> {
  const geocodingService = GeocodingService.getInstance();
  
  for (const pet of pets) {
    if (!pet.id) continue;
    
    const updates: Partial<PetInfo> = {};
    let needsUpdate = false;
    
    // lastSeenLocationが未設定で、lastSeen.locationがある場合
    if (!pet.lastSeenLocation && pet.lastSeen?.location) {
      const coords = await geocodingService.estimateLocation(pet.lastSeen.location);
      if (coords) {
        updates.lastSeenLocation = coords;
        needsUpdate = true;
      }
    }
    
    // homeLocationが未設定で、contactInfo.addressがある場合
    if (!pet.homeLocation && pet.contactInfo?.address) {
      const coords = await geocodingService.estimateLocation(pet.contactInfo.address);
      if (coords) {
        updates.homeLocation = coords;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      const petRef = doc(db, PETS_COLLECTION, pet.id);
      await updateDoc(petRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  }
}