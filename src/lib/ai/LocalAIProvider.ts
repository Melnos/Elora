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

    let promptPayload = options.prompt;
    if (options.attachments && options.attachments.length > 0) {
      const attachmentContext = options.attachments
        .map((a) => `\n--- [Document joint : ${a.name}] ---\n${a.data}\n--- [Fin document] ---`)
        .join('\n');
      promptPayload = `${promptPayload}\n\n${attachmentContext}`;
    }

    // 1. Tenter via Firebase AI Logic avec ONLY_ON_DEVICE
    try {
      const ai = getFirebaseAI();
      const localModel = getGenerativeModel(ai, {
        mode: InferenceMode.ONLY_ON_DEVICE,
      });

      let text = '';
      if (options.onStreamChunk) {
        const streamResult = await localModel.generateContentStream(promptPayload);
        for await (const chunk of streamResult.stream) {
          const chunkText = chunk.text();
          text += chunkText;
          options.onStreamChunk(chunkText, text);
        }
      } else {
        const result = await localModel.generateContent(promptPayload);
        text = result.response.text();
      }

      const durationMs = Math.round(performance.now() - startTime);

      return {
        text,
        metadata: {
          source: InferenceSource.ON_DEVICE ? 'on_device' : 'on_device',
          modeRequested: options.mode || 'only_on_device',
          modelName: 'Gemini Nano (Firebase AI Logic On-Device)',
          durationMs,
          timestamp,
          fallbackOccurred: false,
        },
      };
    } catch (firebaseErr: unknown) {
      // 2. Tenter un appel direct à l'API Chrome Prompt API si Firebase AI Logic renvoie une non-disponibilité
      const win = typeof window !== 'undefined'
        ? (window as unknown as {
            ai?: {
              languageModel?: {
                create: () => Promise<{
                  prompt: (p: string) => Promise<string>;
                  promptStreaming?: (p: string) => AsyncIterable<string> | ReadableStream<string>;
                }>;
              };
            };
          })
        : null;

      if (win?.ai?.languageModel?.create) {
        try {
          const session = await win.ai.languageModel.create();
          let text = '';

          if (options.onStreamChunk && typeof session.promptStreaming === 'function') {
            const stream = session.promptStreaming(promptPayload);
            // Handling both AsyncIterable and ReadableStream
            if (Symbol.asyncIterator in Object(stream)) {
              for await (const chunk of stream as AsyncIterable<string>) {
                text = chunk; // Chrome promptStreaming emits full accumulated text
                options.onStreamChunk(chunk, text);
              }
            } else {
              text = await session.prompt(promptPayload);
              options.onStreamChunk(text, text);
            }
          } else {
            text = await session.prompt(promptPayload);
          }

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
