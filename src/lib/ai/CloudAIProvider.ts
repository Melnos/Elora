/**
 * ELORA - CloudAIProvider
 * Fournisseur d'inférence Cloud via Google Gemini Developer API et Firebase AI Logic.
 *
 * Supporte la génération standard et le streaming temps réel.
 * RÈGLE D'OR : Si le réseau est absent, rejeter immédiatement sans simuler d'inférence distante.
 */

import { getGenerativeModel, InferenceMode, InferenceSource } from 'firebase/ai';
import { getFirebaseAI } from '../firebase/config';
import type { AIRequestOptions, AIResponse } from './types';

function createAbortError(): DOMException {
  return new DOMException("Génération annulée par l'utilisateur.", 'AbortError');
}

function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError';
}

async function closeStreamSafely(stream: unknown): Promise<void> {
  const closable = stream as { return?: () => Promise<unknown> } | null | undefined;
  if (closable && typeof closable.return === 'function') {
    await closable.return().catch(() => undefined);
  }
}

export class CloudAIProvider {
  /**
   * Exécute une requête IA via Google Gemini API ou Firebase AI Logic.
   */
  public async generate(options: AIRequestOptions): Promise<AIResponse> {
    if (options.signal?.aborted) {
      throw createAbortError();
    }

    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    // Vérification stricte de connectivité
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine) {
      throw new Error(
        "ELORA est actuellement hors ligne. Connectez-vous à Internet pour activer l'intelligence Cloud."
      );
    }

    const proc = typeof globalThis !== 'undefined'
      ? (globalThis as unknown as { process?: { env?: Record<string, string> } }).process
      : undefined;

    // Sécurité production navigateur : ne jamais appeler generativelanguage.googleapis.com
    // depuis le navigateur et ne jamais utiliser la clé Firebase Web comme clé Gemini.
    // Le repli Node/CLI reste strictement isolé hors navigateur avec process.env.VITE_GEMINI_API_KEY.
    const isBrowserRuntime = typeof window !== 'undefined';
    const nodeGeminiApiKey = !isBrowserRuntime ? proc?.env?.VITE_GEMINI_API_KEY || '' : '';

    // Construction du prompt enrichi avec pièces jointes si présentes
    let promptPayload = options.prompt;
    if (options.attachments && options.attachments.length > 0) {
      const attachmentContext = options.attachments
        .map((a) => `\n--- [Document joint : ${a.name} (${a.mimeType})] ---\n${a.data}\n--- [Fin document] ---`)
        .join('\n');
      promptPayload = `${promptPayload}\n\n${attachmentContext}`;
    }

    // 1. Voie d'architecture principale : Firebase AI Logic (SDK Officiel du Hackathon #BuildHybridAI)
    let firebaseError: Error | null = null;
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

      let text = '';
      let certifiedSource: 'in_cloud' | 'on_device' = 'in_cloud';

      if (options.onStreamChunk) {
        try {
          if (options.signal?.aborted) {
            throw createAbortError();
          }

          const streamResult = await cloudModel.generateContentStream(promptPayload);
          // Empêcher toute erreur "Uncaught (in promise)" si .stream échoue avant .response
          streamResult.response.catch(() => undefined);

          if (options.signal?.aborted) {
            await closeStreamSafely(streamResult.stream);
            throw createAbortError();
          }

          for await (const chunk of streamResult.stream) {
            if (options.signal?.aborted) {
              await closeStreamSafely(streamResult.stream);
              throw createAbortError();
            }
            const chunkText = chunk.text();
            text += chunkText;
            options.onStreamChunk(chunkText, text);
          }

          if (options.signal?.aborted) {
            throw createAbortError();
          }

          const finalResp = await streamResult.response;
          if (options.signal?.aborted) {
            throw createAbortError();
          }
          if (finalResp.inferenceSource === InferenceSource.ON_DEVICE) {
            certifiedSource = 'on_device';
          }
        } catch (streamErr: unknown) {
          if (isAbortError(streamErr) || options.signal?.aborted) {
            throw isAbortError(streamErr) ? streamErr : createAbortError();
          }
          const msg = streamErr instanceof Error ? streamErr.message : String(streamErr);
          const isTransientStreamErr =
            msg.includes('503') ||
            msg.includes('parse-failed') ||
            msg.includes('UNAVAILABLE') ||
            msg.includes('fetch-error');
          if (!isTransientStreamErr) {
            throw streamErr;
          }
          // Seconde tentative Firebase AI Logic en mode non-streamé (évite les erreurs SSE / 503 transitoires)
          await new Promise((r) => setTimeout(r, 350));
          if (options.signal?.aborted) {
            throw createAbortError();
          }
          const retryResult = await cloudModel.generateContent(promptPayload);
          if (options.signal?.aborted) {
            throw createAbortError();
          }
          text = retryResult.response.text();
          if (retryResult.response.inferenceSource === InferenceSource.ON_DEVICE) {
            certifiedSource = 'on_device';
          }
          if (text) {
            options.onStreamChunk(text, text);
          }
        }
      } else {
        const result = await cloudModel.generateContent(promptPayload);
        if (options.signal?.aborted) {
          throw createAbortError();
        }
        text = result.response.text();
        if (result.response.inferenceSource === InferenceSource.ON_DEVICE) {
          certifiedSource = 'on_device';
        }
      }

      const durationMs = Math.round(performance.now() - startTime);

      return {
        text,
        metadata: {
          source: certifiedSource,
          modeRequested: options.mode || 'only_in_cloud',
          modelName: 'Gemini 3.5 Flash Lite (Firebase AI Logic Cloud)',
          durationMs,
          timestamp,
          fallbackOccurred: false,
          sdkProvider: 'firebase_ai_logic',
        },
      };
    } catch (fbErr: unknown) {
      if (isAbortError(fbErr) || options.signal?.aborted) {
        throw isAbortError(fbErr) ? fbErr : createAbortError();
      }
      firebaseError = fbErr instanceof Error ? fbErr : new Error(String(fbErr));
      console.warn('[CloudAIProvider] Note Firebase AI Logic (backend/App Check) :', firebaseError.message);
    }

    // 2. Filet de résilience strictement réservé à l'environnement Node/CLI (jamais dans le navigateur)
    if (!isBrowserRuntime && nodeGeminiApiKey) {
      try {
        if (options.signal?.aborted) {
          throw createAbortError();
        }
        const restResult = await this.generateViaGeminiREST(promptPayload, nodeGeminiApiKey, options);
        const durationMs = Math.round(performance.now() - startTime);
        return {
          text: restResult.text,
          metadata: {
            source: 'in_cloud',
            modeRequested: options.mode || 'only_in_cloud',
            modelName: `Google Gemini (${restResult.modelVersion}) [Repli Résilience]`,
            durationMs,
            timestamp,
            fallbackOccurred: true,
            fallbackReason: `Inférence Cloud via connecteur de secours (${firebaseError?.message || 'Firebase AI Logic hors portée'})`,
            sdkProvider: 'gemini_direct_fallback',
            tokenCount: restResult.tokenCount,
          },
        };
      } catch (geminiErr) {
        if (isAbortError(geminiErr) || options.signal?.aborted) {
          throw isAbortError(geminiErr) ? geminiErr : createAbortError();
        }
        console.warn('[CloudAIProvider] Échec repli Gemini REST :', geminiErr);
      }
    }

    throw new Error(
      `[CloudAIProvider] Échec de l'appel Cloud : ${firebaseError?.message || "Impossible de contacter l'intelligence Cloud."}`
    );
  }

  /**
   * Appel direct via l'API REST Google Gemini (modèle vérifié fonctionnel avec la clé utilisateur)
   */
  private async generateViaGeminiREST(
    prompt: string,
    apiKey: string,
    options: AIRequestOptions
  ): Promise<{
    text: string;
    modelVersion: string;
    tokenCount?: { promptTokens?: number; candidatesTokens?: number; totalTokens?: number };
  }> {
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest',
    ];
    let lastError: Error | null = null;

    for (const model of candidateModels) {
      if (options.signal?.aborted) {
        throw createAbortError();
      }
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: options.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxOutputTokens ?? 2048,
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Erreur HTTP ${response.status} (${model}): ${errBody}`);
        }

        const data = await response.json();
        if (options.signal?.aborted) {
          throw createAbortError();
        }
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const text = parts.map((p: { text?: string }) => p.text || '').join('');
        if (text) {
          if (options.onStreamChunk) {
            options.onStreamChunk(text, text);
          }
          return {
            text,
            modelVersion: data?.modelVersion || model,
            tokenCount: data?.usageMetadata
              ? {
                  promptTokens: data.usageMetadata.promptTokenCount,
                  candidatesTokens: data.usageMetadata.candidatesTokenCount,
                  totalTokens: data.usageMetadata.totalTokenCount,
                }
              : undefined,
          };
        }
      } catch (err) {
        if (isAbortError(err) || options.signal?.aborted) {
          throw isAbortError(err) ? err : createAbortError();
        }
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError || new Error("Échec de la génération sur l'ensemble des modèles Gemini.");
  }
}
