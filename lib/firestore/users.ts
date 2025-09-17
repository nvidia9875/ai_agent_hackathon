import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User } from '@/types/pet';

const USERS_COLLECTION = 'users';

export async function createOrUpdateUser(userId: string, userData: {
  email: string;
  displayName: string;
  photoURL?: string;
}): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      await setDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
}

export async function getUser(userId: string): Promise<User | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}