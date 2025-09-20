import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PetInfo } from '@/types/pet';

const PETS_COLLECTION = 'pets';

export async function createPet(petData: Omit<PetInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, PETS_COLLECTION), {
      ...petData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating pet:', error);
    throw error;
  }
}

export async function updatePet(petId: string, updates: Partial<PetInfo>): Promise<void> {
  try {
    const petRef = doc(db, PETS_COLLECTION, petId);
    await updateDoc(petRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating pet:', error);
    throw error;
  }
}

export async function deletePet(petId: string): Promise<void> {
  try {
    const petRef = doc(db, PETS_COLLECTION, petId);
    await deleteDoc(petRef);
  } catch (error) {
    console.error('Error deleting pet:', error);
    throw error;
  }
}

export async function getPet(petId: string): Promise<PetInfo | null> {
  try {
    const petRef = doc(db, PETS_COLLECTION, petId);
    const petSnap = await getDoc(petRef);
    
    if (petSnap.exists()) {
      return { id: petSnap.id, ...petSnap.data() } as PetInfo;
    }
    return null;
  } catch (error) {
    console.error('Error getting pet:', error);
    throw error;
  }
}

export async function getUserPets(userId: string): Promise<PetInfo[]> {
  try {
    const q = query(
      collection(db, PETS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const pets: PetInfo[] = [];
    
    querySnapshot.forEach((doc) => {
      pets.push({ id: doc.id, ...doc.data() } as PetInfo);
    });
    
    return pets;
  } catch (error) {
    console.error('Error getting user pets:', error);
    throw error;
  }
}

export async function getAllMissingPets(): Promise<PetInfo[]> {
  try {
    const q = query(
      collection(db, PETS_COLLECTION),
      where('status', '==', 'missing'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const pets: PetInfo[] = [];
    
    querySnapshot.forEach((doc) => {
      pets.push({ id: doc.id, ...doc.data() } as PetInfo);
    });
    
    return pets;
  } catch (error) {
    console.error('Error getting missing pets:', error);
    throw error;
  }
}

export async function getMatchedPets(): Promise<PetInfo[]> {
  try {
    // マッチング済みのペットを取得
    const q = query(
      collection(db, PETS_COLLECTION),
      where('status', '==', 'missing'),
      where('hasMatch', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const pets: PetInfo[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const pet = { 
        id: docSnap.id, 
        ...data,
        matchScore: data.matchScore || 0,
        matchedPetId: data.matchedPetId || null,
        matchDetails: data.matchDetails || null
      } as PetInfo;
      
      // マッチした発見ペットの情報も取得して位置情報を追加
      if (pet.matchedPetId) {
        try {
          const foundPetRef = doc(db, 'foundPets', pet.matchedPetId);
          const foundPetSnap = await getDoc(foundPetRef);
          if (foundPetSnap.exists()) {
            const foundPetData = foundPetSnap.data();
            // 発見場所の住所を保存
            pet.foundLocation = foundPetData.foundLocation || null;
            pet.foundAddress = foundPetData.foundAddress || null;
          }
        } catch (err) {
          console.error('Error fetching matched found pet:', err);
        }
      }
      
      pets.push(pet);
    }
    
    return pets;
  } catch (error) {
    console.error('Error getting matched pets:', error);
    // フィールドが存在しない場合は全ペットから手動でフィルタ
    try {
      const allMissing = await getAllMissingPets();
      return allMissing.filter(pet => pet.hasMatch === true);
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return [];
    }
  }
}