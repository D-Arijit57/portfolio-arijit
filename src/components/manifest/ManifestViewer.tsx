import React, { useMemo } from 'react';
import type { VirtualFile } from '../../types';
import { parseManifest } from '../../manifest/parser';
import { ManifestHeader } from './ManifestHeader';
import { ManifestSection } from './ManifestSection';

/**
 * The Manifest Viewer — a dedicated renderer for manifest.json, the same
 * "structured data in, rendered view out, never the other way around"
 * philosophy as the Architecture Canvas (ARCHITECTURE_PLATFORM_DESIGN.md).
 * Renders entirely from the parsed ManifestModel; it never hardcodes a
 * category name or technology, so a new top-level key in manifest.json
 * (e.g. "observability") renders as a new card automatically.
 *
 * Manifest Viewer v2: this is the *only* view manifest.json ever renders —
 * there is no raw-JSON counterpart to switch to (useStore's
 * requiresDualPaneSplit branch pairs it with the project's own
 * architecture.mmd in the other pane instead). The single-file abstraction
 * lives entirely at that store/EditorRenderer wiring level, so this
 * component stays exactly as simple as before.
 *
 * Manifest YAML Viewer redesign: each category is now a full-width
 * collapsible YAML section (ManifestSection) stacked vertically, rather
 * than a multi-column grid of tiles — a single column is what makes a
 * section fill a narrow split pane or a wide full-editor view equally well,
 * instead of staying pinned to a fixed narrow column at any width.
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
      <div className="space-y-4">
        {model.categories.map((category) => (
          <ManifestSection key={category.key} category={category} />
        ))}
      </div>
    </div>
  );
}
