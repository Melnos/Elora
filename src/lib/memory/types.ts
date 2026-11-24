/**
 * ELORA - Système de Mémoire Personnelle Indépendante
 * Modèles de données et typage strict pour la persistance du contexte utilisateur.
 * Indépendant de l'historique conversationnel (conforme à l'Étape 4).
 */

export type MemoryCategory =
  | 'profile'       // Identité, rôle, style de travail, parcours
  | 'preference'    // Préférences d'apprentissage, ton, formats préférés
  | 'knowledge'     // Connaissances personnelles, compétences validées, fiches acquises
  | 'objective'     // Objectifs actifs et trajectoires stratégiques
  | 'project'       // Projets en cours, stack technique, jalons
  | 'habit'         // Rythme de travail, sessions de Deep Work, créneaux favorables
  | 'constraint'    // Contraintes personnelles, indisponibilités, limites matérielles
  | 'context';      // Éléments de cadrage temporaires ou permanents validés

export type MemorySource =
  | 'user_explicit'               // Ajouté ou saisi directement par l'utilisateur
  | 'ai_suggested_and_confirmed'  // Extrait par l'IA et formellement validé par l'utilisateur
  | 'onboarding';                 // Initialisé lors du cadrage de profil

export type MemoryStatus =
  | 'active'     // En mémoire vive, disponible pour enrichir le contexte IA
  | 'candidate'  // Suggestion d'apprentissage en attente de validation explicite
  | 'archived';  // Conservé pour historique mais non injecté dans les prompts

export interface MemoryItem {
  /** Identifiant unique de la mémoire */
  id: string;
  /** Identifiant de l'utilisateur pour isolation stricte */
  userId: string;
  /** Catégorie fonctionnelle de la mémoire */
  category: MemoryCategory;
  /** Clé sémantique (ex: 'technologies.favorites', 'focus.optimal_duration') */
  key: string;
  /** Contenu synthétique et factuel retenu */
  value: string;
  /** Provenance de l'information */
  source: MemorySource;
  /** Statut du cycle de vie */
  status: MemoryStatus;
  /** Actif pour l'enrichissement contextuel automatique des prompts IA */
  enabledForAI: boolean;
  /** Niveau de certitude (1.0 pour saisie explicite) */
  confidence: number;
  /** Date de création ISO */
  createdAt: string;
  /** Date d'ajout rétro-compatible */
  dateAdded?: string;
  /** Dernière date de mise à jour ISO */
  updatedAt: string;
  /** Références éventuelles vers des documents Knowledge ou Tâches */
  relatedEntityIds?: string[];
}

export interface CandidateFact {
  /** Clé sémantique proposée */
  key: string;
  /** Catégorie suggérée */
  category: MemoryCategory;
  /** Fait proposé */
  value: string;
  /** Raison pour laquelle l'IA suggère de retenir cette information */
  justification: string;
  /** Extrait du message source */
  sourceExcerpt?: string;
}

export interface MemoryContextPayload {
  /** Contexte formaté pour injection dans le prompt système d'ELORA */
  systemContextBlock: string;
  /** Nombre d'éléments actifs injectés */
  itemCount: number;
  /** Catégories représentées */
  categoriesIncluded: MemoryCategory[];
}
