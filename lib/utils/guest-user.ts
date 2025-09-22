export function generateGuestUserId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createGuestUser() {
  const guestId = generateGuestUserId();
  return {
    uid: guestId,
    email: `${guestId}@guest.local`,
    displayName: 'ゲストユーザー',
    isGuest: true,
    photoURL: null,
  };
}

export function isGuestUser(userId: string | undefined): boolean {
  if (!userId) return false;
  return userId.startsWith('guest_');
}