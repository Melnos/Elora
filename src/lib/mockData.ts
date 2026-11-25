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
  name: 'Étudiant',
  email: '',
  roleTitle: 'Étudiant(e)',
  currentObjective: '',
  learningFocus: [],
};

export const initialMemories: MemoryItem[] = [];

export const initialTasks: TaskItem[] = [];

export const initialGoals: GoalItem[] = [];

export const initialFocusSessions: FocusSession[] = [];

export const initialKnowledge: KnowledgeDoc[] = [];

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
    saved: false,
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

export const initialConversations: Conversation[] = [];
