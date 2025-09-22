import { PetInfo } from '@/types/pet';
import { isGuestUser } from '@/lib/utils/guest-user';

const GUEST_PETS_KEY = 'guestPets';
const GUEST_MATCHES_KEY = 'guestMatches';

export interface GuestPet extends Omit<PetInfo, 'id'> {
  localId: string;
}

export interface GuestMatch {
  id: string;
  lostPetId: string;
  foundPetId: string;
  matchScore: number;
  createdAt: Date;
  status: 'pending' | 'confirmed' | 'rejected';
}

// ペット関連のゲストストレージ操作
export function getGuestPets(userId: string): GuestPet[] {
  if (!isGuestUser(userId)) return [];
  
  try {
    const data = localStorage.getItem(`${GUEST_PETS_KEY}_${userId}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading guest pets:', e);
    return [];
  }
}

export function saveGuestPet(userId: string, pet: Omit<GuestPet, 'localId'>): string {
  if (!isGuestUser(userId)) throw new Error('Not a guest user');
  
  const pets = getGuestPets(userId);
  const newPet: GuestPet = {
    ...pet,
    localId: `pet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  pets.push(newPet);
  localStorage.setItem(`${GUEST_PETS_KEY}_${userId}`, JSON.stringify(pets));
  return newPet.localId;
}

export function updateGuestPet(userId: string, petId: string, updates: Partial<GuestPet>): void {
  if (!isGuestUser(userId)) throw new Error('Not a guest user');
  
  const pets = getGuestPets(userId);
  const index = pets.findIndex(p => p.localId === petId);
  
  if (index === -1) throw new Error('Pet not found');
  
  pets[index] = {
    ...pets[index],
    ...updates,
    updatedAt: new Date()
  };
  
  localStorage.setItem(`${GUEST_PETS_KEY}_${userId}`, JSON.stringify(pets));
}

export function deleteGuestPet(userId: string, petId: string): void {
  if (!isGuestUser(userId)) throw new Error('Not a guest user');
  
  const pets = getGuestPets(userId);
  const filtered = pets.filter(p => p.localId !== petId);
  localStorage.setItem(`${GUEST_PETS_KEY}_${userId}`, JSON.stringify(filtered));
}

// マッチング関連のゲストストレージ操作
export function getGuestMatches(userId: string): GuestMatch[] {
  if (!isGuestUser(userId)) return [];
  
  try {
    const data = localStorage.getItem(`${GUEST_MATCHES_KEY}_${userId}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading guest matches:', e);
    return [];
  }
}

export function saveGuestMatch(userId: string, match: Omit<GuestMatch, 'id'>): string {
  if (!isGuestUser(userId)) throw new Error('Not a guest user');
  
  const matches = getGuestMatches(userId);
  const newMatch: GuestMatch = {
    ...match,
    id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  };
  
  matches.push(newMatch);
  localStorage.setItem(`${GUEST_MATCHES_KEY}_${userId}`, JSON.stringify(matches));
  return newMatch.id;
}

export function updateGuestMatch(userId: string, matchId: string, updates: Partial<GuestMatch>): void {
  if (!isGuestUser(userId)) throw new Error('Not a guest user');
  
  const matches = getGuestMatches(userId);
  const index = matches.findIndex(m => m.id === matchId);
  
  if (index === -1) throw new Error('Match not found');
  
  matches[index] = {
    ...matches[index],
    ...updates
  };
  
  localStorage.setItem(`${GUEST_MATCHES_KEY}_${userId}`, JSON.stringify(matches));
}