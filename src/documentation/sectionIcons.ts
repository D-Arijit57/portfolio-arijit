import { Book, AlertCircle, Lightbulb, Sparkles, Network, Cpu, GitBranch, Gauge, Rocket, FileText, type LucideIcon } from 'lucide-react';
import { colorForString } from '../manifest/colorHash';

/**
 * Section heading -> {icon, accentColor}, mirroring
 * src/manifest/categoryVisuals.ts exactly. Keyword-matched, never a closed
 * enum keyed on Cortexa's own heading text — any future project doc's
 * headings ("Rollout Plan", "Data Model", ...) still get a real icon (via
 * the FileText fallback) and a stable, deterministic color, never blank.
 */
export interface DocumentationSectionVisual {
  icon: LucideIcon;
  accentColor: string;
}

const KEYWORD_ICONS: [pattern: RegExp, icon: LucideIcon][] = [
  [/overview/i, Book],
  [/problem/i, AlertCircle],
  [/solution/i, Lightbulb],
  [/feature/i, Sparkles],
  [/architecture/i, Network],
  [/technolog|stack/i, Cpu],
  [/workflow|process/i, GitBranch],
  [/scalab|performance/i, Gauge],
  [/future|roadmap/i, Rocket],
];

export function resolveSectionIcon(heading: string): LucideIcon {
  const match = KEYWORD_ICONS.find(([pattern]) => pattern.test(heading));
  return match ? match[1] : FileText;
}

export function resolveSectionVisual(heading: string): DocumentationSectionVisual {
  return {
    icon: resolveSectionIcon(heading),
    accentColor: colorForString(heading),
  };
}
