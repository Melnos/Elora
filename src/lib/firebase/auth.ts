/**
 * ELORA - Service d'Authentification Firebase
 * Gère l'authentification par email/mot de passe, Google, déconnexion et état de session.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth } from './config';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Formatage des erreurs Firebase pour l'utilisateur
export function formatAuthError(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Adresse email invalide.';
    case 'auth/user-disabled':
      return 'Ce compte utilisateur a été désactivé.';
    case 'auth/user-not-found':
      return 'Aucun compte associé à cette adresse email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Identifiants incorrects. Veuillez vérifier votre mot de passe.';
    case 'auth/email-already-in-use':
      return 'Cette adresse email est déjà associée à un compte.';
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    case 'auth/popup-closed-by-user':
      return 'La fenêtre de connexion Google a été fermée.';
    case 'auth/network-request-failed':
      return 'Connexion réseau impossible. Vérifiez votre accès internet.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Veuillez patienter avant de réessayer.';
    default:
      return 'Une erreur d\'authentification est survenue. Veuillez réessayer.';
  }
}

/**
 * Connexion par Email et Mot de passe
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return credential.user;
}

/**
 * Inscription par Email et Mot de passe
 */
export async function signupWithEmail(email: string, pass: string, displayName?: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName && credential.user) {
    await updateProfile(credential.user, { displayName });
  }
  return credential.user;
}

/**
 * Connexion avec Google
 */
export async function loginWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

/**
 * Déconnexion
 */
export async function logoutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

/**
 * Envoi d'un email de réinitialisation
 */
export async function sendResetPassword(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Écouteur d'état d'authentification réactif
 */
export function subscribeToAuthState(callback: (user: User | null) => void): Unsubscribe {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}
