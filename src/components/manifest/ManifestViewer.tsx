import React, { useMemo } from 'react';
import { Layers, FolderTree, Cloud, BadgeCheck, type LucideIcon } from 'lucide-react';
import type { VirtualFile } from '../../types';
import { parseManifest } from '../../manifest/parser';
import { resolveTechLogo } from '../../documentation/techLogos';
import { ManifestHeader } from './ManifestHeader';
import { ManifestCard } from './ManifestCard';

/**
 * A compact summary stat, styled like a VS Code info panel rather than a
 * website stat card — plain value, muted label, muted icon, no accent
 * color. All four numbers below are derived from the parsed model, never
 * hardcoded, so they stay correct as manifest.json changes.
 */
function MetricTile({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-[#3c3c3c] bg-[#252526] px-4 py-3">
      <div>
        <div className="text-xl font-semibold text-white">{value}</div>
        <div className="mt-1 text-[11px] leading-snug text-[#9d9d9d]">{label}</div>
      </div>
      <Icon size={16} className="mt-0.5 shrink-0 text-[#858585]" />
    </div>
  );
}

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
 */
export function ManifestViewer({ file }: { file: VirtualFile }) {
  const model = useMemo(() => parseManifest(file.content), [file.content]);

  const metrics = useMemo(() => {
    if (!model) return null;
    const technologies = model.categories.flatMap((c) => c.technologies);
    return {
      technologies: technologies.length,
      responsibilityGroups: model.categories.length,
      managedServices: technologies.filter((t) => t.tags?.includes('Managed Service')).length,
      officialLogos: technologies.filter((t) => resolveTechLogo(t.technology)).length,
    };
  }, [model]);

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

      {metrics && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricTile label="Technologies" value={metrics.technologies} icon={Layers} />
          <MetricTile label="Responsibility Groups" value={metrics.responsibilityGroups} icon={FolderTree} />
          <MetricTile label="Managed Services" value={metrics.managedServices} icon={Cloud} />
          <MetricTile label="Official Logos" value={metrics.officialLogos} icon={BadgeCheck} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {model.categories.map((category, index) => (
          <ManifestCard key={category.key} category={category} index={index} />
        ))}
      </div>
    </div>
  );
}
