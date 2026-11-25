import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import { ContextEngine } from '../../src/lib/context/ContextEngine';
import type { KnowledgeDoc, UserProfile } from '../../src/types';

const profile: UserProfile = {
  name: 'Djima',
  email: 'djima@example.com',
  roleTitle: 'Ingénieur',
  currentObjective: 'Développer ELORA',
  learningFocus: ['AI'],
};

const docs: KnowledgeDoc[] = [
  {
    id: 'doc_ecogen',
    title: 'ECOGEN Architecture Énergétique',
    collection: 'Projets',
    type: 'pdf',
    summary: 'Système ECOGEN de gestion énergétique intelligente.',
    keyInsights: ['Capteurs embarqués basse consommation'],
    content: 'ECOGEN pilote des capteurs embarqués et optimise la consommation énergétique.',
    addedAt: '2026-11-20',
    tags: ['ecogen', 'energie'],
  },
  {
    id: 'doc_rtos',
    title: 'Guide FreeRTOS STM32',
    collection: 'Systèmes',
    type: 'notes',
    summary: 'Ordonnancement temps réel sur STM32.',
    keyInsights: ['Tâches prioritaires'],
    content: 'FreeRTOS gère les tâches temps réel sur microcontrôleurs STM32.',
    addedAt: '2026-11-22',
    tags: ['freertos', 'stm32'],
  },
];

describe('Phase 16C — Pertinence et Attribution des Sources', () => {
  it('1. Question générale avec ECOGEN présent dans Knowledge : aucune source ECOGEN affichée', () => {
    const resolved = ContextEngine.buildContext(
      { prompt: 'Explique-moi ce qu\'est un système embarqué.', userId: 'u1' },
      { profile, memories: [], goals: [], tasks: [], docs }
    );
    const displayed = ContextEngine.filterUsedSources(
      resolved.referencedSources,
      'Un système embarqué est un système informatique autonome intégré dans un équipement matériel.',
      'Explique-moi ce qu\'est un système embarqué.'
    );
    strictEqual(displayed.length, 0);
  });

  it('2. Demande de mettre ECOGEN de côté : ECOGEN est exclu de la récupération et des sources', () => {
    const resolved = ContextEngine.buildContext(
      { prompt: 'Mets ECOGEN de côté et explique les systèmes embarqués.', userId: 'u1' },
      { profile, memories: [], goals: [], tasks: [], docs }
    );
    ok(!resolved.docs.some((d) => d.id === 'doc_ecogen'));
    const displayed = ContextEngine.filterUsedSources(
      resolved.referencedSources,
      'Voici la définition générale d\'un système embarqué.',
      'Mets ECOGEN de côté et explique les systèmes embarqués.'
    );
    strictEqual(displayed.length, 0);
  });

  it('3. Question explicite sur ECOGEN : source ECOGEN affichée si réellement utilisée dans la réponse', () => {
    const resolved = ContextEngine.buildContext(
      { prompt: 'Résume mon document ECOGEN sur la gestion énergétique.', userId: 'u1' },
      { profile, memories: [], goals: [], tasks: [], docs }
    );
    ok(resolved.docs.some((d) => d.id === 'doc_ecogen'));
    const displayed = ContextEngine.filterUsedSources(
      resolved.referencedSources,
      'D\'après [Doc #doc_ecogen] "ECOGEN Architecture Énergétique", le système pilote des capteurs basse consommation.',
      'Résume mon document ECOGEN sur la gestion énergétique.'
    );
    strictEqual(displayed.length, 1);
    strictEqual(displayed[0].id, 'doc_ecogen');
  });

  it('4. Question liée à un autre document : seule la source pertinente utilisée est affichée', () => {
    const resolved = ContextEngine.buildContext(
      { prompt: 'Comment FreeRTOS gère-t-il les tâches sur STM32 ?', userId: 'u1' },
      { profile, memories: [], goals: [], tasks: [], docs }
    );
    const displayed = ContextEngine.filterUsedSources(
      resolved.referencedSources,
      'Selon le Guide FreeRTOS STM32, FreeRTOS gère les tâches temps réel par priorités.',
      'Comment FreeRTOS gère-t-il les tâches sur STM32 ?'
    );
    strictEqual(displayed.length, 1);
    strictEqual(displayed[0].id, 'doc_rtos');
  });

  it('5. Réponse sans récupération/utilisation documentaire : aucune source mobilisée', () => {
    const displayed = ContextEngine.filterUsedSources(
      [{ id: 'doc_ecogen', type: 'doc', title: 'ECOGEN Architecture Énergétique' }],
      'Voici trois exemples de systèmes embarqués : 1. ABS automobile, 2. Thermostat connecté, 3. Pacemaker.',
      'Donne-moi trois exemples.'
    );
    strictEqual(displayed.length, 0);
  });
});
