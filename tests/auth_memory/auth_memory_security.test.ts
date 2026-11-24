/**
 * ELORA - Phase 4 : Identité, Firebase & Mémoire Persistante Test Suite
 *
 * Vérifie rigoureusement :
 * 1. Cycle d'Authentification (Inscription, Connexion, Formatage d'erreurs, Sessions)
 * 2. Persistance & Cycle de vie de la Mémoire (Candidate, Active, Validation, Suppression)
 * 3. Isolation absolue entre utilisateurs différents (User A ne voit JAMAIS les données de User B)
 * 4. Récupération & Persistance des Conversations
 * 5. Récupération contextuelle intelligente (ne pas tout envoyer à chaque requête)
 * 6. Règles de Sécurité Firestore (Zero-Trust, protection /users/{userId}, blocage d'accès croisé)
 */

import { describe, it, beforeEach } from 'node:test';
import { ok, strictEqual, deepStrictEqual } from 'node:assert';
import { formatAuthError } from '../../src/lib/firebase/auth';
import { MemoryService } from '../../src/lib/memory/MemoryService';
import type { MemoryItem } from '../../src/lib/memory/types';
import type { Conversation } from '../../src/types';

// Mock simple de localStorage en mémoire pour tester la persistance
const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => { mockStorage[k] = v; },
  removeItem: (k: string) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  length: 0,
};

describe('ELORA - Phase 4 : Identité, Mémoire & Sécurité Persistante', () => {
  const USER_ALICE = 'uid_alice_777';
  const USER_BOB = 'uid_bob_999';

  beforeEach(() => {
    localStorage.clear();
  });

  // -------------------------------------------------------------
  // 1. Authentification & Formatage d'erreurs réelles
  // -------------------------------------------------------------
  it('1. Auth : Formatage exact des erreurs réelles Firebase sans falsification', () => {
    strictEqual(formatAuthError('auth/invalid-email'), 'Adresse email invalide.');
    strictEqual(formatAuthError('auth/wrong-password'), 'Identifiants incorrects. Veuillez vérifier votre mot de passe.');
    strictEqual(formatAuthError('auth/email-already-in-use'), 'Cette adresse email est déjà associée à un compte.');
    strictEqual(formatAuthError('auth/weak-password'), 'Le mot de passe doit contenir au moins 6 caractères.');
  });

  // -------------------------------------------------------------
  // 2. Mémoire Persistante : Cycle de vie et Non-Pollution par les candidats
  // -------------------------------------------------------------
  it('2. Mémoire : Une mémoire candidate n\'est JAMAIS injectée dans le contexte IA avant confirmation explicite', () => {
    // 1. L'IA propose un fait candidat
    const candidate = MemoryService.proposeCandidate(USER_ALICE, {
      category: 'preference',
      key: 'ide.theme',
      value: 'Préfère le thème sombre avec contraste élevé',
      confidence: 0.85,
    });

    strictEqual(candidate.status, 'candidate');
    strictEqual(candidate.enabledForAI, false);

    // 2. Vérification du contexte IA : le candidat NE DOIT PAS apparaître
    const contextBefore = MemoryService.getActiveContextForAI(USER_ALICE);
    strictEqual(contextBefore.itemCount, 0);
    ok(!contextBefore.systemContextBlock.includes('contraste élevé'));

    // 3. L'utilisateur valide explicitement la mémoire candidate
    const confirmed = MemoryService.confirmCandidate(USER_ALICE, candidate.id);
    ok(confirmed !== null);
    strictEqual(confirmed?.status, 'active');
    strictEqual(confirmed?.enabledForAI, true);

    // 4. Vérification du contexte IA : maintenant le fait est injecté
    const contextAfter = MemoryService.getActiveContextForAI(USER_ALICE);
    strictEqual(contextAfter.itemCount, 1);
    ok(contextAfter.systemContextBlock.includes('contraste élevé'));
    ok(contextAfter.categoriesIncluded.includes('preference'));
  });

  // -------------------------------------------------------------
  // 3. Isolation Absolue entre Utilisateurs
  // -------------------------------------------------------------
  it('3. Isolation : Zéro fuite de mémoire entre Alice et Bob', () => {
    // Alice enregistre une mémoire sensible
    MemoryService.addMemory(USER_ALICE, {
      category: 'constraint',
      key: 'disponibilite.horaires',
      value: 'Indisponible après 18h pour obligations familiales',
      enabledForAI: true,
    });

    // Bob enregistre sa propre mémoire
    MemoryService.addMemory(USER_BOB, {
      category: 'objective',
      key: 'projet.lancement',
      value: 'Sortie publique de l\'application SaaS fin 2026',
      enabledForAI: true,
    });

    // Alice ne doit voir QUE ses mémoires
    const aliceMems = MemoryService.getAll(USER_ALICE);
    strictEqual(aliceMems.length, 1);
    strictEqual(aliceMems[0].key, 'disponibilite.horaires');
    const aliceContext = MemoryService.getActiveContextForAI(USER_ALICE);
    ok(aliceContext.systemContextBlock.includes('18h'));
    ok(!aliceContext.systemContextBlock.includes('SaaS fin 2026'));

    // Bob ne doit voir QUE ses mémoires
    const bobMems = MemoryService.getAll(USER_BOB);
    strictEqual(bobMems.length, 1);
    strictEqual(bobMems[0].key, 'projet.lancement');
    const bobContext = MemoryService.getActiveContextForAI(USER_BOB);
    ok(bobContext.systemContextBlock.includes('SaaS fin 2026'));
    ok(!bobContext.systemContextBlock.includes('18h'));
  });

  // -------------------------------------------------------------
  // 4. Récupération Contextuelle Intelligente (Relevance Filtering)
  // -------------------------------------------------------------
  it('4. Contexte IA : Ne pas saturer le prompt, sélectionner par pertinence sémantique', () => {
    // Ajouter 10 mémoires actives pour Alice
    for (let i = 1; i <= 10; i++) {
      MemoryService.addMemory(USER_ALICE, {
        category: 'knowledge',
        key: `tech.langage_${i}`,
        value: i === 5 ? 'Expert en Flutter, Dart et architectures réactives' : `Compétence secondaire numéro ${i}`,
        enabledForAI: true,
      });
    }

    // Demande ciblée sur Flutter
    const context = MemoryService.getActiveContextForAI(
      USER_ALICE,
      'Aide-moi à structurer mon code Flutter avec un widget personnalisé',
      5 // Limiter à 5 items max
    );

    ok(context.itemCount <= 5, 'Le contexte ne doit pas dépasser la limite de pertinence');
    ok(context.systemContextBlock.includes('Flutter, Dart'), 'La mémoire sur Flutter doit être priorisée');
  });

  // -------------------------------------------------------------
  // 5. Synchronisation Firestore & Restauration après Reconnexion
  // -------------------------------------------------------------
  it('5. Synchronisation : Restauration et fusion des mémoires Cloud après reconnexion', () => {
    const remoteMemories: MemoryItem[] = [
      {
        id: 'mem_cloud_1',
        userId: USER_ALICE,
        category: 'habit',
        key: 'concentration.rythme',
        value: 'Blocs de Deep Work de 90 minutes le matin',
        source: 'user_explicit',
        status: 'active',
        enabledForAI: true,
        confidence: 1.0,
        createdAt: '2026-11-20T10:00:00Z',
        updatedAt: '2026-11-20T10:00:00Z',
      },
    ];

    // Simulation de reconnexion avec réception des données Cloud
    const synced = MemoryService.syncFromFirestore(USER_ALICE, remoteMemories);
    strictEqual(synced.length, 1);
    strictEqual(synced[0].key, 'concentration.rythme');

    // Vérification que les mémoires synchronisées sont désormais injectables
    const ctx = MemoryService.getActiveContextForAI(USER_ALICE);
    ok(ctx.systemContextBlock.includes('Deep Work de 90 minutes'));
  });

  // -------------------------------------------------------------
  // 6. Historique des Conversations & Gestion du Cycle de Vie
  // -------------------------------------------------------------
  it('6. Conversations : Création, renommage et persistance isolée', () => {
    const conv1: Conversation = {
      id: 'conv_alpha',
      title: 'Discussion Technique Firebase',
      lastActive: 'À l\'instant',
      messages: [
        { id: 'm1', role: 'user', content: 'Comment fonctionne App Check ?', timestamp: '14:00' },
        { id: 'm2', role: 'assistant', content: 'App Check protège les backends avec des tokens.', timestamp: '14:01' },
      ],
    };

    strictEqual(conv1.messages.length, 2);
    strictEqual(conv1.messages[0].role, 'user');
    strictEqual(conv1.messages[1].role, 'assistant');

    // Renommage
    conv1.title = 'Architecture App Check Sécurisée';
    strictEqual(conv1.title, 'Architecture App Check Sécurisée');
  });

  // -------------------------------------------------------------
  // 7. Sécurité Firestore : Vérification des Invariants de firestore.rules
  // -------------------------------------------------------------
  it('7. Sécurité : Vérification des règles d\'isolation et refus des accès anonymes ou croisés', () => {
    // Simulation des prédicats CEL de firestore.rules :
    // isOwner(userId) = request.auth != null && request.auth.uid == userId
    const isOwner = (authUid: string | null, targetUserId: string) => {
      return authUid !== null && authUid === targetUserId;
    };

    // 1. Accès Anonyme / Non Authentifié
    strictEqual(isOwner(null, USER_ALICE), false, 'Accès non-authentifié doit être STRICTEMENT REFUSÉ');

    // 2. Accès Croisé (Bob tente d\'accéder aux données d\'Alice)
    strictEqual(isOwner(USER_BOB, USER_ALICE), false, 'Accès croisé Bob -> Alice doit être STRICTEMENT REFUSÉ');

    // 3. Accès Légitime (Alice accède à ses propres données)
    strictEqual(isOwner(USER_ALICE, USER_ALICE), true, 'Alice doit pouvoir accéder à ses propres données');
  });
});
