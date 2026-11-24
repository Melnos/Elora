/**
 * ELORA - Configuration Firebase, Auth, Firestore et Firebase AI Logic
 * Conforme aux spécifications Firebase 13.x et Firebase AI Logic
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { initializeAppCheck, CustomProvider, type AppCheck } from 'firebase/app-check';
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKeyForBuildHybridAIChallengeOnly1234',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'elora-hybrid-ai.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'elora-hybrid-ai',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'elora-hybrid-ai.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef1234567890',
};

// Initialisation idempotente du singleton FirebaseApp
export function getFirebaseApp(): FirebaseApp {
  // Bridge W3C / Chrome Prompt API pour Firebase AI Logic (ChromeAdapterImpl)
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.LanguageModel && win.ai?.languageModel) {
      win.LanguageModel = win.ai.languageModel;
    }
    if (win.LanguageModel && !win.LanguageModel.availability && win.LanguageModel.capabilities) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      win.LanguageModel.availability = async (options?: any) => {
        try {
          const caps = await win.LanguageModel.capabilities(options);
          if (caps.available === 'readily') return 'available';
          if (caps.available === 'after-download') return 'downloadable';
          return 'unavailable';
        } catch {
          return 'unavailable';
        }
      };
    }
  }

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
