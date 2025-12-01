import * as admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';

// Function to initialize Firebase Admin SDK with service account
function initializeAdmin() {
  // Firebase Admin SDK가 이미 초기화되어 있으면 해당 앱 반환
  if (admin.apps.length > 0) {
    console.log('Firebase Admin SDK is already initialized');
    return admin.apps[0]!;
  }

  // Get service account from environment variables
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let serviceAccount: admin.ServiceAccount | undefined = undefined;

  try {
    // Handle base64-encoded service account
    if (serviceAccountEnv) {
      try {
        // Try to decode base64 first
        const decoded = Buffer.from(serviceAccountEnv, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decoded);
      } catch (parseError) {
        // If not base64, try parsing directly as JSON
        try {
          if (serviceAccountEnv.includes('{')) {
            serviceAccount = JSON.parse(serviceAccountEnv);
          }
        } catch (directParseError) {
          console.error('Failed to parse service account JSON:', directParseError);
        }
      }
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not provided, using application default credentials');
    }

    // Firebase 프로젝트 ID 확인
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    // 기본 설정으로 초기화 시도
    try {
      const initializedApp = admin.initializeApp({
        credential: serviceAccount 
          ? admin.credential.cert(serviceAccount)
          : admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
        projectId: projectId
      });

      console.log('Firebase Admin SDK initialized successfully');
      return initializedApp;
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error);
      
      // 실패 시 최소한의 설정으로 다시 시도
      try {
        const fallbackApp = admin.initializeApp({
          projectId: projectId
        }, 'fallback-admin-app');
        console.log('Firebase Admin SDK initialized with minimal config');
        return fallbackApp;
      } catch (fallbackError) {
        console.error('Failed to initialize even with minimal config:', fallbackError);
        // Return null to indicate failure
        return null;
      }
    }
  } catch (error) {
    console.error('Error in initializeAdmin function:', error);
    // Return null to indicate failure
    return null;
  }
}

// Initialize or get Firebase Admin app
const adminApp = initializeAdmin();

// Export Firestore database, Realtime database and storage if app was initialized
export const db = adminApp ? getFirestore(adminApp) : null;
export const rtdb = adminApp ? getDatabase(adminApp) : null;
export const storage = adminApp ? getStorage(adminApp) : null;

// Export the admin SDK for other uses
export { admin };

// Export a function to check if admin is initialized
export const isAdminInitialized = () => !!adminApp;
