/**
 * ELORA - AI Orchestrator
 * Couche centrale d'orchestration de l'intelligence hybride.
 *
 * Responsabilités :
 * - Fournir une API applicative stable et indépendante des SDKs sous-jacents
 * - Détecter les capacités et router les demandes (TaskRouter)
 * - Coordonner LocalAIProvider et CloudAIProvider
 * - Enregistrer la source certifiée de chaque réponse (InferenceMetadata)
 * - Garantir le respect absolu de la confidentialité et de la vérité
 */

import { getGenerativeModel, InferenceMode, InferenceSource } from 'firebase/ai';
import { getFirebaseAI } from '../firebase/config';
import { CapabilityDetector } from './CapabilityDetector';
import { CloudAIProvider } from './CloudAIProvider';
import { LocalAIProvider } from './LocalAIProvider';
import { TaskRouter } from './TaskRouter';
import type { AIRequestOptions, AIResponse, CapabilityReport } from './types';

function createAbortError(): DOMException {
  return new DOMException("Génération annulée par l'utilisateur.", 'AbortError');
}

function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError';
}

export class AIOrchestrator {
  private localProvider: LocalAIProvider;
  private cloudProvider: CloudAIProvider;
  private activeAbortController: AbortController | null = null;

  constructor() {
    this.localProvider = new LocalAIProvider();
    this.cloudProvider = new CloudAIProvider();
  }

  /**
   * Annule proprement la génération IA en cours, le cas échéant.
   */
  public cancelCurrent(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort(createAbortError());
      this.activeAbortController = null;
    }
  }

  /**
   * Diagnostic complet de l'environnement client.
   */
  public async getCapabilities(): Promise<CapabilityReport> {
    return CapabilityDetector.detect();
  }

  /**
   * Point d'entrée principal pour soumettre une consigne ou message à ELORA.
   */
  public async process(options: AIRequestOptions): Promise<AIResponse> {
    if (options.signal?.aborted) {
      throw createAbortError();
    }

    // Garde anti-concurrence : annule proprement toute génération précédente encore active
    if (this.activeAbortController) {
      this.cancelCurrent();
    }

    const controller = new AbortController();
    this.activeAbortController = controller;

    const onExternalAbort = () => {
      controller.abort(options.signal?.reason ?? createAbortError());
    };
    if (options.signal) {
      options.signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    const effectiveOptions: AIRequestOptions = {
      ...options,
      signal: controller.signal,
    };

    try {
      // 1. Détermination de la route d'exécution
      const decision = await TaskRouter.route(effectiveOptions);

      if (controller.signal.aborted) {
        throw createAbortError();
      }

      // 2. Exécution selon la cible
      if (decision.target === 'local') {
        try {
          return await this.localProvider.generate({
            ...effectiveOptions,
            mode: decision.effectiveMode,
          });
        } catch (localErr: unknown) {
          // Ne JAMAIS basculer vers le Cloud si la requête a été annulée
          if (isAbortError(localErr) || controller.signal.aborted) {
            throw isAbortError(localErr) ? localErr : createAbortError();
          }

          // Si le repli vers le cloud est interdit (mode confidentiel/localOnly)
          if (!decision.fallbackToCloudAllowed) {
            throw localErr;
          }

          // Si le repli est autorisé et que nous sommes en ligne
          const caps = await CapabilityDetector.detect();
          if (controller.signal.aborted) {
            throw createAbortError();
          }
          if (caps.networkOnline) {
            const cloudResp = await this.cloudProvider.generate({
              ...effectiveOptions,
              mode: 'prefer_on_device',
            });

            // Enregistrement explicite du repli
            cloudResp.metadata.fallbackOccurred = true;
            cloudResp.metadata.fallbackReason = `Moteur local indisponible (${localErr instanceof Error ? localErr.message : String(localErr)}) - Bascule transparente vers Cloud`;
            return cloudResp;
          }

          throw localErr;
        }
      }

      // 3. Exécution Cloud directe
      return await this.cloudProvider.generate({
        ...effectiveOptions,
        mode: decision.effectiveMode,
      });
    } finally {
      if (options.signal) {
        options.signal.removeEventListener('abort', onExternalAbort);
      }
      if (this.activeAbortController === controller) {
        this.activeAbortController = null;
      }
    }
  }

  /**
   * Méthode de démonstration directe du mode hybride natif de Firebase AI Logic (PREFER_ON_DEVICE).
   * Permet de certifier comment le SDK Firebase arbitre lui-même entre local et cloud.
   */
  public async executeNativeFirebaseHybrid(prompt: string): Promise<AIResponse> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    const ai = getFirebaseAI();
    const hybridModel = getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      inCloudParams: {
        model: 'gemini-3.5-flash-lite',
      },
    });

    const result = await hybridModel.generateContent(prompt);
    const text = result.response.text();
    const durationMs = Math.round(performance.now() - startTime);

    // Récupération de la source certifiée directement depuis le SDK
    const rawSource = result.response.inferenceSource;
    const isLocal = rawSource === InferenceSource.ON_DEVICE;

    return {
      text,
      metadata: {
        source: isLocal ? 'on_device' : 'in_cloud',
        modeRequested: 'prefer_on_device',
        modelName: isLocal
          ? 'Gemini Nano (On-Device via Firebase AI Logic)'
          : 'Gemini 3.5 Flash Lite (In-Cloud via Firebase AI Logic)',
        durationMs,
        timestamp,
        fallbackOccurred: !isLocal,
        sdkProvider: 'firebase_ai_logic',
        fallbackReason: isLocal
          ? undefined
          : 'Moteur local non prêt ou conditions non satisfaites, Firebase AI Logic a utilisé le Cloud.',
      },
    };
  }
}

// Instance singleton
export const orchestrator = new AIOrchestrator();
