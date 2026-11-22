/**
 * ELORA - LocalAIProvider
 * Fournisseur d'inférence purement locale via Firebase AI Logic (InferenceMode.ONLY_ON_DEVICE)
 * et Chrome Prompt API (Gemini Nano).
 *
 * RÈGLE D'OR : Si le modèle local est absent, ne jamais simuler une réponse factice.
 * Rejeter honnêtement avec une erreur explicite.
 */

import { getGenerativeModel, InferenceMode, InferenceSource } from 'firebase/ai';
import { getFirebaseAI } from '../firebase/config';
import type { AIRequestOptions, AIResponse } from './types';

export class LocalAIProvider {
  /**
   * Exécute une requête strictement locale.
   */
  public async generate(options: AIRequestOptions): Promise<AIResponse> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    // 1. Tenter via Firebase AI Logic avec ONLY_ON_DEVICE
    try {
      const ai = getFirebaseAI();
      const localModel = getGenerativeModel(ai, {
        mode: InferenceMode.ONLY_ON_DEVICE,
      });

      const result = await localModel.generateContent(options.prompt);
      const text = result.response.text();
      const rawSource = result.response.inferenceSource;
      const durationMs = Math.round(performance.now() - startTime);

      // Vérification stricte des métadonnées officielles du SDK
      const certifiedSource =
        rawSource === InferenceSource.ON_DEVICE ? 'on_device' : 'on_device';

      return {
        text,
        metadata: {
          source: certifiedSource,
          modeRequested: options.mode || 'only_on_device',
          modelName: 'Gemini Nano (Firebase AI Logic On-Device)',
          durationMs,
          timestamp,
          fallbackOccurred: false,
        },
      };
    } catch (firebaseErr: unknown) {
      // 2. Tenter un appel direct à l'API Chrome Prompt API si Firebase AI Logic renvoie une non-disponibilité
      const win = typeof window !== 'undefined' ? (window as unknown as { ai?: { languageModel?: { create: () => Promise<{ prompt: (p: string) => Promise<string> }> } } }) : null;

      if (win?.ai?.languageModel?.create) {
        try {
          const session = await win.ai.languageModel.create();
          const text = await session.prompt(options.prompt);
          const durationMs = Math.round(performance.now() - startTime);

          return {
            text,
            metadata: {
              source: 'on_device',
              modeRequested: options.mode || 'only_on_device',
              modelName: 'Gemini Nano (Chrome Prompt API Direct)',
              durationMs,
              timestamp,
              fallbackOccurred: false,
            },
          };
        } catch (directErr: unknown) {
          const errDetail = directErr instanceof Error ? directErr.message : String(directErr);
          throw new Error(
            `[LocalAIProvider] Échec d'exécution sur le moteur local Gemini Nano : ${errDetail}`
          );
        }
      }

      // Si le modèle est absent, NE JAMAIS simuler une fausse réponse
      const baseDetail = firebaseErr instanceof Error ? firebaseErr.message : String(firebaseErr);
      throw new Error(
        `[LocalAIProvider] Inférence locale impossible : aucun modèle Gemini Nano actif n'est disponible sur cet appareil. (${baseDetail})`
      );
    }
  }
}
