/**
 * ELORA - CloudAIProvider
 * Fournisseur d'inférence Cloud via Firebase AI Logic et Google Gemini API.
 *
 * Supporte la génération standard et le streaming temps réel (generateContentStream / SSE).
 * RÈGLE D'OR : Si le réseau est absent, rejeter immédiatement sans simuler d'inférence distante.
 */

import { getGenerativeModel, InferenceMode, InferenceSource } from 'firebase/ai';
import { getFirebaseAI } from '../firebase/config';
import type { AIRequestOptions, AIResponse } from './types';

export class CloudAIProvider {
  /**
   * Exécute une requête IA via Firebase AI Logic avec repli automatique sur Gemini Developer API.
   */
  public async generate(options: AIRequestOptions): Promise<AIResponse> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    // Vérification stricte de connectivité
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error(
        "ELORA est actuellement hors ligne. Connectez-vous à Internet pour activer l'intelligence Cloud."
      );
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY || '';

    // Construction du prompt enrichi avec pièces jointes si présentes
    let promptPayload = options.prompt;
    if (options.attachments && options.attachments.length > 0) {
      const attachmentContext = options.attachments
        .map((a) => `\n--- [Document joint : ${a.name} (${a.mimeType})] ---\n${a.data}\n--- [Fin document] ---`)
        .join('\n');
      promptPayload = `${promptPayload}\n\n${attachmentContext}`;
    }

    // 1. Première tentative : Firebase AI Logic (SDK officiel du hackathon)
    try {
      const ai = getFirebaseAI();
      const cloudModel = getGenerativeModel(ai, {
        mode: InferenceMode.ONLY_IN_CLOUD,
        inCloudParams: {
          model: 'gemini-2.5-flash',
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
          modelName: 'Gemini (Firebase AI Logic Cloud)',
          durationMs,
          timestamp,
          fallbackOccurred: false,
        },
      };
    } catch (firebaseErr: unknown) {
      console.warn('[CloudAIProvider] Repli sur Gemini Direct API :', firebaseErr);

      // 2. Repli direct sur l'API REST Google Gemini avec la clé configurée
      if (apiKey) {
        try {
          const directResponse = await this.generateViaGeminiREST(promptPayload, apiKey, options);
          const durationMs = Math.round(performance.now() - startTime);
          return {
            text: directResponse,
            metadata: {
              source: 'in_cloud',
              modeRequested: options.mode || 'only_in_cloud',
              modelName: 'Gemini Flash (Direct Cloud)',
              durationMs,
              timestamp,
              fallbackOccurred: true,
              fallbackReason: 'Firebase AI Logic fallback to Gemini REST endpoint',
            },
          };
        } catch (directErr) {
          const directMsg = directErr instanceof Error ? directErr.message : String(directErr);
          throw new Error(`[CloudAIProvider] Impossible de joindre le modèle Cloud Gemini : ${directMsg}`);
        }
      }

      const msg = firebaseErr instanceof Error ? firebaseErr.message : String(firebaseErr);
      throw new Error(`[CloudAIProvider] Échec de l'appel Firebase AI Logic Cloud : ${msg}`);
    }
  }

  /**
   * Appel direct de secours via l'API REST Google Gemini
   */
  private async generateViaGeminiREST(
    prompt: string,
    apiKey: string,
    options: AIRequestOptions
  ): Promise<string> {
    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          if (options.onStreamChunk) {
            options.onStreamChunk(text, text);
          }
          return text;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError || new Error("Échec de la génération sur l'ensemble des modèles Gemini.");
  }
}
