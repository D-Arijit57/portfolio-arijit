import { Clock, Database, Bug, Rocket, Sparkles, type LucideIcon } from 'lucide-react';
import type { DashboardAccent } from '../../experience/types';

/**
 * Dashboard icon key -> Lucide component. A string key (not a component
 * reference) is what the data model stores, the same "data layer stays
 * free of React" separation techLogos.ts uses for {path, color} — an
 * unrecognized key still falls back to Sparkles rather than rendering
 * blank.
 */
const DASHBOARD_ICONS: Record<string, LucideIcon> = {
  clock: Clock,
  database: Database,
  bug: Bug,
  rocket: Rocket,
};

export function resolveDashboardIcon(key: string): LucideIcon {
  return DASHBOARD_ICONS[key] ?? Sparkles;
}

/** Subtle accent colors — icons/values/borders only, never a full card background (see the redesign brief's "avoid large colorful backgrounds"). */
export const ACCENT_COLORS: Record<DashboardAccent, string> = {
  blue: '#3b82f6',
  green: '#4ade80',
  purple: '#c084fc',
  orange: '#fb923c',
};
