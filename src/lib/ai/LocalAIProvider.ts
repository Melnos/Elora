/**
 * ELORA - LocalAIProvider
 * Fournisseur d'inférence purement locale via Firebase AI Logic (InferenceMode.ONLY_ON_DEVICE).
 *
 * Contrat officiel @firebase/ai@3.1.0 :
 * - Nécessite globalThis.LanguageModel / window.LanguageModel (Chrome Built-in AI / Gemini Nano)
 * - Génération à un seul tour (single-turn) via ChromeAdapterImpl
 *
 * RÈGLE D'OR :
 * - Si LanguageModel est absent, ne JAMAIS appeler getGenerativeModel (car @firebase/ai@3.1.0
 *   tenterait un appel Cloud si chromeAdapter est undefined) et ne JAMAIS simuler de réponse.
 * - Zéro appel direct contournant Firebase AI Logic.
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

export class LocalAIProvider {
  /**
   * Vérifie la présence du contrat officiel LanguageModel attendu par @firebase/ai@3.1.0.
   */
  public static hasOfficialLanguageModel(): boolean {
    const globalLM =
      typeof globalThis !== 'undefined'
        ? (globalThis as unknown as { LanguageModel?: { availability?: unknown; create?: unknown } }).LanguageModel
        : undefined;
    const winLM =
      typeof window !== 'undefined'
        ? (window as unknown as { LanguageModel?: { availability?: unknown; create?: unknown } }).LanguageModel
        : undefined;
    const lm = globalLM || winLM;
    return Boolean(lm && typeof lm.availability === 'function' && typeof lm.create === 'function');
  }

  /**
   * Exécute une requête strictement locale via Firebase AI Logic Hybrid Inference (ONLY_ON_DEVICE).
   */
  public async generate(options: AIRequestOptions): Promise<AIResponse> {
    if (options.signal?.aborted) {
      throw createAbortError();
    }

    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    // Garde absolu anti-fuite Cloud : si LanguageModel est absent, rejeter AVANT tout appel SDK
    if (!LocalAIProvider.hasOfficialLanguageModel()) {
      throw new Error(
        "[LocalAIProvider] Inférence locale impossible : l'API officielle LanguageModel (Gemini Nano) n'est pas disponible sur cet appareil. Aucun transfert Cloud effectué."
      );
    }

    // Vérifier aussi la disponibilité réelle avant d'invoquer @firebase/ai
    const lm =
      (typeof globalThis !== 'undefined'
        ? (globalThis as unknown as { LanguageModel?: { availability?: () => Promise<string> } }).LanguageModel
        : undefined) ||
      (typeof window !== 'undefined'
        ? (window as unknown as { LanguageModel?: { availability?: () => Promise<string> } }).LanguageModel
        : undefined);
    if (lm && typeof lm.availability === 'function') {
      const avail = String(await lm.availability()).toLowerCase();
      if (options.signal?.aborted) {
        throw createAbortError();
      }
      if (avail === 'unavailable' || avail === 'no') {
        throw new Error(
          `[LocalAIProvider] Gemini Nano indisponible sur ce matériel (statut="${avail}"). Aucun transfert Cloud effectué.`
        );
      }
    }

    let promptPayload = options.prompt;
    if (options.attachments && options.attachments.length > 0) {
      const attachmentContext = options.attachments
        .map((a) => `\n--- [Document joint : ${a.name}] ---\n${a.data}\n--- [Fin document] ---`)
        .join('\n');
      promptPayload = `${promptPayload}\n\n${attachmentContext}`;
    }

    try {
      if (options.signal?.aborted) {
        throw createAbortError();
      }

      const ai = getFirebaseAI();
      const localModel = getGenerativeModel(ai, {
        mode: InferenceMode.ONLY_ON_DEVICE,
      });

      let text = '';
      let rawSource: InferenceSource | undefined;

      if (options.onStreamChunk) {
        const streamResult = await localModel.generateContentStream(promptPayload);
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
        rawSource = finalResp.inferenceSource;
      } else {
        const result = await localModel.generateContent(promptPayload);
        if (options.signal?.aborted) {
          throw createAbortError();
        }
        text = result.response.text();
        rawSource = result.response.inferenceSource;
      }

      if (rawSource !== InferenceSource.ON_DEVICE) {
        throw new Error(
          `[LocalAIProvider] Violation de politique locale : le SDK a rapporté inferenceSource="${String(rawSource)}" au lieu de "on_device".`
        );
      }

      const durationMs = Math.round(performance.now() - startTime);

      return {
        text,
        metadata: {
          source: 'on_device',
          modeRequested: options.mode || 'only_on_device',
          modelName: 'Gemini Nano (Firebase AI Logic On-Device)',
          durationMs,
          timestamp,
          fallbackOccurred: false,
          sdkProvider: 'firebase_ai_logic',
        },
      };
    } catch (firebaseErr: unknown) {
      if (isAbortError(firebaseErr) || options.signal?.aborted) {
        throw isAbortError(firebaseErr) ? firebaseErr : createAbortError();
      }
      const baseDetail = firebaseErr instanceof Error ? firebaseErr.message : String(firebaseErr);
      throw new Error(
        `[LocalAIProvider] Inférence locale Firebase AI Logic indisponible ou échouée : ${baseDetail}`
      );
    }
  }
}
