/**
 * ELORA - Configuration Firebase et Firebase AI Logic
 * Conforme aux spécifications Firebase AI Logic SDK 13.x
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
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
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

let aiInstance: AI | null = null;

// Initialisation de Firebase AI Logic avec le backend Gemini Developer API
export function getFirebaseAI(): AI {
  if (!aiInstance) {
    const app = getFirebaseApp();
    aiInstance = getAI(app, { backend: new GoogleAIBackend() });
  }
  return aiInstance;
}
