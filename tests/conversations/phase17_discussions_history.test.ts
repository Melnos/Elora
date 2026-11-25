import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateConversationTitle,
  formatConversationRelativeDate,
  sortConversationsByDate,
  DEFAULT_CONVERSATION_TITLE,
} from '../../src/lib/conversations/conversationUtils';
import { mergeCollectionById } from '../../src/lib/firebase/firestore';
import type { Conversation } from '../../src/types';

describe('Phase 17 — Discussions / Historique : Titres, Dates, Tri & Accessibilité', () => {
  it('1. generateConversationTitle génère un titre <= 45 chars sans couper de mot inutilement', () => {
    strictEqual(generateConversationTitle('   '), DEFAULT_CONVERSATION_TITLE);
    strictEqual(generateConversationTitle('Systèmes embarqués'), 'Systèmes embarqués');

    const longPrompt = 'Explique-moi en détail comment fonctionne un système embarqué temps réel.';
    const title = generateConversationTitle(longPrompt);
    ok(title.length <= 45, `Titre trop long: ${title.length}`);
    ok(title.endsWith('…'));
    ok(!title.includes('fonct…'), 'Ne doit pas couper un mot en plein milieu');
  });

  it('2. formatConversationRelativeDate calcule dynamiquement les dates relatives et reste rétro-compatible', () => {
    const now = new Date('2026-11-25T15:00:00');
    strictEqual(
      formatConversationRelativeDate({ updatedAt: '2026-11-25T14:59:30', lastActive: 'x' }, now),
      "À l'instant"
    );
    strictEqual(
      formatConversationRelativeDate({ updatedAt: '2026-11-25T14:45:00', lastActive: 'x' }, now),
      'Il y a 15 min'
    );
    ok(
      formatConversationRelativeDate({ updatedAt: '2026-11-25T10:15:00', lastActive: 'x' }, now).startsWith(
        "Aujourd'hui à"
      )
    );
    ok(
      formatConversationRelativeDate({ updatedAt: '2026-11-24T18:30:00', lastActive: 'x' }, now).startsWith(
        'Hier à'
      )
    );
    // Rétro-compatibilité ancienne conversation sans createdAt/updatedAt
    strictEqual(
      formatConversationRelativeDate({ lastActive: "Aujourd'hui à 15:40" }, now),
      "Aujourd'hui à 15:40"
    );
  });

  it('3. sortConversationsByDate trie par updatedAt décroissant et conserve les anciennes sans date', () => {
    const cOld: Conversation = {
      id: 'c_old',
      title: 'Ancienne',
      lastActive: 'Hier',
      createdAt: '2026-11-24T10:00:00Z',
      updatedAt: '2026-11-24T10:00:00Z',
      messages: [],
    };
    const cNew: Conversation = {
      id: 'c_new',
      title: 'Récente',
      lastActive: "À l'instant",
      createdAt: '2026-11-25T14:00:00Z',
      updatedAt: '2026-11-25T14:00:00Z',
      messages: [],
    };
    const cLegacy: Conversation = {
      id: 'conv_1',
      title: 'Préparation du projet ELORA',
      lastActive: "Aujourd'hui à 15:40",
      messages: [],
    };

    const sorted = sortConversationsByDate([cLegacy, cOld, cNew]);
    strictEqual(sorted[0].id, 'c_new');
    strictEqual(sorted[1].id, 'c_old');
    strictEqual(sorted[2].id, 'conv_1');
  });

  it('4. mergeCollectionById évite les doublons et conserve la version ayant updatedAt le plus récent', () => {
    const local: Conversation[] = [
      {
        id: 'conv_a',
        title: 'Titre local plus récent',
        lastActive: "À l'instant",
        updatedAt: '2026-11-25T15:05:00Z',
        messages: [{ id: 'm1', role: 'user', content: 'Salut', timestamp: '15:05' }],
      },
    ];
    const cloud: Conversation[] = [
      {
        id: 'conv_a',
        title: 'Nouvelle conversation',
        lastActive: "À l'instant",
        updatedAt: '2026-11-25T15:00:00Z',
        messages: [],
      },
    ];

    const merged = mergeCollectionById(local, cloud);
    strictEqual(merged.length, 1);
    strictEqual(merged[0].title, 'Titre local plus récent');
    strictEqual(merged[0].messages.length, 1);
  });

  it('5. AIScreen.tsx rend Renommer/Supprimer accessibles sur mobile/clavier sans window.prompt ni window.confirm', () => {
    const uiSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/features/ai/AIScreen.tsx'), 'utf-8');
    ok(uiSrc.includes('opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100'));
    ok(!uiSrc.includes('window.prompt('), 'window.prompt doit être supprimé');
    ok(!uiSrc.includes('window.confirm('), 'window.confirm doit être supprimé');
    ok(uiSrc.includes('maxLength={MAX_CONVERSATION_TITLE_LENGTH}'));
  });
});
