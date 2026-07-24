import React, { useMemo } from 'react';
import type { VirtualFile } from '../../types';
import { parseManifest } from '../../manifest/parser';
import { ManifestHeader } from './ManifestHeader';
import { ManifestCard } from './ManifestCard';

/**
 * The Manifest Viewer — a dedicated renderer for manifest.json, the same
 * "structured data in, rendered view out, never the other way around"
 * philosophy as the Architecture Canvas (ARCHITECTURE_PLATFORM_DESIGN.md).
 * Renders entirely from the parsed ManifestModel; it never hardcodes a
 * category name or technology, so a new top-level key in manifest.json
 * (e.g. "observability") renders as a new card automatically.
 */
export function ManifestViewer({ file }: { file: VirtualFile }) {
  const model = useMemo(() => parseManifest(file.content), [file.content]);

  if (!model || model.categories.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1e1e1e] text-sm font-mono text-[#858585]">
        No manifest data to display.
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-[#1e1e1e] p-6">
      <ManifestHeader project={model.project} description={model.description} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {model.categories.map((category, index) => (
          <ManifestCard key={category.key} category={category} index={index} />
        ))}
      </div>
    </div>
  );
}
