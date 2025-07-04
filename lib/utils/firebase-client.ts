import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { getFunctions, Functions } from 'firebase/functions';

declare global {
  interface Window {
    firebaseApp?: FirebaseApp;
  }
}

let firebaseApp: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Database | null = null;
let functionsInstance: Functions | null = null;
let isInitializing = false;
let isInitialized = false;
let initPromise: Promise<FirebaseApp> | null = null;

// Server-side Firebase config
export function getServerFirebaseConfig() {
  if (typeof window !== 'undefined') {
    throw new Error('This function should only be called server-side');
  }

  // These environment variables should be set in your deployment environment
  const config = {
    credential: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) : 
      undefined,
    databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };

  // Log warning but don't throw error in production
  if (!config.credential) {
    console.warn('Firebase service account key is missing. Some server-side Firebase features may not work.');
    
    if (process.env.NODE_ENV !== 'production') {
      throw new Error('Missing Firebase service account key for server');
    }
  }
  
  if (!config.databaseURL) {
    console.warn('Firebase database URL is missing. Some server-side Firebase features may not work.');
    
    if (process.env.NODE_ENV !== 'production') {
      throw new Error('Missing Firebase database URL for server');
    }
  }

  return config;
}

export async function initializeFirebaseClient() {
  // 이미 초기화가 완료된 경우
  if (firebaseApp && isInitialized) {
    return firebaseApp;
  }
  
  // 이미 초기화 중인 경우, 기존 Promise 반환
  if (isInitializing && initPromise) {
    return initPromise;
  }

  // 새로운 초기화 시작
  isInitializing = true;
  
  initPromise = new Promise<FirebaseApp>((resolve, reject) => {
    try {
      console.log('Firebase 클라이언트 초기화 시작...');
      
      // Client-side Firebase config
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      // Validate required config but don't throw errors in production
      if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
        console.error('Missing required Firebase configuration');
        if (process.env.NODE_ENV !== 'production') {
          throw new Error('Missing required Firebase configuration');
        }
      }

      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      firebaseApp = app;
      authInstance = getAuth(app);
      dbInstance = getDatabase(app);
      functionsInstance = getFunctions(app);
      
      // 초기화 완료 후 일정 시간 대기 (네트워크 연결 안정화 위해)
      setTimeout(() => {
        console.log('Firebase 클라이언트 초기화 완료');
        isInitialized = true;
        isInitializing = false;
        resolve(app);
      }, 1000);
    } catch (error) {
      console.error('Firebase 초기화 실패:', error);
      isInitializing = false;
      reject(error);
    }
  });
  
  return initPromise;
}

// Helper functions to get Firebase services
export async function getFirebaseAuth(): Promise<Auth> {
  try {
    await initializeFirebaseClient();
    if (!authInstance) {
      console.error('Firebase Auth not initialized');
      if (process.env.NODE_ENV !== 'production') {
        throw new Error('Firebase Auth not initialized');
      }
    }
    return authInstance as Auth;
  } catch (error) {
    console.error('Failed to get Firebase Auth:', error);
    throw error;
  }
}

export async function getFirebaseDatabase(): Promise<Database> {
  try {
    // 최대 3번 재시도
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        await initializeFirebaseClient();
        
        if (!dbInstance) {
          console.error('Firebase Database not initialized');
          throw new Error('Firebase Database not initialized');
        }
        
        return dbInstance as Database;
      } catch (error) {
        retries++;
        console.warn(`Firebase Database 초기화 재시도 중 (${retries}/${maxRetries})...`);
        
        if (retries >= maxRetries) {
          throw error;
        }
        
        // 재시도 전 대기 (점진적으로 증가)
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
    
    throw new Error('Firebase Database initialization failed after multiple retries');
  } catch (error) {
    console.error('Failed to get Firebase Database:', error);
    throw error;
  }
}

export async function getFirebaseFunctions(): Promise<Functions> {
  try {
    await initializeFirebaseClient();
    if (!functionsInstance) {
      console.error('Firebase Functions not initialized');
      if (process.env.NODE_ENV !== 'production') {
        throw new Error('Firebase Functions not initialized');
      }
    }
    return functionsInstance as Functions;
  } catch (error) {
    console.error('Failed to get Firebase Functions:', error);
    throw error;
  }
}

// Firebase 초기화 상태 확인 함수 추가
export function isFirebaseInitialized(): boolean {
  return isInitialized;
}

// Initialize Firebase when this module is imported (for client-side usage)
if (typeof window !== 'undefined') {
  initializeFirebaseClient().catch(error => {
    console.error('Failed to initialize Firebase client:', error);
  });
}
