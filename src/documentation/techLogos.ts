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
  siDjango,
  siPytest,
  siGithubactions,
  siRender,
  siDocker,
  siPostgresql,
  siFlask,
} from 'simple-icons';
import hiveLogo from '../assets/logos/hive.png';
import awsLogo from '../assets/logos/aws.svg';

/**
 * One of two kinds of mark:
 *  - `path`: an official simple-icons brand mark (monochrome SVG path).
 *  - `image`: the project's own official logo as a raster/SVG asset, for
 *    marks that aren't single-colour paths (Hive's is a full-colour
 *    illustration; simple-icons no longer ships AWS).
 *
 * A technology with neither falls back to a generic icon at the call site.
 */
export interface TechLogo {
  path?: string;
  image?: string;
  /** Hex color to render the mark in (`#rrggbb`); the glow colour for `image`. */
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
  jwt: { path: siJsonwebtokens.path, color: '#ffffff' }, // simple-icons ships JWT as black; white on the dark surface, same adaptation as Next.js/Vercel.
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
  // Lattice stack. Django REST Framework prefix-matches onto "django".
  // Django's brand green (#092E20) is near-invisible on the dark workspace
  // surface, so it uses Django's lighter secondary green (#44B78B) — same
  // dark-surface adaptation as Next.js/Vercel above; Render ships black and
  // is inverted to white likewise.
  django: { path: siDjango.path, color: '#44B78B' },
  pytest: { path: siPytest.path, color: `#${siPytest.hex}` },
  'github actions': { path: siGithubactions.path, color: `#${siGithubactions.hex}` },
  render: { path: siRender.path, color: '#ffffff' },
  docker: { path: siDocker.path, color: `#${siDocker.hex}` },
  postgresql: { path: siPostgresql.path, color: `#${siPostgresql.hex}` },
  postgres: { path: siPostgresql.path, color: `#${siPostgresql.hex}` },
  // Hive: simple-icons' "Hive" is an unrelated social app and "Apache Hive"
  // is a different product, so neither is used — this is the Dart package's
  // own logo, from github.com/hivedb/hive (.github/hive.svg), rendered to a
  // transparent PNG.
  hive: { image: hiveLogo, color: '#FBBF24' },
  // Flask: black on simple-icons, white on the dark surface (same
  // adaptation as Next.js/Vercel).
  flask: { path: siFlask.path, color: '#ffffff' },
  // AWS: simple-icons dropped its AWS marks, so this is the AWS logo from
  // the devicon set (amazonwebservices-plain.svg, all-orange so it reads on
  // dark).
  aws: { image: awsLogo, color: '#FF9900' },
  'aws ec2': { image: awsLogo, color: '#FF9900' },
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
