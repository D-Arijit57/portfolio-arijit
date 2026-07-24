import {
  Monitor,
  LayoutPanelLeft,
  Waypoints,
  Server,
  BrainCircuit,
  ShieldCheck,
  ListOrdered,
  Database,
  Cloud,
  HardDrive,
  MessagesSquare,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';

/**
 * Name -> component lookup for the icon names CATEGORY_STYLES already uses
 * (src/architecture/categories.ts). This is a mechanical necessity of using
 * lucide-react as a component library, not a category/styling decision —
 * categories.ts remains the only place a category is mapped to an icon
 * *name*; this file only resolves a name to the component that renders it.
 */
const ICONS: Record<string, LucideIcon> = {
  Monitor,
  LayoutPanelLeft,
  Waypoints,
  Server,
  BrainCircuit,
  ShieldCheck,
  ListOrdered,
  Database,
  Cloud,
  HardDrive,
  MessagesSquare,
  ExternalLink,
};

export function resolveIcon(name: string): LucideIcon | undefined {
  return ICONS[name];
}
