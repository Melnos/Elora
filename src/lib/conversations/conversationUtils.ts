/**
 * ELORA - Utilitaires purs pour la gestion des conversations (Discussions / Historique)
 * - Génération automatique de titres (<= 45 caractères, sans couper de mot)
 * - Formatage dynamique des dates relatives sans erreur de fuseau horaire
 * - Tri chronologique décroissant par updatedAt / createdAt
 */

import type { Conversation } from '../../types';

export const DEFAULT_CONVERSATION_TITLE = 'Nouvelle conversation';
export const MAX_AUTO_TITLE_LENGTH = 45;
export const MAX_CONVERSATION_TITLE_LENGTH = 300;

/**
 * Génère un titre lisible à partir du premier message utilisateur (<= 45 caractères).
 */
export function generateConversationTitle(firstMessage: string): string {
  const cleaned = (firstMessage || '')
    .replace(/[`*_#>\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return DEFAULT_CONVERSATION_TITLE;
  if (cleaned.length <= MAX_AUTO_TITLE_LENGTH) return cleaned;

  const slice = cleaned.slice(0, MAX_AUTO_TITLE_LENGTH - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 12 ? slice.slice(0, lastSpace) : slice;
  return `${base.trim()}…`;
}

function getTimestampMs(conv: Pick<Conversation, 'updatedAt' | 'createdAt'>): number {
  const iso = conv.updatedAt || conv.createdAt;
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Trie les conversations par date de mise à jour décroissante (la plus récente en premier).
 */
export function sortConversationsByDate(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => getTimestampMs(b) - getTimestampMs(a));
}

/**
 * Formate dynamiquement la date relative d'une conversation sans date figée ni décalage UTC.
 */
export function formatConversationRelativeDate(
  conv: Pick<Conversation, 'updatedAt' | 'createdAt' | 'lastActive'>,
  now: Date = new Date()
): string {
  const iso = conv.updatedAt || conv.createdAt;
  if (!iso) {
    return conv.lastActive || 'Récemment';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return conv.lastActive || 'Récemment';
  }

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0 || diffMs < 60_000) {
    return "À l'instant";
  }

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) {
    return `Il y a ${diffMin} min`;
  }

  const timeStr = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (dayDiff === 0) {
    return `Aujourd'hui à ${timeStr}`;
  }
  if (dayDiff === 1) {
    return `Hier à ${timeStr}`;
  }
  if (date.getFullYear() === now.getFullYear()) {
    const dayMonth = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    return `${dayMonth} à ${timeStr}`;
  }
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
