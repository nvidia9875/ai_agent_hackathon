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