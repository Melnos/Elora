/**
 * ELORA - Service Firebase Cloud Storage optionnel pour les fichiers Knowledge
 *
 * RÈGLE D'HONNÊTETÉ :
 * - Firebase Storage nécessite le forfait Blaze : si le bucket n'est pas provisionné (HTTP 404),
 *   désactiver proprement les tentatives d'upload pour ne pas bloquer Knowledge ni polluer la console.
 * - Ne jamais simuler un upload réussi ni générer de fausse URL.
 * - Préserver la compatibilité des documents possédant déjà un chemin Storage.
 */

import { ref, uploadBytes, deleteObject, getDownloadURL } from 'firebase/storage';
import { firebaseConfig, getFirebaseStorage } from './config';

export const STORAGE_PATH_PREFIX = 'Chemin Storage : ';

export interface StorageUploadResult {
  status: 'uploaded' | 'not_provisioned' | 'offline' | 'error';
  storagePath?: string;
  message: string;
}

const NOT_PROVISIONED_MESSAGE =
  'Fichier original non archivé dans le cloud (Firebase Storage désactivé). Texte extrait et métadonnées enregistrés dans Firestore.';

// Cache de session : évite de relancer des requêtes Storage vouées à 404
let cachedStorageProvisioned: boolean | null = null;

export function resetStorageAvailabilityCache(): void {
  cachedStorageProvisioned = null;
}

export async function isStorageBucketAvailable(): Promise<boolean> {
  if (cachedStorageProvisioned !== null) {
    return cachedStorageProvisioned;
  }

  const bucket = (firebaseConfig.storageBucket || '').trim();
  if (!bucket) {
    cachedStorageProvisioned = false;
    return false;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine) {
    return false;
  }

  try {
    const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o`);
    if (res.status === 404) {
      cachedStorageProvisioned = false;
      return false;
    }
    // 200 ou 401/403 (bucket existant protégé par règles) => bucket provisionné
    cachedStorageProvisioned = true;
    return true;
  } catch {
    return false;
  }
}

export function extractStoragePathFromInsights(keyInsights?: string[]): string | null {
  if (!Array.isArray(keyInsights)) return null;
  const entry = keyInsights.find((i) => typeof i === 'string' && i.startsWith(STORAGE_PATH_PREFIX));
  return entry ? entry.slice(STORAGE_PATH_PREFIX.length).trim() || null : null;
}

export async function getKnowledgeFileUrl(storagePath: string): Promise<string | null> {
  if (!storagePath || (typeof navigator !== 'undefined' && !navigator.onLine)) return null;
  if (cachedStorageProvisioned === false) return null;
  try {
    const storage = getFirebaseStorage();
    return await getDownloadURL(ref(storage, storagePath));
  } catch (err) {
    console.warn('[Storage] Impossible de récupérer l\'URL de téléchargement :', err);
    return null;
  }
}

export async function uploadKnowledgeFile(
  uid: string,
  docId: string,
  file: File
): Promise<StorageUploadResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine) {
    return {
      status: 'offline',
      message:
        'Hors ligne : fichier original non archivé dans le cloud. Texte extrait et métadonnées enregistrés localement.',
    };
  }

  const available = await isStorageBucketAvailable();
  if (!available) {
    return {
      status: 'not_provisioned',
      message: NOT_PROVISIONED_MESSAGE,
    };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `users/${uid}/knowledge/${docId}/${safeName}`;

  try {
    const storage = getFirebaseStorage();
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file, {
      contentType: file.type || 'application/octet-stream',
    });
    return {
      status: 'uploaded',
      storagePath,
      message: 'Fichier original archivé dans Firebase Storage.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code || '';
    const isNotProvisioned =
      code.includes('bucket-not-found') ||
      code.includes('project-not-found') ||
      msg.includes('404') ||
      msg.includes('Not Found');

    if (isNotProvisioned) {
      cachedStorageProvisioned = false;
      return {
        status: 'not_provisioned',
        message: NOT_PROVISIONED_MESSAGE,
      };
    }

    return {
      status: 'error',
      message: `Fichier original non archivé dans le cloud (${msg}). Texte extrait conservé dans Firestore.`,
    };
  }
}

export async function deleteKnowledgeFile(storagePath: string): Promise<void> {
  if (!storagePath || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  if (cachedStorageProvisioned === false) return;
  try {
    const storage = getFirebaseStorage();
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    console.warn('[Storage] Suppression ignorée ou impossible :', err);
  }
}
