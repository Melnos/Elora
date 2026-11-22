/**
 * ELORA - Service Cloud Firestore & Synchronisation
 * Gère la persistance et la synchronisation en temps réel des données sous /users/{userId}
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
import { OfflineQueue } from '../offline/OfflineQueue';
import type {
  UserProfile,
  TaskItem,
  GoalItem,
  FocusSession,
  MemoryItem,
  KnowledgeDoc,
  Conversation,
} from '../../types';

function getDB(): Firestore {
  return getFirebaseFirestore();
}

/**
 * Sauvegarde ou mise à jour du profil utilisateur
 */
export async function syncUserProfile(uid: string, profile: UserProfile): Promise<void> {
  if (!navigator.onLine) {
    OfflineQueue.enqueue({
      type: 'progress_entry',
      payload: { uid, profile },
    });
    return;
  }
  try {
    const userRef = doc(getDB(), 'users', uid);
    await setDoc(userRef, { profile, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Sauvegarde hors ligne profil :', err);
    OfflineQueue.enqueue({
      type: 'progress_entry',
      payload: { uid, profile },
    });
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
} | null> {
  if (!navigator.onLine) return null;

  try {
    const db = getDB();

    // 1. Profil
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    const profile = userSnap.exists() ? (userSnap.data().profile as UserProfile) : undefined;

    // 2. Tâches
    const tasksSnap = await getDocs(collection(db, 'users', uid, 'tasks'));
    const tasks: TaskItem[] = [];
    tasksSnap.forEach((d) => tasks.push(d.data() as TaskItem));

    // 3. Objectifs
    const goalsSnap = await getDocs(collection(db, 'users', uid, 'goals'));
    const goals: GoalItem[] = [];
    goalsSnap.forEach((d) => goals.push(d.data() as GoalItem));

    // 4. Focus
    const focusSnap = await getDocs(collection(db, 'users', uid, 'focusSessions'));
    const focusSessions: FocusSession[] = [];
    focusSnap.forEach((d) => focusSessions.push(d.data() as FocusSession));

    // 5. Mémoires
    const memSnap = await getDocs(collection(db, 'users', uid, 'memories'));
    const memories: MemoryItem[] = [];
    memSnap.forEach((d) => memories.push(d.data() as MemoryItem));

    // 6. Connaissances
    const knowSnap = await getDocs(collection(db, 'users', uid, 'knowledge'));
    const knowledgeDocs: KnowledgeDoc[] = [];
    knowSnap.forEach((d) => knowledgeDocs.push(d.data() as KnowledgeDoc));

    // 7. Conversations
    const convSnap = await getDocs(collection(db, 'users', uid, 'conversations'));
    const conversations: Conversation[] = [];
    convSnap.forEach((d) => conversations.push(d.data() as Conversation));

    return {
      profile,
      tasks,
      goals,
      focusSessions,
      memories,
      knowledgeDocs,
      conversations,
    };
  } catch (err) {
    console.warn('[Firestore] Échec du chargement cloud :', err);
    return null;
  }
}

/**
 * Sauvegarde d'une tâche
 */
export async function saveUserTask(uid: string, task: TaskItem): Promise<void> {
  if (!navigator.onLine) {
    OfflineQueue.enqueue({ type: 'task_create', payload: { uid, task } });
    return;
  }
  try {
    const taskRef = doc(getDB(), 'users', uid, 'tasks', task.id);
    await setDoc(taskRef, task, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Erreur écriture tâche, mise en file d\'attente :', err);
    OfflineQueue.enqueue({ type: 'task_create', payload: { uid, task } });
  }
}

/**
 * Suppression d'une tâche
 */
export async function deleteUserTask(uid: string, taskId: string): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const taskRef = doc(getDB(), 'users', uid, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (err) {
    console.warn('[Firestore] Erreur suppression tâche :', err);
  }
}

/**
 * Sauvegarde d'un objectif
 */
export async function saveUserGoal(uid: string, goal: GoalItem): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const goalRef = doc(getDB(), 'users', uid, 'goals', goal.id);
    await setDoc(goalRef, goal, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Erreur écriture objectif :', err);
  }
}

/**
 * Sauvegarde d'une session Focus
 */
export async function saveUserFocusSession(uid: string, session: FocusSession): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const sessionRef = doc(getDB(), 'users', uid, 'focusSessions', session.id);
    await setDoc(sessionRef, session, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Erreur écriture focus :', err);
  }
}

/**
 * Sauvegarde d'une mémoire
 */
export async function saveUserMemory(uid: string, memory: MemoryItem): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const memRef = doc(getDB(), 'users', uid, 'memories', memory.id);
    await setDoc(memRef, memory, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Erreur écriture mémoire :', err);
  }
}

/**
 * Suppression d'une mémoire
 */
export async function deleteUserMemory(uid: string, memoryId: string): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const memRef = doc(getDB(), 'users', uid, 'memories', memoryId);
    await deleteDoc(memRef);
  } catch (err) {
    console.warn('[Firestore] Erreur suppression mémoire :', err);
  }
}

/**
 * Sauvegarde d'un document de connaissances
 */
export async function saveUserKnowledgeDoc(uid: string, kdoc: KnowledgeDoc): Promise<void> {
  if (!navigator.onLine) {
    OfflineQueue.enqueue({ type: 'note_create', payload: { uid, kdoc } });
    return;
  }
  try {
    const docRef = doc(getDB(), 'users', uid, 'knowledge', kdoc.id);
    await setDoc(docRef, kdoc, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Erreur écriture knowledge :', err);
    OfflineQueue.enqueue({ type: 'note_create', payload: { uid, kdoc } });
  }
}

/**
 * Suppression d'un document de connaissances
 */
export async function deleteUserKnowledgeDoc(uid: string, docId: string): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const docRef = doc(getDB(), 'users', uid, 'knowledge', docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[Firestore] Erreur suppression knowledge :', err);
  }
}

/**
 * Sauvegarde d'une conversation
 */
export async function saveUserConversation(uid: string, conversation: Conversation): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const convRef = doc(getDB(), 'users', uid, 'conversations', conversation.id);
    await setDoc(convRef, conversation, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Erreur écriture conversation :', err);
  }
}

/**
 * Dépilage et synchronisation des éléments en attente (OfflineQueue)
 */
export async function processOfflineQueue(uid: string): Promise<number> {
  if (!navigator.onLine) return 0;
  const items = OfflineQueue.getAll();
  if (items.length === 0) return 0;

  let processed = 0;
  for (const item of items) {
    try {
      if (item.type === 'task_create' && item.payload.task) {
        await saveUserTask(uid, item.payload.task as TaskItem);
        processed++;
      } else if (item.type === 'note_create' && item.payload.kdoc) {
        await saveUserKnowledgeDoc(uid, item.payload.kdoc as KnowledgeDoc);
        processed++;
      } else if (item.type === 'progress_entry' && item.payload.profile) {
        await syncUserProfile(uid, item.payload.profile as UserProfile);
        processed++;
      }
    } catch (err) {
      console.warn('[Firestore Sync] Échec de l\'élément file d\'attente :', err);
    }
  }

  OfflineQueue.clear();
  return processed;
}
