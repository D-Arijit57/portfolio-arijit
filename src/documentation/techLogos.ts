import {
  siNextdotjs,
  siReact,
  siTypescript,
  siClerk,
  siConvex,
  siTailwindcss,
  siVercel,
  siShadcnui,
  siJsonwebtokens,
  siFlutter,
  siDart,
  siFirebase,
  siPython,
  siAndroid,
  siMaterialdesign,
} from 'simple-icons';

export interface TechLogo {
  /** SVG path `d` attribute, official simple-icons brand mark. */
  path: string;
  /** Hex color to render the mark in (`#rrggbb`). */
  color: string;
}

/**
 * Name -> official brand logo, for the Hero's technology badges and the
 * Manifest Viewer's technology tiles. Only covers technologies simple-icons
 * actually ships a mark for (it has no entry for Stream or Monaco Editor as
 * of this writing) — callers fall back to a generic, deterministically-
 * colored icon for anything not listed here, so an unrecognized future
 * badge never renders blank.
 */
const TECH_LOGOS: Record<string, TechLogo> = {
  'next.js': { path: siNextdotjs.path, color: '#ffffff' }, // simple-icons ships Next.js as black; inverted to white so it's visible on the workspace's dark surfaces, the same adaptation Next.js's own docs use in dark mode.
  nextjs: { path: siNextdotjs.path, color: '#ffffff' },
  react: { path: siReact.path, color: `#${siReact.hex}` },
  typescript: { path: siTypescript.path, color: `#${siTypescript.hex}` },
  clerk: { path: siClerk.path, color: `#${siClerk.hex}` },
  convex: { path: siConvex.path, color: `#${siConvex.hex}` },
  tailwindcss: { path: siTailwindcss.path, color: `#${siTailwindcss.hex}` },
  'tailwind css': { path: siTailwindcss.path, color: `#${siTailwindcss.hex}` },
  vercel: { path: siVercel.path, color: '#ffffff' }, // same dark-surface inversion as Next.js — simple-icons ships Vercel as black.
  'shadcn/ui': { path: siShadcnui.path, color: '#ffffff' },
  jwt: { path: siJsonwebtokens.path, color: `#${siJsonwebtokens.hex}` },
  flutter: { path: siFlutter.path, color: `#${siFlutter.hex}` },
  dart: { path: siDart.path, color: `#${siDart.hex}` },
  firebase: { path: siFirebase.path, color: `#${siFirebase.hex}` },
  // Firestore has no distinct simple-icons mark of its own — reusing the
  // parent Firebase brand mark, same "product family reuses the parent
  // mark" pattern already at play for Convex Cloud/Stream Cloud below
  // (prefix-matched onto convex/stream). Not prefix-matchable off
  // "firebase" itself (different first word), so it needs its own key.
  'cloud firestore': { path: siFirebase.path, color: `#${siFirebase.hex}` },
  python: { path: siPython.path, color: `#${siPython.hex}` },
  android: { path: siAndroid.path, color: `#${siAndroid.hex}` },
  'material components': { path: siMaterialdesign.path, color: `#${siMaterialdesign.hex}` },
  // Deliberately NOT mapped: simple-icons' "Hive" mark is an unrelated
  // product (a social app, #FF7A00) — not the Dart/Flutter `hive` package
  // Rakshachakra's manifest lists, so it falls back to the generic icon
  // rather than risk showing the wrong brand.
};

export function resolveTechLogo(name: string): TechLogo | undefined {
  const key = name.trim().toLowerCase();
  if (TECH_LOGOS[key]) return TECH_LOGOS[key];

  // manifest.json qualifies some names with a version or parenthetical
  // ("Next.js 14 (App Router)", "React 18") — still resolves to the base
  // brand mark rather than falling back to a generic icon for those.
  const prefixMatch = Object.keys(TECH_LOGOS).find((k) => key.startsWith(k));
  return prefixMatch ? TECH_LOGOS[prefixMatch] : undefined;
}
