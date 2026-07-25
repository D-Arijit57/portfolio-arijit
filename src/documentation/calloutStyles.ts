import { Info, Lightbulb, Megaphone, AlertTriangle, ShieldAlert, type LucideIcon } from 'lucide-react';
import type { CalloutKind } from './callout';

export interface CalloutStyle {
  icon: LucideIcon;
  label: string;
  accentColor: string;
}

/**
 * A fixed table, not a hash-derived color like categories/sections use —
 * callout kind is a closed 5-value enum (the GitHub-style alert set), so a
 * deliberate semantic mapping (blue=info, red=danger, ...) is more correct
 * here than an open-ended deterministic hash. CAUTION's red (#f14c4c) is
 * the one genuinely new color this feature introduces, matching VS Code's
 * own standard error/diagnostics red.
 */
const CALLOUT_STYLES: Record<CalloutKind, CalloutStyle> = {
  NOTE: { icon: Info, label: 'Note', accentColor: '#569cd6' },
  TIP: { icon: Lightbulb, label: 'Tip', accentColor: '#4ec9b0' },
  IMPORTANT: { icon: Megaphone, label: 'Important', accentColor: '#c586c0' },
  WARNING: { icon: AlertTriangle, label: 'Warning', accentColor: '#dcdcaa' },
  CAUTION: { icon: ShieldAlert, label: 'Caution', accentColor: '#f14c4c' },
};

export function resolveCalloutStyle(kind: CalloutKind): CalloutStyle {
  return CALLOUT_STYLES[kind];
}
