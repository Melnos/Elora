/**
 * ELORA - Service Firebase Cloud Storage pour les fichiers Knowledge
 * Stocke les fichiers binaires sous users/{uid}/knowledge/{docId}/{fileName}
 * conformément à storage.rules (isolation stricte par utilisateur).
 *
 * RÈGLE D'HONNÊTETÉ : Ne jamais simuler un upload réussi si le bucket
 * Firebase Storage n'est pas provisionné ou si l'utilisateur est hors ligne.
 */

import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from './config';

export interface StorageUploadResult {
  status: 'uploaded' | 'not_provisioned' | 'offline' | 'error';
  storagePath?: string;
  message: string;
}

export async function uploadKnowledgeFile(
  uid: string,
  docId: string,
  file: File
): Promise<StorageUploadResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine) {
    return {
      status: 'offline',
      message: 'Hors ligne : métadonnées et texte extrait enregistrés localement ; fichier binaire non envoyé vers Storage.',
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
      message: 'Fichier original enregistré dans Firebase Storage.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code || '';
    const isNotProvisioned =
      code.includes('bucket-not-found') ||
      code.includes('project-not-found') ||
      msg.includes('404') ||
      msg.includes('Not Found');

    return {
      status: isNotProvisioned ? 'not_provisioned' : 'error',
      message: isNotProvisioned
        ? 'Firebase Storage non activé/provisionné sur ce projet (404) : le texte extrait et les métadonnées restent persistés dans Firestore.'
        : `Échec upload Firebase Storage : ${msg}`,
    };
  }
}

export async function deleteKnowledgeFile(storagePath: string): Promise<void> {
  if (!storagePath || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  try {
    const storage = getFirebaseStorage();
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    console.warn('[Storage] Suppression ignorée ou impossible :', err);
  }
}
