import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

export function getAdminApp(): App {
  if (!adminApp) {
    if (getApps().length === 0) {
      // 環境変数から認証情報を取得
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
          'Firebase Admin credentials are missing. Please check your environment variables:\n' +
          '- FIREBASE_PROJECT_ID\n' +
          '- FIREBASE_CLIENT_EMAIL\n' +
          '- FIREBASE_PRIVATE_KEY'
        );
      }

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      adminApp = getApps()[0];
    }
  }
  return adminApp;
}

export function getAdminFirestore(): Firestore {
  if (!adminDb) {
    const app = getAdminApp();
    adminDb = getFirestore(app);
  }
  return adminDb;
}

// undefined値を削除するヘルパー関数
export function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item));
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  const cleanObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleanObj[key] = removeUndefinedFields(value);
    }
  }
  
  return cleanObj;
}