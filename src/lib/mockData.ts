import type {
  UserProfile,
  MemoryItem,
  TaskItem,
  GoalItem,
  FocusSession,
  KnowledgeDoc,
  OpportunityItem,
  Conversation,
} from '../types';

export const initialProfile: UserProfile = {
  name: 'Djima',
  email: 'djima.dev@elora.ai',
  roleTitle: 'Concepteur & Développeur IA',
  currentObjective: 'Finaliser le produit ELORA pour le hackathon Firebase #BuildHybridAI',
  learningFocus: ['Inférence On-Device', 'Firebase AI Logic', 'Architectures Hybrides', 'PWA Offline'],
};

export const initialMemories: MemoryItem[] = [
  {
    id: 'mem_1',
    category: 'preference',
    key: 'Priorité d\'inférence',
    value: 'Préfère exécuter les requêtes en local sur Gemini Nano pour la confidentialité et le coût zéro, avec bascule cloud uniquement si nécessaire.',
    source: 'Cadrage initial',
    dateAdded: '2026-11-22',
    enabledForAI: true,
  },
  {
    id: 'mem_2',
    category: 'skill',
    key: 'Compétences maîtrisées',
    value: 'React, TypeScript, Node.js, Python, Flutter et architectures cloud Firebase.',
    source: 'Brief utilisateur',
    dateAdded: '2026-11-22',
    enabledForAI: true,
  },
  {
    id: 'mem_3',
    category: 'objective',
    key: 'Objectif actuel prioritaire',
    value: 'Livrer une solution hybride prouvant la synergie entre Gemini Nano local et Firebase AI Logic cloud.',
    source: 'Déclaration explicite',
    dateAdded: '2026-11-22',
    enabledForAI: true,
  },
  {
    id: 'mem_4',
    category: 'habit',
    key: 'Rythme de travail',
    value: 'Sessions Focus de 25 à 45 minutes avec revue concise des étapes atteintes.',
    source: 'Historique Planner',
    dateAdded: '2026-11-22',
    enabledForAI: true,
  },
];

export const initialTasks: TaskItem[] = [
  {
    id: 'task_1',
    title: 'Finaliser l\'interface mobile-first des 6 espaces',
    description: 'Vérifier la lisibilité sur petit écran et la fluidité des transitions.',
    dueDate: '2026-11-23',
    priority: 'high',
    completed: true,
    category: 'Développement',
    goalId: 'goal_1',
  },
  {
    id: 'task_2',
    title: 'Valider le basculement local/cloud avec interruption réseau simulée',
    description: 'S\'assurer que la file de synchronisation OfflineQueue retient les modifications.',
    dueDate: '2026-11-24',
    priority: 'high',
    completed: false,
    category: 'IA Hybride',
    goalId: 'goal_1',
  },
  {
    id: 'task_3',
    title: 'Structurer la bibliothèque Knowledge pour extraction de quiz',
    description: 'Connecter les documents enregistrés aux questions de révision.',
    dueDate: '2026-11-25',
    priority: 'medium',
    completed: false,
    category: 'Connaissances',
    goalId: 'goal_2',
  },
  {
    id: 'task_4',
    title: 'Préparer le pitch et le scénario de démo vidéo YouTube (3 min max)',
    description: 'Mettre en valeur l\'arbitrage temps réel entre Gemini Nano et le Cloud.',
    dueDate: '2026-11-27',
    priority: 'medium',
    completed: false,
    category: 'Hackathon',
    goalId: 'goal_1',
  },
];

export const initialGoals: GoalItem[] = [
  {
    id: 'goal_1',
    title: 'Remporter le Hackathon Firebase #BuildHybridAI',
    category: 'Projet & Compétition',
    targetDate: '2026-11-30',
    progressPercentage: 65,
    completed: false,
    milestones: [
      { id: 'm1', title: 'Phase 0 : Preuve technique IA hybride validée', completed: true },
      { id: 'm2', title: 'Phase 1 : Expérience produit complète des 6 espaces', completed: true },
      { id: 'm3', title: 'Intégration Firebase Auth et Firestore synchronisé', completed: false },
      { id: 'm4', title: 'Vidéo de démonstration publique et publication', completed: false },
    ],
  },
  {
    id: 'goal_2',
    title: 'Maîtriser les architectures On-Device et Web AI',
    category: 'Compétence',
    targetDate: '2026-12-15',
    progressPercentage: 80,
    completed: false,
    milestones: [
      { id: 'm21', title: 'Comprendre l\'API Chrome Prompt API', completed: true },
      { id: 'm22', title: 'Intégrer InferenceMode.PREFER_ON_DEVICE de Firebase', completed: true },
      { id: 'm23', title: 'Implémenter le cache et la tolérance aux coupures réseau', completed: true },
    ],
  },
];

export const initialFocusSessions: FocusSession[] = [
  {
    id: 'foc_1',
    goalTitle: 'Conception de l\'AI Orchestrator',
    durationMinutes: 45,
    completedAt: '2026-11-22 11:30',
    notes: 'Découplage réussi entre LocalAIProvider et CloudAIProvider.',
  },
  {
    id: 'foc_2',
    goalTitle: 'Intégration du Design System et Navigation 6 Espaces',
    durationMinutes: 35,
    completedAt: '2026-11-22 14:15',
    notes: 'Palette ivoire et noir profond appliquée avec composants mobile-first.',
  },
];

export const initialKnowledge: KnowledgeDoc[] = [
  {
    id: 'doc_1',
    title: 'Guide d\'intégration Firebase AI Logic Hybrid',
    collection: 'Documentation Technique',
    type: 'pdf',
    summary: 'Documentation de référence pour l\'inférence hybride combinant Gemini Nano (Prompt API) et Gemini 3.5 Flash Lite en cloud.',
    keyInsights: [
      'InferenceMode.PREFER_ON_DEVICE tente d\'abord le modèle local.',
      'result.response.inferenceSource indique de manière certifiée ON_DEVICE ou IN_CLOUD.',
      'Le mode local ne génère aucun coût d\'infrastructure et protège totalement la vie privée.',
    ],
    content: 'Firebase AI Logic permet aux applications web et mobiles d\'orchestrer automatiquement les inférences entre un modèle on-device (Gemini Nano) et les modèles hébergés sur Google Cloud. Pour activer le modèle local sur Chrome Desktop, les drapeaux chrome://flags/#prompt-api-for-gemini-nano et #optimization-guide-on-device-model doivent être configurés.',
    addedAt: '2026-11-22',
    tags: ['Firebase', 'Gemini Nano', 'IA Hybride', 'Web'],
  },
  {
    id: 'doc_2',
    title: 'Règles et Critères d\'évaluation #BuildHybridAI',
    collection: 'Hackathon',
    type: 'research',
    summary: 'Cahier des charges officiel Devpost pour la soumission du hackathon Firebase.',
    keyInsights: [
      'Date limite impérative : 30 novembre 2026 à 14h00 PT.',
      'Dépôt public avec licence open source obligatoire.',
      'Vidéo YouTube de 3 minutes maximum en anglais (ou sous-titrée).',
      'Preuve irréfutable de synergie hybride locale/cloud.',
    ],
    content: 'La compétition #BuildHybridAI récompense les projets exploitant Firebase AI Logic sur au moins une plateforme compatible. L\'expérience doit être fluide et fonctionnelle pour les juges.',
    addedAt: '2026-11-22',
    tags: ['Hackathon', 'Firebase', 'Devpost'],
  },
];

export const initialOpportunities: OpportunityItem[] = [
  {
    id: 'opp_1',
    title: 'Firebase #BuildHybridAI Hackathon',
    organization: 'Google & Firebase Devpost',
    type: 'hackathon',
    deadline: '2026-11-30',
    location: 'En ligne (Global)',
    isVerified: true,
    matchScore: 98,
    matchReason: 'Correspondance parfaite avec vos compétences (React, TypeScript, Firebase AI Logic, Gemini Nano).',
    eligibility: ['Développeurs majeurs', 'Dépôt public avec licence open source', 'Application exploitant Firebase AI Logic'],
    skillsRequired: ['Firebase', 'React/Web ou Android', 'Prompt Engineering', 'IA Hybride'],
    officialUrl: 'https://firebasehybridaihackathon.devpost.com/',
    saved: true,
  },
  {
    id: 'opp_2',
    title: 'Google Summer of Code 2027',
    organization: 'Google Open Source',
    type: 'program',
    deadline: '2027-03-15',
    location: 'En ligne (Monde)',
    isVerified: true,
    matchScore: 88,
    matchReason: 'Opportunité idéale pour contribuer à des projets open-source majeurs avec mentorat dédié.',
    eligibility: ['Développeurs débutants ou intermédiaires', 'Eligibilité légale locale'],
    skillsRequired: ['Git', 'TypeScript', 'Python', 'Collaboration'],
    officialUrl: 'https://summerofcode.withgoogle.com/',
    saved: false,
  },
  {
    id: 'opp_3',
    title: 'Bourse d\'Innovation Numérique & IA Locale',
    organization: 'Fondation pour l\'Innovation Technologique',
    type: 'scholarship',
    deadline: '2027-01-20',
    location: 'Europe / International',
    isVerified: true,
    matchScore: 84,
    matchReason: 'Financement pour projets promouvant la confidentialité des données et l\'IA éco-responsable on-device.',
    eligibility: ['Étudiants ou chercheurs indépendants', 'Projet à code ouvert'],
    skillsRequired: ['Edge AI', 'Documentation scientifique', 'Autonomie'],
    officialUrl: 'https://ec.europa.eu/digital-single-market/',
    saved: false,
  },
];

export const initialConversations: Conversation[] = [
  {
    id: 'conv_1',
    title: 'Préparation du projet ELORA',
    lastActive: 'Aujourd\'hui à 15:40',
    messages: [
      {
        id: 'msg_1',
        role: 'user',
        content: 'ELORA, rappelle-moi les piliers de notre architecture hybride.',
        timestamp: '15:39',
      },
      {
        id: 'msg_2',
        role: 'assistant',
        content: 'Avec plaisir ! Voici les trois piliers essentiels d\'ELORA :\n\n1. **Inférence Locale D\'abord (Gemini Nano) :** Dès qu\'une tâche est compatible et que le modèle est actif sur votre machine, la requête s\'exécute localement. Aucune donnée ne quitte votre appareil et la latence est quasi-instantanée.\n\n2. **Bascule Cloud Intelligente (Firebase AI Logic) :** Pour les analyses complexes ou les recherches nécessitant un modèle large, nous faisons appel au cloud avec votre accord.\n\n3. **Résilience Hors Ligne :** Même sans connexion Internet, vos connaissances, notes et tâches enregistrées restent accessibles immédiatement.',
        timestamp: '15:40',
        inferenceSource: 'on_device',
        modelName: 'Gemini Nano',
        durationMs: 38,
      },
    ],
  },
];
