import {
  Home,
  Sparkles,
  BookOpen,
  Calendar,
  Compass,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { NavTab } from '../types';

export interface NavItemConfig {
  id: NavTab;
  label: string;
  mobileLabel: string;
  headerTitle: string;
  icon: LucideIcon;
}

/**
 * Source de vérité unique de navigation pour Sidebar, Header et BottomNav.
 * Ordre et libellés unifiés sur desktop et mobile.
 */
export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'home',
    label: 'Accueil',
    mobileLabel: 'Accueil',
    headerTitle: 'Accueil',
    icon: Home,
  },
  {
    id: 'ai',
    label: 'ELORA IA',
    mobileLabel: 'ELORA',
    headerTitle: 'ELORA IA',
    icon: Sparkles,
  },
  {
    id: 'knowledge',
    label: 'Bibliothèque',
    mobileLabel: 'Savoir',
    headerTitle: 'Bibliothèque',
    icon: BookOpen,
  },
  {
    id: 'planner',
    label: 'Planner & Focus',
    mobileLabel: 'Planner',
    headerTitle: 'Planner & Focus',
    icon: Calendar,
  },
  {
    id: 'opportunities',
    label: 'Opportunités',
    mobileLabel: 'Opport.',
    headerTitle: 'Opportunités',
    icon: Compass,
  },
  {
    id: 'progress',
    label: 'Bilan & Objectifs',
    mobileLabel: 'Bilan',
    headerTitle: 'Bilan & Objectifs',
    icon: TrendingUp,
  },
];

export function getNavHeaderTitle(tab: NavTab): string {
  return NAV_ITEMS.find((item) => item.id === tab)?.headerTitle || 'ELORA';
}
