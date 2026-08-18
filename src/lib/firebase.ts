import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

let appInstance: FirebaseApp | null = null;
try {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (err) {
  console.warn('Firebase initialization error:', err);
}

export const app = appInstance;

let firestoreInstance: Firestore | null = null;
let firestoreAttempted = false;

/**
 * Lazy and safe getter for Firestore database instance.
 * Prevents top-level crashes if Firestore is not provisioned or unavailable.
 */
export const getDb = (): Firestore | null => {
  if (firestoreAttempted) return firestoreInstance;
  firestoreAttempted = true;

  if (!appInstance) return null;

  try {
    if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
      firestoreInstance = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
    } else {
      firestoreInstance = getFirestore(appInstance);
    }
  } catch (err) {
    console.warn('Firestore service is not available (falling back gracefully):', err);
    firestoreInstance = null;
  }

  return firestoreInstance;
};

// Safe fallback db export
export const db = getDb();

let analyticsInstance: Analytics | null = null;

export const initAnalytics = async (): Promise<Analytics | null> => {
  if (typeof window === 'undefined' || !appInstance) return null;
  if (analyticsInstance) return analyticsInstance;
  try {
    const supported = await isAnalyticsSupported();
    if (supported) {
      analyticsInstance = getAnalytics(appInstance);
      return analyticsInstance;
    }
  } catch (err) {
    console.warn('Firebase Analytics not supported in this environment:', err);
  }
  return null;
};
