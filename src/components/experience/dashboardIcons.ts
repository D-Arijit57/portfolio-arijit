import { Clock, FileText, CircleAlert, Sparkles, type LucideIcon } from 'lucide-react';
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
  file: FileText,
  error: CircleAlert,
  sparkles: Sparkles,
};

export function resolveDashboardIcon(key: string): LucideIcon {
  return DASHBOARD_ICONS[key] ?? Sparkles;
}

/** Subtle accent colors — icon and border tint only, never a filled card background (see the redesign brief's "no colorful backgrounds"). */
export const ACCENT_COLORS: Record<DashboardAccent, string> = {
  blue: '#3b82f6',
  green: '#4ade80',
  purple: '#c084fc',
  yellow: '#eab308',
};
