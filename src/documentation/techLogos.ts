import { siNextdotjs, siReact, siTypescript, siClerk, siConvex } from 'simple-icons';

export interface TechLogo {
  /** SVG path `d` attribute, official simple-icons brand mark. */
  path: string;
  /** Hex color to render the mark in (`#rrggbb`). */
  color: string;
}

/**
 * Name -> official brand logo, for the Hero's technology badges. Only
 * covers technologies simple-icons actually ships a mark for (it has no
 * entry for Stream or Monaco Editor as of this writing) — TechBadge falls
 * back to a generic, deterministically-colored icon for anything not
 * listed here, so an unrecognized future badge never renders blank.
 */
const TECH_LOGOS: Record<string, TechLogo> = {
  'next.js': { path: siNextdotjs.path, color: '#ffffff' }, // simple-icons ships Next.js as black; inverted to white so it's visible on the workspace's dark surfaces, the same adaptation Next.js's own docs use in dark mode.
  nextjs: { path: siNextdotjs.path, color: '#ffffff' },
  react: { path: siReact.path, color: `#${siReact.hex}` },
  typescript: { path: siTypescript.path, color: `#${siTypescript.hex}` },
  clerk: { path: siClerk.path, color: `#${siClerk.hex}` },
  convex: { path: siConvex.path, color: `#${siConvex.hex}` },
};

export function resolveTechLogo(name: string): TechLogo | undefined {
  return TECH_LOGOS[name.trim().toLowerCase()];
}
