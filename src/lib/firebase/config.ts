/**
 * ELORA - Configuration Firebase, Auth, Firestore et Firebase AI Logic
 * Conforme aux spécifications Firebase 13.x et Firebase AI Logic
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai';

function readEnvVar(key: string, fallback: string): string {
  const viteVal =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env[key] as string | undefined)
      : undefined;
  const procVal =
    typeof globalThis !== 'undefined' &&
    (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env
      ? (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env[key]
      : undefined;
  return viteVal || procVal || fallback;
}

export const firebaseConfig = {
  apiKey: readEnvVar('VITE_FIREBASE_API_KEY', 'AIzaSyDemoKeyForBuildHybridAIChallengeOnly1234'),
  authDomain: readEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'elora-hybrid-ai.firebaseapp.com'),
  projectId: readEnvVar('VITE_FIREBASE_PROJECT_ID', 'elora-hybrid-ai'),
  storageBucket: readEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'elora-hybrid-ai.firebasestorage.app'),
  messagingSenderId: readEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', '123456789012'),
  appId: readEnvVar('VITE_FIREBASE_APP_ID', '1:123456789012:web:abcdef1234567890'),
};

// Initialisation idempotente du singleton FirebaseApp
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

// Auth singleton
let authInstance: Auth | null = null;
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    getFirebaseAppCheck();
    authInstance = getAuth(app);
  }
  return authInstance;
}

// Firestore singleton
let firestoreInstance: Firestore | null = null;
export function getFirebaseFirestore(): Firestore {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    getFirebaseAppCheck();
    firestoreInstance = getFirestore(app);
  }
  return firestoreInstance;
}

export function isFirebaseConfigValid(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== 'AIzaSyDemoKeyForBuildHybridAIChallengeOnly1234' &&
      firebaseConfig.projectId &&
      firebaseConfig.appId &&
      firebaseConfig.appId !== '1:123456789012:web:abcdef1234567890'
  );
}

// App Check singleton (reCAPTCHA Enterprise + Debug Provider officiel en dev)
let appCheckInstance: AppCheck | null = null;
export function getFirebaseAppCheck(): AppCheck | null {
  if (typeof window === 'undefined') return null;
  if (appCheckInstance) return appCheckInstance;

  if (!isFirebaseConfigValid()) {
    return null;
  }

  const siteKey = readEnvVar('VITE_FIREBASE_APPCHECK_SITE_KEY', '').trim();
  if (!siteKey || siteKey.startsWith('votre_')) {
    // Aucune attestation simulée : si la clé de site reCAPTCHA Enterprise est absente, ne pas initialiser App Check.
    return null;
  }

  try {
    const app = getFirebaseApp();

    // Mécanisme officiel Firebase App Check Debug Provider en développement local.
    // Ne jamais hardcoder ni versionner le token de débogage.
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('[AppCheck] Initialisation impossible :', err instanceof Error ? err.message : String(err));
  }

  return appCheckInstance;
}

// Firebase AI Logic singleton
let aiInstance: AI | null = null;
export function getFirebaseAI(): AI {
  if (!aiInstance) {
    const app = getFirebaseApp();
    getFirebaseAppCheck();
    aiInstance = getAI(app, { backend: new GoogleAIBackend() });
  }
  return aiInstance;
}

// Firebase Storage singleton
let storageInstance: FirebaseStorage | null = null;
export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    const app = getFirebaseApp();
    getFirebaseAppCheck();
    storageInstance = getStorage(app);
  }
  return storageInstance;
}
