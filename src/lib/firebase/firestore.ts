/**
 * ELORA - Service Cloud Firestore & Synchronisation
 * Gère la persistance et la synchronisation des données sous /users/{userId}
 * Conforme aux règles d'isolation stricte par utilisateur.
 */

import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { OfflineQueue, type QueuedSyncItem, type QueuedSyncType } from '../offline/OfflineQueue';
import type {
  UserProfile,
  TaskItem,
  GoalItem,
  FocusSession,
  MemoryItem,
  KnowledgeDoc,
  OpportunityItem,
  Conversation,
} from '../../types';

function getDB(): Firestore {
  return getFirebaseFirestore();
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean' || navigator.onLine;
}

/**
 * Nettoie récursivement tout champ `undefined` avant écriture Firestore (`setDoc`),
 * tout en préservant les valeurs légitimes (`null`, `false`, `0`, `""`, `Date`, `Timestamp`).
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v !== undefined) {
          cleaned[k] = sanitizeForFirestore(v);
        }
      }
      return cleaned as T;
    }
  }

  return value;
}

/**
 * Fusionne une collection locale et une collection Cloud sans doublons ni perte de données.
 * - Si la collection Cloud est vide, conserve intégralement les données locales.
 * - En cas de conflit sur un même `id`, conserve l'entrée ayant le `updatedAt` le plus récent
 *   (ou la version Cloud par défaut si aucun `updatedAt` n'est plus récent côté local).
 */
export function mergeCollectionById<T extends { id: string; updatedAt?: string }>(
  localItems: T[],
  cloudItems: T[]
): T[] {
  if (cloudItems.length === 0) return localItems;
  if (localItems.length === 0) return cloudItems;

  const byId = new Map<string, T>();
  for (const item of localItems) {
    byId.set(item.id, item);
  }

  for (const cloudItem of cloudItems) {
    const localItem = byId.get(cloudItem.id);
    if (!localItem) {
      byId.set(cloudItem.id, cloudItem);
      continue;
    }
    const localTs = localItem.updatedAt ? Date.parse(localItem.updatedAt) : NaN;
    const cloudTs = cloudItem.updatedAt ? Date.parse(cloudItem.updatedAt) : NaN;
    if (!Number.isNaN(localTs) && (Number.isNaN(cloudTs) || localTs > cloudTs)) {
      byId.set(cloudItem.id, localItem);
    } else {
      byId.set(cloudItem.id, cloudItem);
    }
  }

  return Array.from(byId.values());
}

/**
 * Fusionne le catalogue local d'opportunités avec l'état synchronisé depuis Firestore.
 * Préserve le catalogue de base lorsque Firestore est vide ou partiel.
 */
export function mergeOpportunities(
  localOpportunities: OpportunityItem[],
  cloudOpportunities: OpportunityItem[]
): OpportunityItem[] {
  if (cloudOpportunities.length === 0) return localOpportunities;
  const cloudById = new Map(cloudOpportunities.map((o) => [o.id, o]));
  const merged = localOpportunities.map((localOpp) => {
    const cloudOpp = cloudById.get(localOpp.id);
    if (!cloudOpp) return localOpp;
    cloudById.delete(localOpp.id);
    return { ...localOpp, ...cloudOpp };
  });
  for (const extra of cloudById.values()) {
    merged.push(extra);
  }
  return merged;
}

async function writeSubdoc(
  uid: string,
  subcollection: string,
  docId: string,
  data: unknown,
  queueType: QueuedSyncType,
  queuePayload: Record<string, unknown>,
  rethrow = false
): Promise<void> {
  if (!isOnline()) {
    OfflineQueue.enqueue({ type: queueType, payload: queuePayload });
    return;
  }
  try {
    const ref = doc(getDB(), 'users', uid, subcollection, docId);
    await setDoc(ref, sanitizeForFirestore(data), { merge: true });
  } catch (err) {
    console.warn(`[Firestore] Erreur écriture ${subcollection}/${docId}, mise en file d'attente :`, err);
    OfflineQueue.enqueue({ type: queueType, payload: queuePayload });
    if (rethrow) throw err;
  }
}

async function deleteSubdoc(
  uid: string,
  subcollection: string,
  docId: string,
  queueType: QueuedSyncType,
  rethrow = false
): Promise<void> {
  const queuePayload = { uid, id: docId };
  if (!isOnline()) {
    OfflineQueue.enqueue({ type: queueType, payload: queuePayload });
    return;
  }
  try {
    const ref = doc(getDB(), 'users', uid, subcollection, docId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn(`[Firestore] Erreur suppression ${subcollection}/${docId}, mise en file d'attente :`, err);
    OfflineQueue.enqueue({ type: queueType, payload: queuePayload });
    if (rethrow) throw err;
  }
}

async function readUserSubcollection<T>(
  db: Firestore,
  uid: string,
  subcollection: string,
  errors: string[]
): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, 'users', uid, subcollection));
    const items: T[] = [];
    snap.forEach((d) => items.push(d.data() as T));
    return items;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`${subcollection}: ${msg}`);
    console.warn(`[Firestore] Échec lecture ${subcollection} :`, err);
    return [];
  }
}

/**
 * Sauvegarde ou mise à jour du profil utilisateur
 */
export async function syncUserProfile(uid: string, profile: UserProfile): Promise<void> {
  if (!isOnline()) {
    OfflineQueue.enqueue({ type: 'profile_sync', payload: { uid, profile } });
    return;
  }
  try {
    const userRef = doc(getDB(), 'users', uid);
    await setDoc(
      userRef,
      sanitizeForFirestore({ profile, updatedAt: new Date().toISOString() }),
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore] Erreur écriture profil, mise en file d\'attente :', err);
    OfflineQueue.enqueue({ type: 'profile_sync', payload: { uid, profile } });
  }
}

/**
 * Récupère l'intégralité des données d'un utilisateur depuis Firestore
 */
export async function fetchUserData(uid: string): Promise<{
  profile?: UserProfile;
  tasks: TaskItem[];
  goals: GoalItem[];
  focusSessions: FocusSession[];
  memories: MemoryItem[];
  knowledgeDocs: KnowledgeDoc[];
  conversations: Conversation[];
  opportunities: OpportunityItem[];
  errors?: string[];
} | null> {
  if (!isOnline()) return null;

  try {
    const db = getDB();
    const errors: string[] = [];

    let profile: UserProfile | undefined;
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      profile = userSnap.exists() ? (userSnap.data().profile as UserProfile) : undefined;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`profile: ${msg}`);
      console.warn('[Firestore] Échec lecture profil :', err);
    }

    const [tasks, goals, focusSessions, memories, knowledgeDocs, conversations, opportunities] =
      await Promise.all([
        readUserSubcollection<TaskItem>(db, uid, 'tasks', errors),
        readUserSubcollection<GoalItem>(db, uid, 'goals', errors),
        readUserSubcollection<FocusSession>(db, uid, 'focusSessions', errors),
        readUserSubcollection<MemoryItem>(db, uid, 'memories', errors),
        readUserSubcollection<KnowledgeDoc>(db, uid, 'knowledge', errors),
        readUserSubcollection<Conversation>(db, uid, 'conversations', errors),
        readUserSubcollection<OpportunityItem>(db, uid, 'opportunities', errors),
      ]);

    return {
      profile,
      tasks,
      goals,
      focusSessions,
      memories,
      knowledgeDocs,
      conversations,
      opportunities,
      ...(errors.length > 0 ? { errors } : {}),
    };
  } catch (err) {
    console.warn('[Firestore] Échec critique du chargement cloud :', err);
    return null;
  }
}

/** Tâches */
export async function saveUserTask(uid: string, task: TaskItem): Promise<void> {
  return writeSubdoc(uid, 'tasks', task.id, task, 'task_create', { uid, task });
}

export async function deleteUserTask(uid: string, taskId: string): Promise<void> {
  return deleteSubdoc(uid, 'tasks', taskId, 'task_delete');
}

/** Objectifs */
export async function saveUserGoal(uid: string, goal: GoalItem): Promise<void> {
  return writeSubdoc(uid, 'goals', goal.id, goal, 'goal_save', { uid, goal });
}

export async function deleteUserGoal(uid: string, goalId: string): Promise<void> {
  return deleteSubdoc(uid, 'goals', goalId, 'goal_delete');
}

/** Sessions Focus */
export async function saveUserFocusSession(uid: string, session: FocusSession): Promise<void> {
  return writeSubdoc(uid, 'focusSessions', session.id, session, 'focus_save', { uid, session });
}

/** Mémoires */
export async function saveUserMemory(uid: string, memory: MemoryItem): Promise<void> {
  return writeSubdoc(uid, 'memories', memory.id, memory, 'memory_save', { uid, memory });
}

export async function deleteUserMemory(uid: string, memoryId: string): Promise<void> {
  return deleteSubdoc(uid, 'memories', memoryId, 'memory_delete');
}

/** Connaissances & Documents */
export async function saveUserKnowledgeDoc(uid: string, kdoc: KnowledgeDoc): Promise<void> {
  return writeSubdoc(uid, 'knowledge', kdoc.id, kdoc, 'note_create', { uid, kdoc });
}

export async function deleteUserKnowledgeDoc(uid: string, docId: string): Promise<void> {
  return deleteSubdoc(uid, 'knowledge', docId, 'knowledge_delete');
}

/** Opportunités */
export async function saveUserOpportunity(uid: string, opportunity: OpportunityItem): Promise<void> {
  return writeSubdoc(uid, 'opportunities', opportunity.id, opportunity, 'opportunity_save', {
    uid,
    opportunity,
  });
}

export async function fetchUserOpportunities(uid: string): Promise<OpportunityItem[]> {
  if (!isOnline()) return [];
  const errors: string[] = [];
  return readUserSubcollection<OpportunityItem>(getDB(), uid, 'opportunities', errors);
}

export async function deleteUserOpportunity(uid: string, oppId: string): Promise<void> {
  return deleteSubdoc(uid, 'opportunities', oppId, 'opportunity_delete');
}

/** Conversations */
export async function saveUserConversation(uid: string, conversation: Conversation): Promise<void> {
  return writeSubdoc(uid, 'conversations', conversation.id, conversation, 'conversation_save', {
    uid,
    conversation,
  });
}

export async function deleteUserConversation(uid: string, convId: string): Promise<void> {
  return deleteSubdoc(uid, 'conversations', convId, 'conversation_delete');
}

async function replayQueueItem(uid: string, item: QueuedSyncItem): Promise<void> {
  const db = getDB();
  const p = item.payload;
  switch (item.type) {
    case 'profile_sync':
    case 'progress_entry':
      if (p.profile) {
        await setDoc(
          doc(db, 'users', uid),
          sanitizeForFirestore({ profile: p.profile, updatedAt: new Date().toISOString() }),
          { merge: true }
        );
      }
      return;
    case 'task_create':
    case 'task_update':
      if (p.task) {
        const task = p.task as TaskItem;
        await setDoc(doc(db, 'users', uid, 'tasks', task.id), sanitizeForFirestore(task), { merge: true });
      }
      return;
    case 'task_delete':
      if (typeof p.id === 'string') await deleteDoc(doc(db, 'users', uid, 'tasks', p.id));
      return;
    case 'goal_save':
      if (p.goal) {
        const goal = p.goal as GoalItem;
        await setDoc(doc(db, 'users', uid, 'goals', goal.id), sanitizeForFirestore(goal), { merge: true });
      }
      return;
    case 'goal_delete':
      if (typeof p.id === 'string') await deleteDoc(doc(db, 'users', uid, 'goals', p.id));
      return;
    case 'focus_save':
      if (p.session) {
        const session = p.session as FocusSession;
        await setDoc(doc(db, 'users', uid, 'focusSessions', session.id), sanitizeForFirestore(session), { merge: true });
      }
      return;
    case 'memory_save':
      if (p.memory) {
        const memory = p.memory as MemoryItem;
        await setDoc(doc(db, 'users', uid, 'memories', memory.id), sanitizeForFirestore(memory), { merge: true });
      }
      return;
    case 'memory_delete':
      if (typeof p.id === 'string') await deleteDoc(doc(db, 'users', uid, 'memories', p.id));
      return;
    case 'note_create':
    case 'note_update':
      if (p.kdoc) {
        const kdoc = p.kdoc as KnowledgeDoc;
        await setDoc(doc(db, 'users', uid, 'knowledge', kdoc.id), sanitizeForFirestore(kdoc), { merge: true });
      }
      return;
    case 'knowledge_delete':
      if (typeof p.id === 'string') await deleteDoc(doc(db, 'users', uid, 'knowledge', p.id));
      return;
    case 'conversation_save':
      if (p.conversation) {
        const conv = p.conversation as Conversation;
        await setDoc(doc(db, 'users', uid, 'conversations', conv.id), sanitizeForFirestore(conv), { merge: true });
      }
      return;
    case 'conversation_delete':
      if (typeof p.id === 'string') await deleteDoc(doc(db, 'users', uid, 'conversations', p.id));
      return;
    case 'opportunity_save':
      if (p.opportunity) {
        const opp = p.opportunity as OpportunityItem;
        await setDoc(doc(db, 'users', uid, 'opportunities', opp.id), sanitizeForFirestore(opp), { merge: true });
      }
      return;
    case 'opportunity_delete':
      if (typeof p.id === 'string') await deleteDoc(doc(db, 'users', uid, 'opportunities', p.id));
      return;
  }
}

/**
 * Dépilage et synchronisation des éléments en attente (OfflineQueue).
 * Ne supprime que les éléments réellement synchronisés ; conserve les échecs avec leur erreur.
 */
export async function processOfflineQueue(uid: string): Promise<number> {
  if (!isOnline()) return 0;
  const items = OfflineQueue.getAll();
  if (items.length === 0) return 0;

  let processed = 0;
  const remaining: QueuedSyncItem[] = [];

  for (const item of items) {
    try {
      await replayQueueItem(uid, item);
      processed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('[Firestore Sync] Échec de l\'élément file d\'attente :', errMsg);
      remaining.push({ ...item, status: 'failed', error: errMsg });
    }
  }

  OfflineQueue.replaceAll(remaining);
  return processed;
}
