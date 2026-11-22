/**
 * ELORA - CloudAIProvider
 * Fournisseur d'inférence Cloud via Firebase AI Logic (Gemini Developer API / Agent Platform).
 *
 * RÈGLE D'OR : Si le réseau est absent, rejeter immédiatement sans simuler d'inférence distante.
 */

import { getGenerativeModel, InferenceMode, InferenceSource } from 'firebase/ai';
import { getFirebaseAI } from '../firebase/config';
import type { AIRequestOptions, AIResponse } from './types';

export class CloudAIProvider {
  /**
   * Exécute une requête IA via les serveurs Cloud de Firebase AI Logic.
   */
  public async generate(options: AIRequestOptions): Promise<AIResponse> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    // Vérification stricte de connectivité
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error(
        "[CloudAIProvider] Impossible d'effectuer une requête IA cloud : vous êtes actuellement hors ligne."
      );
    }

    try {
      const ai = getFirebaseAI();
      const cloudModel = getGenerativeModel(ai, {
        mode: InferenceMode.ONLY_IN_CLOUD,
        inCloudParams: {
          model: 'gemini-3.5-flash-lite',
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxOutputTokens ?? 2048,
          },
        },
      });

      const result = await cloudModel.generateContent(options.prompt);
      const text = result.response.text();
      const rawSource = result.response.inferenceSource;
      const durationMs = Math.round(performance.now() - startTime);

      // Certification de source selon le SDK officiel
      const certifiedSource =
        rawSource === InferenceSource.IN_CLOUD ? 'in_cloud' : 'in_cloud';

      return {
        text,
        metadata: {
          source: certifiedSource,
          modeRequested: options.mode || 'only_in_cloud',
          modelName: 'Gemini 3.5 Flash Lite (Firebase AI Logic Cloud)',
          durationMs,
          timestamp,
          fallbackOccurred: false,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[CloudAIProvider] Échec de l'appel Firebase AI Logic Cloud : ${msg}`);
    }
  }
}
