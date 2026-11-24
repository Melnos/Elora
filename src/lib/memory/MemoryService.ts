/**
 * ELORA - MemoryService
 * Service central de gestion de la mémoire personnelle structurée et isolée par utilisateur.
 *
 * Principes stricts (Étape 4) :
 * 1. Isolation stricte par userId.
 * 2. Aucun message n'est converti automatiquement en mémoire : passage obligatoire par le statut 'candidate'
 *    ou par une saisie explicite de l'utilisateur.
 * 3. Consultable, modifiable, désactivable et supprimable par l'utilisateur à tout moment.
 * 4. Persistance double : locale immédiate (EloraDB) et réplication Firestore lorsque connecté.
 */

import type {
  MemoryItem,
  MemoryCategory,
  CandidateFact,
  MemoryContextPayload,
} from './types';

const STORAGE_PREFIX = 'elora_memory_';

export class MemoryService {
  /**
   * Clé de persistance locale pour un utilisateur donné.
   */
  private static getStorageKey(userId: string): string {
    return `${STORAGE_PREFIX}${userId || 'local_user'}`;
  }

  /**
   * Charge toutes les mémoires d'un utilisateur depuis le stockage local.
   */
  public static getAll(userId: string): MemoryItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.getStorageKey(userId));
      if (!raw) return [];
      return JSON.parse(raw) as MemoryItem[];
    } catch (err) {
      console.warn(`[MemoryService] Erreur lecture mémoire pour ${userId}:`, err);
      return [];
    }
  }

  /**
   * Sauvegarde les mémoires localement.
   */
  private static saveAll(userId: string, items: MemoryItem[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(items));
    } catch (err) {
      console.error(`[MemoryService] Erreur écriture mémoire pour ${userId}:`, err);
    }
  }

  /**
   * Récupère les mémoires filtrées par catégorie et/ou statut.
   */
  public static getMemories(
    userId: string,
    filter?: {
      category?: MemoryCategory;
      status?: MemoryItem['status'];
      enabledForAI?: boolean;
    }
  ): MemoryItem[] {
    let items = this.getAll(userId);

    if (filter?.category) {
      items = items.filter((m) => m.category === filter.category);
    }
    if (filter?.status) {
      items = items.filter((m) => m.status === filter.status);
    }
    if (filter?.enabledForAI !== undefined) {
      items = items.filter((m) => m.enabledForAI === filter.enabledForAI);
    }

    return items;
  }

  /**
   * Ajout explicite d'une mémoire par l'utilisateur (statut 'active' garanti).
   */
  public static addMemory(
    userId: string,
    data: {
      category: MemoryCategory;
      key: string;
      value: string;
      enabledForAI?: boolean;
      source?: MemoryItem['source'];
      relatedEntityIds?: string[];
    }
  ): MemoryItem {
    const items = this.getAll(userId);
    const now = new Date().toISOString();

    const newItem: MemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      category: data.category,
      key: data.key.trim(),
      value: data.value.trim(),
      source: data.source || 'user_explicit',
      status: 'active',
      enabledForAI: data.enabledForAI ?? true,
      confidence: 1.0,
      createdAt: now,
      updatedAt: now,
      relatedEntityIds: data.relatedEntityIds || [],
    };

    items.unshift(newItem);
    this.saveAll(userId, items);
    return newItem;
  }

  /**
   * Proposition par l'IA d'un fait découvert (statut 'candidate', inactif pour l'IA tant que non validé).
   */
  public static proposeCandidate(userId: string, candidate: CandidateFact): MemoryItem {
    const items = this.getAll(userId);
    const now = new Date().toISOString();

    const newCandidate: MemoryItem = {
      id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      category: candidate.category,
      key: candidate.key.trim(),
      value: candidate.value.trim(),
      source: 'ai_suggested_and_confirmed',
      status: 'candidate',
      enabledForAI: false, // Inactif par défaut jusqu'à confirmation explicite
      confidence: 0.8,
      createdAt: now,
      updatedAt: now,
    };

    items.unshift(newCandidate);
    this.saveAll(userId, items);
    return newCandidate;
  }

  /**
   * Validation formelle d'une mémoire candidate par l'utilisateur.
   */
  public static confirmCandidate(userId: string, memoryId: string): MemoryItem | null {
    const items = this.getAll(userId);
    const item = items.find((m) => m.id === memoryId);
    if (!item) return null;

    item.status = 'active';
    item.enabledForAI = true;
    item.confidence = 1.0;
    item.updatedAt = new Date().toISOString();

    this.saveAll(userId, items);
    return item;
  }

  /**
   * Rejet d'une mémoire candidate ou suppression d'un élément existant.
   */
  public static deleteMemory(userId: string, memoryId: string): boolean {
    const items = this.getAll(userId);
    const initialLen = items.length;
    const filtered = items.filter((m) => m.id !== memoryId);

    if (filtered.length !== initialLen) {
      this.saveAll(userId, filtered);
      return true;
    }
    return false;
  }

  /**
   * Mise à jour du contenu ou de l'état d'activation d'une mémoire.
   */
  public static updateMemory(
    userId: string,
    memoryId: string,
    updates: Partial<Pick<MemoryItem, 'value' | 'key' | 'enabledForAI' | 'category' | 'status'>>
  ): MemoryItem | null {
    const items = this.getAll(userId);
    const item = items.find((m) => m.id === memoryId);
    if (!item) return null;

    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
    this.saveAll(userId, items);
    return item;
  }

  /**
   * Synchronisation et fusion des mémoires depuis Cloud Firestore.
   */
  public static syncFromFirestore(userId: string, remoteItems: MemoryItem[]): MemoryItem[] {
    if (!userId || !remoteItems) return this.getAll(userId);
    const localItems = this.getAll(userId);
    const itemMap = new Map<string, MemoryItem>();

    for (const item of localItems) {
      itemMap.set(item.id, item);
    }

    for (const item of remoteItems) {
      const existing = itemMap.get(item.id);
      if (!existing || (item.updatedAt && (!existing.updatedAt || item.updatedAt >= existing.updatedAt))) {
        itemMap.set(item.id, item);
      }
    }

    const merged = Array.from(itemMap.values()).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
    this.saveAll(userId, merged);
    return merged;
  }

  /**
   * Extrait le bloc de contexte structuré à injecter dans le prompt système d'ELORA.
   * RÈGLE D'OR : N'inclut QUE les mémoires 'active' ayant 'enabledForAI: true'.
   * Récupération contextuelle intelligente : filtre par pertinence sémantique si le prompt est fourni.
   */
  public static getActiveContextForAI(
    userId: string,
    currentPrompt?: string,
    maxItems: number = 8
  ): MemoryContextPayload {
    const allActive = this.getMemories(userId, {
      status: 'active',
      enabledForAI: true,
    });

    if (allActive.length === 0) {
      return {
        systemContextBlock: '',
        itemCount: 0,
        categoriesIncluded: [],
      };
    }

    let selectedItems = allActive;

    // Récupération contextuelle intelligente : si prompt présent et trop de mémoires, filtrer par pertinence
    if (currentPrompt && allActive.length > maxItems) {
      const promptLower = currentPrompt.toLowerCase();
      const keywords = promptLower
        .replace(/[^\w\sàâäéèêëîïôöùûüç]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2);

      const anchors: MemoryItem[] = [];
      const others: { item: MemoryItem; score: number }[] = [];

      for (const m of allActive) {
        if (m.category === 'profile' || m.category === 'objective') {
          anchors.push(m);
        } else {
          let score = 0;
          const searchStr = `${m.key} ${m.value} ${m.category}`.toLowerCase();
          for (const kw of keywords) {
            if (searchStr.includes(kw)) {
              score += 2;
            }
          }
          others.push({ item: m, score });
        }
      }

      others.sort((a, b) => b.score - a.score);
      const remainingSlots = Math.max(0, maxItems - anchors.length);
      const topOthers = others.slice(0, remainingSlots).map((o) => o.item);

      selectedItems = [...anchors, ...topOthers];
    }

    // Regroupement par catégorie pour lisibilité optimale par le modèle
    const grouped = new Map<MemoryCategory, MemoryItem[]>();
    for (const item of selectedItems) {
      const list = grouped.get(item.category) || [];
      list.push(item);
      grouped.set(item.category, list);
    }

    const lines: string[] = [
      '### [MÉMOIRE PERSONNELLE VÉRIFIÉE DE L\'UTILISATEUR]',
      'Les faits suivants ont été explicitement validés par l\'utilisateur. Utilise-les pour adapter ton analyse sans les réciter inutilement :',
    ];

    const categoriesIncluded: MemoryCategory[] = [];

    const categoryLabels: Record<MemoryCategory, string> = {
      profile: 'Profil & Identité',
      preference: 'Préférences de Travail & Apprentissage',
      knowledge: 'Compétences & Connaissances Maîtrisées',
      objective: 'Objectifs Stratégiques Actifs',
      project: 'Projets & Développements en Cours',
      habit: 'Rythme & Habitudes de Concentration',
      constraint: 'Contraintes & Limites Spécifiées',
      context: 'Contexte Immédiat & Cadrage',
    };

    for (const [cat, mems] of grouped.entries()) {
      categoriesIncluded.push(cat);
      lines.push(`\n* **${categoryLabels[cat] || cat}** :`);
      for (const m of mems) {
        lines.push(`  - ${m.key}: ${m.value}`);
      }
    }

    lines.push('### [FIN MÉMOIRE PERSONNELLE]');

    return {
      systemContextBlock: lines.join('\n'),
      itemCount: selectedItems.length,
      categoriesIncluded,
    };
  }
}
