/**
 * ELORA - CapabilityDetector
 * Détection en temps réel des capacités on-device (Gemini Nano / Chrome Prompt API),
 * de l'état réseau et de la compatibilité matérielle.
 */

import type { CapabilityReport, OnDeviceAvailability } from './types';

// Types pour l'API Chrome Prompt API (window.ai)
interface ChromeLanguageModel {
  capabilities?: (options?: unknown) => Promise<{ available: string }>;
  availability?: (options?: unknown) => Promise<string>;
  create?: (options?: unknown) => Promise<unknown>;
}

interface WindowWithAI extends Window {
  ai?: {
    languageModel?: ChromeLanguageModel;
    assistant?: ChromeLanguageModel;
  };
  model?: ChromeLanguageModel;
}

export class CapabilityDetector {
  /**
   * Analyse complète et asynchrone des capacités du terminal client.
   */
  public static async detect(): Promise<CapabilityReport> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isChrome = /Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent);
    const win = (typeof window !== 'undefined' ? window : {}) as WindowWithAI;

    // Détection du fournisseur de modèle on-device
    const lmProvider = win.ai?.languageModel || win.ai?.assistant;

    let onDeviceStatus: OnDeviceAvailability = 'unsupported';
    let onDeviceDetails = 'API on-device non détectée dans cet environnement.';
    const recommendations: string[] = [];

    if (!isChrome) {
      onDeviceStatus = 'unsupported';
      onDeviceDetails = 'Gemini Nano Web nécessite actuellement Google Chrome (Desktop).';
      recommendations.push("Utilisez Google Chrome pour activer l'inférence locale Gemini Nano.");
    } else if (lmProvider) {
      try {
        let rawAvail = '';
        if (typeof lmProvider.availability === 'function') {
          rawAvail = await lmProvider.availability();
        } else if (typeof lmProvider.capabilities === 'function') {
          const cap = await lmProvider.capabilities();
          rawAvail = cap?.available || 'readily';
        } else {
          rawAvail = 'readily';
        }

        const normalized = rawAvail.toLowerCase();
        if (normalized === 'readily' || normalized === 'available') {
          onDeviceStatus = 'readily';
          onDeviceDetails = 'Gemini Nano est téléchargé et prêt pour inférence locale immédiate.';
        } else if (normalized === 'after-download' || normalized === 'downloading') {
          onDeviceStatus = 'after-download';
          onDeviceDetails = 'Le moteur local est pris en charge mais le modèle doit être téléchargé (~4 Go).';
          recommendations.push("Consentez au téléchargement du modèle local dans les paramètres d'ELORA.");
        } else {
          onDeviceStatus = 'no';
          onDeviceDetails = 'Configuration matérielle ou drapeaux expérimentaux non satisfaits.';
          recommendations.push('Vérifiez chrome://flags/#optimization-guide-on-device-model');
          recommendations.push('Vérifiez chrome://flags/#prompt-api-for-gemini-nano');
        }
      } catch (err) {
        onDeviceStatus = 'no';
        onDeviceDetails = `Erreur lors de la détection du modèle local : ${err instanceof Error ? err.message : String(err)}`;
      }
    } else {
      // Chrome sans API activée
      onDeviceStatus = 'no';
      onDeviceDetails = "L'API expérimentale Prompt API de Chrome n'est pas encore activée.";
      recommendations.push("Activer 'Prompt API for Gemini Nano' dans chrome://flags/#prompt-api-for-gemini-nano");
      recommendations.push("Activer 'Optimization Guide On-Device Model' (BypassPerfRequirement) dans chrome://flags/#optimization-guide-on-device-model");
      recommendations.push("Vérifier les composants dans chrome://components ('Optimization Guide On-Device Model')");
    }

    const canRunLocal = onDeviceStatus === 'readily';
    const canRunCloud = isOnline;

    return {
      browserSupported: isChrome,
      browserDetails: userAgent.split(' ').slice(-2).join(' ') || 'Environnement inconnu',
      onDeviceStatus,
      onDeviceDetails,
      networkOnline: isOnline,
      canRunLocal,
      canRunCloud,
      recommendations,
    };
  }
}
