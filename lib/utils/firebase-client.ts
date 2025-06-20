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
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  };

  // Validate required config
  if (!config.credential || !config.databaseURL) {
    throw new Error('Missing required Firebase configuration for server');
  }

  return config;
}

export async function initializeFirebaseClient() {
  // Return existing app if already initialized
  if (firebaseApp) {
    return firebaseApp;
  }

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

  // Validate required config
  if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
    throw new Error('Missing required Firebase configuration');
  }

  firebaseApp = initializeApp(firebaseConfig);
  
  // For debugging and development
  if (process.env.NODE_ENV === 'development') {
    window.firebaseApp = firebaseApp;
  }

  return firebaseApp;
}

// Helper functions to get Firebase services
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = firebaseApp || (getApps().length > 0 ? getApp() : null);
    if (!app) {
      throw new Error('Firebase app not initialized. Call initializeFirebaseClient() first.');
    }
    authInstance = getAuth(app);
  }
  return authInstance;
}

export function getFirebaseDatabase(): Database {
  if (!dbInstance) {
    const app = firebaseApp || (getApps().length > 0 ? getApp() : null);
    if (!app) {
      throw new Error('Firebase app not initialized. Call initializeFirebaseClient() first.');
    }
    dbInstance = getDatabase(app);
  }
  return dbInstance;
}

export function getFirebaseFunctions(): Functions {
  if (!functionsInstance) {
    const app = firebaseApp || (getApps().length > 0 ? getApp() : null);
    if (!app) {
      throw new Error('Firebase app not initialized. Call initializeFirebaseClient() first.');
    }
    functionsInstance = getFunctions(app);
  }
  return functionsInstance;
}

// Initialize Firebase when this module is imported (for client-side usage)
if (typeof window !== 'undefined') {
  initializeFirebaseClient().catch(error => {
    console.error('Failed to initialize Firebase client:', error);
  });
}
