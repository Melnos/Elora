/**
 * ELORA - AI Orchestrator Types
 * Définition stricte des interfaces pour l'architecture hybride (Firebase AI Logic + Gemini Nano).
 * Conforme aux spécifications du document ELORA_Brief_Antigravity.md.
 */

export type InferenceSource = 'on_device' | 'in_cloud' | 'unavailable';

export type InferenceMode =
  | 'prefer_on_device'
  | 'only_on_device'
  | 'prefer_in_cloud'
  | 'only_in_cloud'
  | 'auto';

export type OnDeviceAvailability =
  | 'readily' // Modèle téléchargé et prêt
  | 'after-download' // API présente, modèle à télécharger
  | 'no' // Matériel ou configuration insuffisante
  | 'unsupported'; // Navigateur / plateforme non compatible

export interface InferenceMetadata {
  /** Source réelle d'inférence certifiée par le SDK (ON_DEVICE vs IN_CLOUD) */
  source: InferenceSource;
  /** Mode initialement demandé par la tâche */
  modeRequested: InferenceMode;
  /** Nom du modèle ou moteur ayant traité la requête */
  modelName: string;
  /** Durée d'exécution réelle en millisecondes */
  durationMs: number;
  /** Horodatage ISO de l'inférence */
  timestamp: string;
  /** Indique si un repli cloud ou local a eu lieu */
  fallbackOccurred: boolean;
  /** Détails éventuels sur le repli */
  fallbackReason?: string;
  /** Fournisseur SDK d'exécution sous-jacent */
  sdkProvider?: 'firebase_ai_logic' | 'gemini_direct_fallback' | 'chrome_prompt_api';
  /** Tokens consommés si disponibles */
  tokenCount?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
}

export interface AIRequestAttachment {
  name: string;
  mimeType: string;
  data: string; // text content or base64
}

export interface AIRequestOptions {
  /** Texte ou consigne pour l'IA */
  prompt: string;
  /** Instructions système optionnelles */
  systemInstruction?: string;
  /** Mode d'inférence souhaité */
  mode?: InferenceMode;
  /** Exigence stricte de confidentialité : ne jamais router vers le cloud si vrai */
  localOnly?: boolean;
  /** Température de génération (0.0 à 1.0) */
  temperature?: number;
  /** Longueur maximale en tokens */
  maxOutputTokens?: number;
  /** Type de tâche (simple, reasoning, multimodale, etc.) */
  taskType?: 'simple_summary' | 'chat' | 'complex_reasoning' | 'multimodal' | 'heavy_reasoning' | 'lightweight';
  /** Callback optionnel pour le streaming temps réel */
  onStreamChunk?: (chunk: string, accumulated: string) => void;
  /** Fichiers ou pièces jointes (documents, code, texte) */
  attachments?: AIRequestAttachment[];
  /** Question brute de l'utilisateur, utilisée pour évaluer la complexité sans inclure le contexte injecté */
  userQuestion?: string;
  /** Signal d'annulation partagé pour le cycle de vie IA */
  signal?: AbortSignal;
}

export interface AIResponse {
  /** Texte généré par le modèle */
  text: string;
  /** Métadonnées d'inférence certifiées */
  metadata: InferenceMetadata;
}

export interface CapabilityReport {
  /** Navigateur compatible avec Prompt API / Web On-Device */
  browserSupported: boolean;
  /** Nom et version détectés du navigateur */
  browserDetails: string;
  /** Statut du modèle on-device Gemini Nano */
  onDeviceStatus: OnDeviceAvailability;
  /** Explication lisible pour l'utilisateur */
  onDeviceDetails: string;
  /** Détails d'environnement rétro-compatibles */
  details?: string;
  /** Mode recommandé rétro-compatible */
  recommendedMode?: string;
  /** État du réseau (en ligne / hors ligne) */
  networkOnline: boolean;
  /** Capacité à exécuter du local immédiatement */
  canRunLocal: boolean;
  /** Capacité à exécuter du cloud immédiatement */
  canRunCloud: boolean;
  /** Raisons ou étapes nécessaires si non disponible */
  recommendations: string[];
}
