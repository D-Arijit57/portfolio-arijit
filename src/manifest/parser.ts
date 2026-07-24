import type { ManifestCategory, ManifestModel, ManifestTechnology } from './types';

/**
 * Manifest Parser — pure function: raw manifest.json text in, a typed
 * ManifestModel out (or undefined if the text isn't a usable manifest). No
 * React, no side effects, mirrors modelToMermaid()'s purity
 * (src/architecture/renderers/mermaidRenderer.ts). Every top-level key
 * except the reserved metadata keys is treated as a category — this is
 * what makes adding a brand-new category (e.g. "observability") render
 * automatically, with no renderer or parser change required.
 */

const METADATA_KEYS = new Set(['project', 'description']);

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

function isManifestTechnology(value: unknown): value is ManifestTechnology {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).technology === 'string' &&
    typeof (value as Record<string, unknown>).role === 'string'
  );
}

export function parseManifest(raw: string): ManifestModel | undefined {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) return undefined;
  const obj = data as Record<string, unknown>;

  const project = typeof obj.project === 'string' ? obj.project : 'Untitled Project';
  const description = typeof obj.description === 'string' ? obj.description : '';

  const categories: ManifestCategory[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (METADATA_KEYS.has(key) || !Array.isArray(value)) continue;
    const technologies = value.filter(isManifestTechnology);
    if (technologies.length === 0) continue;
    categories.push({ key, title: humanizeKey(key), technologies });
  }

  return { project, description, categories };
}
