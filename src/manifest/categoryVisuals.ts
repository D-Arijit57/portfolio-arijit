import { Layout, Database, Shield, Radio, Code2, Cloud, Activity, Boxes, type LucideIcon } from 'lucide-react';
import { colorForString } from './colorHash';

/**
 * Category -> {icon, accentColor}, resolved from the category's raw JSON
 * key — never from a closed enum, since manifest.json categories are
 * open-ended by design (adding "observability" tomorrow must render
 * automatically, with no code change here). Known engineering terms get a
 * meaningful icon; anything else still gets a real icon and a stable color
 * via the deterministic fallback, never a blank or broken card.
 */
export interface ManifestCategoryVisual {
  icon: LucideIcon;
  accentColor: string;
}

const KEYWORD_ICONS: [pattern: RegExp, icon: LucideIcon][] = [
  [/front[- ]?end|ui\b|interface/i, Layout],
  [/back[- ]?end|data\b|database/i, Database],
  [/auth|identity|security/i, Shield],
  [/communicat|video|voice|messag|chat/i, Radio],
  [/develop|tool|editor|\bdx\b/i, Code2],
  [/deploy|infra|cloud|hosting/i, Cloud],
  [/observ|monitor|telemetry|trac(e|ing)|log/i, Activity],
];

export function resolveCategoryIcon(categoryKey: string): LucideIcon {
  const match = KEYWORD_ICONS.find(([pattern]) => pattern.test(categoryKey));
  return match ? match[1] : Boxes;
}

export function resolveCategoryVisual(categoryKey: string): ManifestCategoryVisual {
  return {
    icon: resolveCategoryIcon(categoryKey),
    accentColor: colorForString(categoryKey),
  };
}
