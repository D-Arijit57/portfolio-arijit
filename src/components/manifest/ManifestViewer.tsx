import React, { useMemo } from 'react';
import type { VirtualFile } from '../../types';
import { parseManifest } from '../../manifest/parser';
import { ManifestConstellation } from './ManifestConstellation';

/**
 * The Manifest Viewer — a dedicated renderer for manifest.json, the same
 * "structured data in, rendered view out, never the other way around"
 * philosophy as the Architecture Canvas (ARCHITECTURE_PLATFORM_DESIGN.md).
 * Renders entirely from the parsed ManifestModel; it never hardcodes a
 * category name or technology.
 *
 * Manifest Viewer v2: this is the *only* view manifest.json ever renders —
 * there is no raw-JSON counterpart to switch to (useStore's
 * requiresDualPaneSplit branch pairs it with the project's own
 * architecture.mmd in the other pane instead). The single-file abstraction
 * lives entirely at that store/EditorRenderer wiring level, so this
 * component stays exactly as simple as before.
 *
 * Tech Stack Constellation: ManifestConstellation now owns the entire view
 * — its own header (title/subtitle/project switcher), the graph, and the
 * sidebar — so this component is just parse-and-hand-off. The old
 * ManifestHeader (project name as the page's H1) is superseded: the
 * constellation's header leads with "Tech Stack Constellation" itself,
 * matching the reference design, with the project name moved into the
 * switcher on the same row.
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

  return <ManifestConstellation model={model} fileId={file.id} />;
}
