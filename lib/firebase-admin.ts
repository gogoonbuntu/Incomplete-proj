import * as admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';

// Function to initialize Firebase Admin SDK with service account
function initializeAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  try {
    // Get service account from environment variables
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let serviceAccount: admin.ServiceAccount;

    // Handle base64-encoded service account
    if (serviceAccountEnv && serviceAccountEnv.includes('{')) {
      try {
        // Try to parse as JSON directly
        serviceAccount = JSON.parse(serviceAccountEnv);
      } catch (e) {
        console.error('Failed to parse service account JSON:', e);
        // If we can't initialize properly, return early
        return null;
      }
    } else if (serviceAccountEnv) {
      try {
        // Try to decode base64
        const decoded = Buffer.from(serviceAccountEnv, 'base64').toString();
        serviceAccount = JSON.parse(decoded);
      } catch (e) {
        console.error('Failed to decode and parse service account:', e);
        // If we can't initialize properly, return early
        return null;
      }
    } else {
      console.warn('No Firebase service account provided. Some features may not work.');
      // Continue without service account for limited functionality
      serviceAccount = {} as admin.ServiceAccount;
    }

    // Initialize the app
    const initializedApp = admin.initializeApp({
      credential: serviceAccountEnv 
        ? admin.credential.cert(serviceAccount)
        : admin.credential.applicationDefault(),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    console.log('Firebase Admin SDK initialized successfully');
    return initializedApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    // Return null to indicate failure
    return null;
  }
}

// Initialize or get Firebase Admin app
const adminApp = initializeAdmin();

// Export database and storage if app was initialized
export const db = adminApp ? getDatabase(adminApp) : null;
export const storage = adminApp ? getStorage(adminApp) : null;

// Export the admin SDK for other uses
export { admin };

// Export a function to check if admin is initialized
export const isAdminInitialized = () => !!adminApp;
