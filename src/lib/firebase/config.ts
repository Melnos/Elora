/**
 * ELORA - Configuration Firebase, Auth, Firestore et Firebase AI Logic
 * Conforme aux spécifications Firebase 13.x et Firebase AI Logic
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { initializeAppCheck, CustomProvider, type AppCheck } from 'firebase/app-check';
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
    authInstance = getAuth(app);
  }
  return authInstance;
}

// Firestore singleton
let firestoreInstance: Firestore | null = null;
export function getFirebaseFirestore(): Firestore {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    firestoreInstance = getFirestore(app);
  }
  return firestoreInstance;
}

// App Check singleton
let appCheckInstance: AppCheck | null = null;
export function getFirebaseAppCheck(): AppCheck | null {
  if (typeof window === 'undefined') return null;
  if (!appCheckInstance) {
    try {
      const app = getFirebaseApp();
      // En environnement de dev ou hackathon, activer le debug token si disponible
      if (import.meta.env.DEV) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      appCheckInstance = initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: () => {
            return Promise.resolve({
              token: 'elora-debug-app-check-token',
              expireTimeMillis: Date.now() + 60 * 60 * 1000,
            });
          },
        }),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      // Si App Check a déjà été initialisé ou n'est pas requis en local
    }
  }
  return appCheckInstance;
}

// Firebase AI Logic singleton
let aiInstance: AI | null = null;
export function getFirebaseAI(): AI {
  if (!aiInstance) {
    const app = getFirebaseApp();
    aiInstance = getAI(app, { backend: new GoogleAIBackend() });
  }
  return aiInstance;
}
