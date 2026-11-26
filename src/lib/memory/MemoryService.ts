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
const MIGRATION_PREFIX = 'elora_memory_migrated_';

function normalizeMemoryText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class MemoryService {
  /**
   * Clé de persistance locale pour un utilisateur donné.
   */
  private static getStorageKey(userId: string): string {
    return `${STORAGE_PREFIX}${userId || 'local_user'}`;
  }

  private static isExpiredTemporary(item: MemoryItem, nowMs = Date.now()): boolean {
    if (item.status !== 'temporary' || !item.expiresAt) return false;
    const exp = Date.parse(item.expiresAt);
    return !Number.isNaN(exp) && exp < nowMs;
  }

  /**
   * Charge toutes les mémoires d'un utilisateur depuis le stockage local.
   */
  public static getAll(userId: string): MemoryItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.getStorageKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as MemoryItem[];
      if (!Array.isArray(parsed)) return [];
      const uid = userId || 'local_user';
      // Isolation stricte : ne jamais retourner un élément appartenant à un autre userId
      return parsed.filter((m) => !m.userId || m.userId === uid);
    } catch (err) {
      console.warn(`[MemoryService] Erreur lecture mémoire pour ${userId}:`, err);
      return [];
    }
  }

  /**
   * Sauvegarde les mémoires localement et retourne true uniquement si l'écriture a réellement réussi.
   */
  private static saveAll(userId: string, items: MemoryItem[]): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(items));
      return true;
    } catch (err) {
      console.error(`[MemoryService] Erreur écriture mémoire pour ${userId}:`, err);
      return false;
    }
  }

  /**
   * Migration non destructive des anciennes mémoires (elora_db_memories) vers la source unique MemoryService.
   * Préserve les souvenirs existants et respecte l'isolation entre utilisateurs.
   */
  public static migrateLegacyMemories(userId: string, legacyItems: MemoryItem[]): MemoryItem[] {
    const uid = userId || 'local_user';
    if (typeof localStorage === 'undefined' || !Array.isArray(legacyItems) || legacyItems.length === 0) {
      return this.getAll(uid);
    }

    const migrationFlagKey = `${MIGRATION_PREFIX}${uid}`;
    if (localStorage.getItem(migrationFlagKey) === '1') {
      return this.getAll(uid);
    }

    const existing = this.getAll(uid);
    const byId = new Map<string, MemoryItem>(existing.map((m) => [m.id, m]));
    let changed = false;

    for (const legacy of legacyItems) {
      // Ne jamais importer un souvenir explicitement rattaché à un autre utilisateur
      if (legacy.userId && legacy.userId !== 'local_user' && legacy.userId !== uid) {
        continue;
      }
      if (!byId.has(legacy.id)) {
        const now = new Date().toISOString();
        const normalized: MemoryItem = {
          id: legacy.id,
          userId: uid,
          category: (legacy.category || 'context') as MemoryCategory,
          key: (legacy.key || '').trim(),
          value: (legacy.value || '').trim(),
          source: (legacy.source || 'user_explicit') as MemoryItem['source'],
          status: legacy.status || 'active',
          enabledForAI: legacy.enabledForAI ?? true,
          confidence: legacy.confidence ?? 1.0,
          createdAt: legacy.createdAt || now,
          dateAdded: legacy.dateAdded || now.split('T')[0],
          updatedAt: legacy.updatedAt || now,
          expiresAt: legacy.expiresAt,
          isTemporary: legacy.isTemporary,
          relatedEntityIds: legacy.relatedEntityIds || [],
        };
        byId.set(normalized.id, normalized);
        changed = true;
      }
    }

    const merged = Array.from(byId.values());
    if (!changed || this.saveAll(uid, merged)) {
      try {
        localStorage.setItem(migrationFlagKey, '1');
      } catch {
        // Ignore flag failure
      }
    }
    return merged;
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
   * Ajout explicite d'une mémoire par l'utilisateur (statut 'active' ou 'temporary').
   * Retourne null si la persistance réelle a échoué.
   */
  public static addMemory(
    userId: string,
    data: {
      category: MemoryCategory;
      key: string;
      value: string;
      enabledForAI?: boolean;
      source?: MemoryItem['source'];
      status?: 'active' | 'temporary';
      expiresAt?: string;
      relatedEntityIds?: string[];
    }
  ): MemoryItem | null {
    const uid = userId || 'local_user';
    const items = this.getAll(uid);
    const now = new Date().toISOString();
    const status = data.status === 'temporary' ? 'temporary' : 'active';

    const newItem: MemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: uid,
      category: data.category,
      key: data.key.trim(),
      value: data.value.trim(),
      source: data.source || 'user_explicit',
      status,
      enabledForAI: data.enabledForAI ?? true,
      confidence: 1.0,
      createdAt: now,
      dateAdded: now.split('T')[0],
      updatedAt: now,
      isTemporary: status === 'temporary',
      expiresAt: data.expiresAt,
      relatedEntityIds: data.relatedEntityIds || [],
    };

    const next = [newItem, ...items];
    if (!this.saveAll(uid, next)) {
      return null;
    }
    return newItem;
  }

  /**
   * Proposition par l'IA d'un fait découvert (statut 'candidate', inactif pour l'IA tant que non validé).
   */
  public static proposeCandidate(userId: string, candidate: CandidateFact): MemoryItem | null {
    const uid = userId || 'local_user';
    const items = this.getAll(uid);
    const normKey = normalizeMemoryText(candidate.key);
    const normVal = normalizeMemoryText(candidate.value);

    // Éviter de proposer un doublon déjà enregistré ou déjà en attente
    const duplicate = items.find(
      (m) =>
        normalizeMemoryText(m.value) === normVal ||
        (normalizeMemoryText(m.key) === normKey && m.category === candidate.category && m.status !== 'archived')
    );
    if (duplicate) {
      return duplicate;
    }

    const now = new Date().toISOString();
    const newCandidate: MemoryItem = {
      id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: uid,
      category: candidate.category,
      key: candidate.key.trim(),
      value: candidate.value.trim(),
      source: 'ai_suggested_and_confirmed',
      status: 'candidate',
      enabledForAI: false, // Inactif par défaut jusqu'à confirmation explicite
      confidence: 0.75,
      createdAt: now,
      dateAdded: now.split('T')[0],
      updatedAt: now,
      isTemporary: Boolean(candidate.isTemporary),
      expiresAt: candidate.expiresAt,
    };

    const next = [newCandidate, ...items];
    if (!this.saveAll(uid, next)) {
      return null;
    }
    return newCandidate;
  }

  /**
   * Validation formelle d'une mémoire candidate par l'utilisateur.
   * Retourne null si l'élément est introuvable ou si l'écriture échoue.
   */
  public static confirmCandidate(
    userId: string,
    memoryId: string,
    targetStatus?: 'active' | 'temporary'
  ): MemoryItem | null {
    const uid = userId || 'local_user';
    const items = this.getAll(uid);
    const item = items.find((m) => m.id === memoryId);
    if (!item) return null;

    const resolvedStatus: 'active' | 'temporary' =
      targetStatus || (item.isTemporary ? 'temporary' : 'active');

    item.status = resolvedStatus;
    item.isTemporary = resolvedStatus === 'temporary';
    item.enabledForAI = true;
    item.confidence = 1.0;
    item.updatedAt = new Date().toISOString();

    if (!this.saveAll(uid, items)) {
      return null;
    }
    return item;
  }

  /**
   * Rejet d'une mémoire candidate ou suppression d'un élément existant.
   */
  public static deleteMemory(userId: string, memoryId: string): boolean {
    const uid = userId || 'local_user';
    const items = this.getAll(uid);
    const initialLen = items.length;
    const filtered = items.filter((m) => m.id !== memoryId);

    if (filtered.length !== initialLen) {
      return this.saveAll(uid, filtered);
    }
    return false;
  }

  /**
   * Mise à jour du contenu ou de l'état d'activation d'une mémoire.
   */
  public static updateMemory(
    userId: string,
    memoryId: string,
    updates: Partial<Pick<MemoryItem, 'value' | 'key' | 'enabledForAI' | 'category' | 'status' | 'expiresAt' | 'isTemporary'>>
  ): MemoryItem | null {
    const uid = userId || 'local_user';
    const items = this.getAll(uid);
    const item = items.find((m) => m.id === memoryId);
    if (!item) return null;

    const sanitizedUpdates = { ...updates };
    if (typeof sanitizedUpdates.key === 'string') sanitizedUpdates.key = sanitizedUpdates.key.trim();
    if (typeof sanitizedUpdates.value === 'string') sanitizedUpdates.value = sanitizedUpdates.value.trim();
    if (sanitizedUpdates.status === 'temporary') sanitizedUpdates.isTemporary = true;
    if (sanitizedUpdates.status === 'active') sanitizedUpdates.isTemporary = false;

    Object.assign(item, sanitizedUpdates, { updatedAt: new Date().toISOString() });
    if (!this.saveAll(uid, items)) {
      return null;
    }
    return item;
  }

  /**
   * Extrait un prénom déclaré explicitement par l'utilisateur (ex: "Je m'appelle Mel").
   */
  public static extractExplicitName(userText: string): string | null {
    const text = (userText || '').trim();
    const match = text.match(
      /(?:je m['’]appelle|mon pr[ée]nom est|appelle-moi)\s+([A-ZÀ-ÖØ-Þa-zà-öø-ÿ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ'’-]{1,28})/i
    );
    if (!match) return null;
    const rawName = match[1].trim();
    const lower = rawName.toLowerCase();
    if (['comment', 'quoi', 'qui', 'pas', 'bien', 'encore'].includes(lower)) {
      return null;
    }
    return rawName.charAt(0).toUpperCase() + rawName.slice(1);
  }

  /**
   * Extraction prudente et déterministe de faits étudiants explicites depuis un message utilisateur.
   * Ne fabrique jamais d'hypothèse si l'énoncé est une simple question ou trop court.
   */
  public static extractCandidateFacts(userText: string): CandidateFact[] {
    const text = (userText || '').trim();
    if (text.length < 10) return [];

    // Découper en phrases déclaratives simples (ignorer les phrases purement interrogatives)
    const sentences = text
      .split(/[\n.!?;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 10 && !s.endsWith('?'));

    const candidates: CandidateFact[] = [];
    const seenKeys = new Set<string>();

    const pushCandidate = (c: CandidateFact) => {
      const k = `${c.category}:${normalizeMemoryText(c.key)}`;
      if (!seenKeys.has(k) && candidates.length < 2) {
        seenKeys.add(k);
        candidates.push(c);
      }
    };

    // 0. Prénom / identité explicite ("Je m'appelle Mel")
    const explicitName = this.extractExplicitName(text);
    if (explicitName) {
      pushCandidate({
        category: 'profile',
        key: 'Prénom',
        value: explicitName,
        justification: 'Prénom indiqué directement dans votre message.',
        sourceExcerpt: text.slice(0, 120),
      });
    }

    for (const sentence of sentences) {
      const norm = normalizeMemoryText(sentence);

      // 1. Projets étudiants
      const projMatch = sentence.match(
        /(?:mon projet(?: actuel| de fin d'études| tutoré)?\s+(?:est|porte sur)|je travaille sur|je développe)\s+(.{6,140})/i
      );
      if (projMatch) {
        pushCandidate({
          category: 'project',
          key: 'Projet en cours',
          value: projMatch[1].trim(),
          justification: 'Projet mentionné dans votre message.',
          sourceExcerpt: sentence.slice(0, 160),
        });
        continue;
      }

      // 2. Objectifs
      const objMatch = sentence.match(
        /(?:mon objectif(?:\s+principal)?\s+est\s+(?:de\s+)?|je veux réussir\s+|je prépare\s+)(.{6,140})/i
      );
      if (objMatch) {
        pushCandidate({
          category: 'objective',
          key: 'Objectif personnel',
          value: objMatch[1].trim(),
          justification: 'Objectif exprimé dans votre message.',
          sourceExcerpt: sentence.slice(0, 160),
        });
        continue;
      }

      // 3. Préférences d'apprentissage
      const prefMatch = sentence.match(
        /(?:je préfère\s+|j'aime apprendre\s+(?:avec\s+)?|explique-moi toujours\s+)(.{6,140})/i
      );
      if (prefMatch) {
        pushCandidate({
          category: 'preference',
          key: "Préférence d'apprentissage",
          value: prefMatch[1].trim(),
          justification: "Préférence d'apprentissage indiquée dans votre message.",
          sourceExcerpt: sentence.slice(0, 160),
        });
        continue;
      }

      // 4. Méthodes de travail / habitudes
      const habitMatch = sentence.match(
        /(?:je travaille mieux\s+|ma méthode de (?:travail|révision)\s+(?:est\s+)?|je révise\s+)(.{6,140})/i
      );
      if (habitMatch) {
        pushCandidate({
          category: 'habit',
          key: 'Méthode de travail',
          value: habitMatch[1].trim(),
          justification: 'Méthode ou rythme de travail partagé.',
          sourceExcerpt: sentence.slice(0, 160),
        });
        continue;
      }

      // 5. Contexte temporaire (examen, semaine chargée, contrainte courte)
      if (/\b(cette semaine|demain|ce mois-ci|mon examen|mes partiels|partiel)\b/i.test(norm)) {
        const tempMatch = sentence.match(
          /(?:cette semaine|demain|ce mois-ci|mon examen|mes partiels)[^.!?]{4,140}/i
        );
        if (tempMatch) {
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          pushCandidate({
            category: 'context',
            key: 'Contexte temporaire',
            value: sentence.slice(0, 140),
            justification: 'Information ponctuelle / temporaire détectée.',
            sourceExcerpt: sentence.slice(0, 160),
            isTemporary: true,
            expiresAt,
          });
          continue;
        }
      }

      // 6. Contexte d'études durable
      const studyMatch = sentence.match(
        /(?:je suis en\s+(?:l1|l2|l3|m1|m2|licence|master|doctorat|prépa|école|bts|but|terminale)[^.!?]{0,100}|j'étudie\s+.{4,120})/i
      );
      if (studyMatch) {
        pushCandidate({
          category: 'profile',
          key: "Contexte d'études",
          value: studyMatch[0].trim(),
          justification: "Parcours ou niveau d'études mentionné.",
          sourceExcerpt: sentence.slice(0, 160),
        });
      }
    }

    return candidates;
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
    const uid = userId || 'local_user';
    const nowMs = Date.now();
    // Inclure uniquement les faits confirmés ('active') et temporaires non expirés ('temporary') activés pour l'IA.
    // Les hypothèses ('candidate') et archives ('archived') sont strictement exclues.
    const allActive = this.getAll(uid).filter(
      (m) =>
        m.enabledForAI &&
        (m.status === 'active' || (m.status === 'temporary' && !this.isExpiredTemporary(m, nowMs)))
    );

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
        const tag = m.status === 'temporary' ? ' [Temporaire]' : '';
        lines.push(`  - ${m.key}${tag}: ${m.value}`);
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
