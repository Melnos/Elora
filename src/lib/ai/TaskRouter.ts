/**
 * ELORA - TaskRouter
 * Routeur décisionnel intelligent respectant scrupuleusement :
 * - Le mode de confidentialité (localOnly ne doit JAMAIS fuiter vers le cloud)
 * - L'état de connectivité réseau
 * - La disponibilité et l'état de préparation du modèle local
 * - La nature de la tâche (simple résumé vs raisonnement complexe)
 */

import { CapabilityDetector } from './CapabilityDetector';
import type { AIRequestOptions, InferenceMode, CapabilityReport } from './types';

export interface RouteDecision {
  /** Décision de ciblage : local ou cloud */
  target: 'local' | 'cloud';
  /** Mode d'inférence à configurer */
  effectiveMode: InferenceMode;
  /** Explication de la décision prise pour transparence */
  reason: string;
  /** Repli autorisé vers le cloud si le local échoue (interdit si localOnly) */
  fallbackToCloudAllowed: boolean;
}

export class TaskRouter {
  /**
   * Évalue la requête et détermine la voie d'inférence optimale et conforme.
   * Accepte un rapport de capacités injecté (pour tests unitaires et DI).
   */
  public static async route(options: AIRequestOptions, injectedCaps?: CapabilityReport): Promise<RouteDecision> {
    const caps = injectedCaps || await CapabilityDetector.detect();

    // 1. Exigence stricte de confidentialité (Local-Only)
    if (options.localOnly || options.mode === 'only_on_device') {
      if (!caps.canRunLocal) {
        throw new Error(
          "[TaskRouter - Règle de confidentialité] Cette requête exige un traitement local exclusif, mais le modèle Gemini Nano n'est pas disponible sur cet appareil. Aucun transfert vers le cloud n'est autorisé."
        );
      }
      return {
        target: 'local',
        effectiveMode: 'only_on_device',
        reason: 'Traitement purement local imposé par la politique de confidentialité.',
        fallbackToCloudAllowed: false,
      };
    }

    // 2. Mode forcé Cloud
    if (options.mode === 'only_in_cloud') {
      if (!caps.networkOnline) {
        throw new Error(
          '[TaskRouter] Inférence cloud demandée mais le terminal est actuellement hors ligne.'
        );
      }
      return {
        target: 'cloud',
        effectiveMode: 'only_in_cloud',
        reason: 'Mode Cloud spécifié explicitement.',
        fallbackToCloudAllowed: false,
      };
    }

    // 3. Situation hors ligne (Réseau coupé)
    if (!caps.networkOnline) {
      if (caps.canRunLocal) {
        return {
          target: 'local',
          effectiveMode: 'only_on_device',
          reason: 'Réseau déconnecté : exécution sur le moteur local Gemini Nano disponible.',
          fallbackToCloudAllowed: false,
        };
      }
      throw new Error(
        "[TaskRouter] Vous êtes hors ligne et aucun moteur d'IA locale n'est disponible sur cet appareil. Vos données synchronisées restent accessibles."
      );
    }

    // 4. Mode explicite : Préférence Locale (prefer_on_device)
    if (options.mode === 'prefer_on_device') {
      if (caps.canRunLocal) {
        return {
          target: 'local',
          effectiveMode: 'prefer_on_device',
          reason: 'Préférence locale demandée : exécution sur Gemini Nano avec repli Cloud autorisé en cas d\'échec.',
          fallbackToCloudAllowed: true,
        };
      }
      return {
        target: 'cloud',
        effectiveMode: 'prefer_on_device',
        reason: 'Préférence locale demandée mais Gemini Nano n\'est pas prêt : réorientation vers le Cloud Gemini Flash.',
        fallbackToCloudAllowed: false,
      };
    }

    // 5. Mode Auto / Hybride intelligent : Analyse de la complexité de la tâche
    const isHeavyTask =
      options.taskType === 'complex_reasoning' ||
      options.taskType === 'multimodal' ||
      options.taskType === 'heavy_reasoning' ||
      (options.attachments && options.attachments.length > 0) ||
      (options.userQuestion ?? options.prompt).length > 2000;

    if (isHeavyTask) {
      return {
        target: 'cloud',
        effectiveMode: 'prefer_in_cloud',
        reason: 'Tâche complexe ou volumineuse : routage vers l\'intelligence Cloud pour puissance et contexte étendu.',
        fallbackToCloudAllowed: false,
      };
    }

    // 6. Tâche légère éligible au traitement on-device
    if (caps.canRunLocal) {
      return {
        target: 'local',
        effectiveMode: 'prefer_on_device',
        reason: 'Tâche éligible au traitement on-device : exécution locale via Gemini Nano.',
        fallbackToCloudAllowed: true,
      };
    }

    return {
      target: 'cloud',
      effectiveMode: 'prefer_in_cloud',
      reason: 'Moteur local indisponible : routage vers Firebase AI Logic Cloud (Gemini 3.5 Flash Lite).',
      fallbackToCloudAllowed: false,
    };
  }
}
