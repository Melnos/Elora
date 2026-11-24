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

export class CloudAIProvider {
  /**
   * Exécute une requête IA via Google Gemini API ou Firebase AI Logic.
   */
  public async generate(options: AIRequestOptions): Promise<AIResponse> {
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

    const apiKey =
      (typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY
        : '') ||
      proc?.env?.VITE_GEMINI_API_KEY ||
      proc?.env?.VITE_FIREBASE_API_KEY ||
      '';

    // Construction du prompt enrichi avec pièces jointes si présentes
    let promptPayload = options.prompt;
    if (options.attachments && options.attachments.length > 0) {
      const attachmentContext = options.attachments
        .map((a) => `\n--- [Document joint : ${a.name} (${a.mimeType})] ---\n${a.data}\n--- [Fin document] ---`)
        .join('\n');
      promptPayload = `${promptPayload}\n\n${attachmentContext}`;
    }

    // 1. Si une clé API Gemini directe est fournie (recommandé et vérifié avec statut 200)
    if (apiKey) {
      try {
        const restResult = await this.generateViaGeminiREST(promptPayload, apiKey, options);
        const durationMs = Math.round(performance.now() - startTime);
        return {
          text: restResult.text,
          metadata: {
            source: 'in_cloud',
            modeRequested: options.mode || 'only_in_cloud',
            modelName: `Google Gemini (${restResult.modelVersion})`,
            durationMs,
            timestamp,
            fallbackOccurred: false,
            tokenCount: restResult.tokenCount,
          },
        };
      } catch (geminiErr) {
        console.warn('[CloudAIProvider] Échec Gemini REST, repli Firebase AI Logic :', geminiErr);
      }
    }

    // 2. Repli / alternative : Firebase AI Logic (SDK officiel du hackathon)
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

      if (options.onStreamChunk) {
        const streamResult = await cloudModel.generateContentStream(promptPayload);
        for await (const chunk of streamResult.stream) {
          const chunkText = chunk.text();
          text += chunkText;
          options.onStreamChunk(chunkText, text);
        }
      } else {
        const result = await cloudModel.generateContent(promptPayload);
        text = result.response.text();
      }

      const durationMs = Math.round(performance.now() - startTime);

      return {
        text,
        metadata: {
          source: InferenceSource.IN_CLOUD ? 'in_cloud' : 'in_cloud',
          modeRequested: options.mode || 'only_in_cloud',
          modelName: 'Gemini 3.5 Flash Lite (Firebase AI Logic Cloud)',
          durationMs,
          timestamp,
          fallbackOccurred: false,
        },
      };
    } catch (firebaseErr: unknown) {
      const msg = firebaseErr instanceof Error ? firebaseErr.message : String(firebaseErr);
      throw new Error(`[CloudAIProvider] Échec de l'appel Cloud : ${msg}`);
    }
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
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.7-flash',
    ];
    let lastError: Error | null = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError || new Error("Échec de la génération sur l'ensemble des modèles Gemini.");
  }
}
