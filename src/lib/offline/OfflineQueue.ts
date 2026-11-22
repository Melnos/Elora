/**
 * ELORA - OfflineQueue
 * File d'attente d'opérations différées pour le mode hors ligne.
 *
 * RÈGLE D'OR : Conserve les synchronisations de données (notes, tâches, modifications locales).
 * Ne JAMAIS simuler l'exécution d'une requête IA cloud différée comme si elle avait été traitée.
 */

export interface QueuedSyncItem {
  id: string;
  type: 'task_create' | 'task_update' | 'note_create' | 'note_update' | 'progress_entry';
  payload: Record<string, unknown>;
  createdAt: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}

export class OfflineQueue {
  private static STORAGE_KEY = 'elora_offline_queue_v1';

  /**
   * Enregistre une modification locale pour synchronisation future.
   */
  public static enqueue(item: Omit<QueuedSyncItem, 'id' | 'createdAt' | 'status'>): QueuedSyncItem {
    const queue = this.getAll();
    const newItem: QueuedSyncItem = {
      ...item,
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    queue.push(newItem);
    this.save(queue);
    return newItem;
  }

  /**
   * Récupère tous les éléments en attente de synchronisation.
   */
  public static getAll(): QueuedSyncItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Nombre d'éléments en attente de réseau.
   */
  public static getPendingCount(): number {
    return this.getAll().filter((i) => i.status === 'pending').length;
  }

  /**
   * Sauvegarde l'état de la file dans le stockage local persistant.
   */
  private static save(queue: QueuedSyncItem[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('[OfflineQueue] Erreur de sauvegarde locale :', err);
    }
  }

  /**
   * Vide la file ou marque les éléments comme synchronisés.
   */
  public static clear(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
