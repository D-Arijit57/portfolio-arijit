import React, { useMemo, useState } from 'react';
import { ChevronDown, Copy, Check, Component } from 'lucide-react';
import type { ManifestCategory } from '../../manifest/types';
import { buildCategoryYaml } from '../../manifest/yamlFormat';
import { resolveTechLogo } from '../../documentation/techLogos';
import { colorForString } from '../../manifest/colorHash';
import { cn } from '../../lib/utils';
import { ManifestYamlBlock } from './ManifestYamlBlock';

/** A technology's official brand mark in the section header's logo row; falls back to a generic icon in the same deterministic hash color used everywhere else in the workspace for a technology without a shipped logo. */
function TechLogo({ technology }: { technology: string }) {
  const logo = resolveTechLogo(technology);
  const fallbackColor = colorForString(technology);

  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center" title={technology}>
      {logo ? (
        <svg viewBox="0 0 24 24" width={22} height={22} fill={logo.color} aria-hidden="true">
          <path d={logo.path} />
        </svg>
      ) : (
        <Component size={18} color={fallbackColor} />
      )}
    </span>
  );
}

/**
 * A responsibility group, rendered as a collapsible YAML spec section
 * (Manifest YAML Viewer redesign) — the VS Code Explorer-folder pattern:
 * chevron + uppercase title + the category's technology logos in the
 * header, the generated YAML (manifest/yamlFormat.ts) below when expanded.
 * Always spans the full width of its container; the container itself is
 * what makes it fill a narrow split pane or a wide full-editor view.
 */
export function ManifestSection({ category }: { category: ManifestCategory }) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const yaml = useMemo(() => buildCategoryYaml(category), [category]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <section className="w-full overflow-hidden rounded-md border border-[#3c3c3c] bg-[#1e1e1e]">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            size={14}
            className={cn('shrink-0 text-[#858585] transition-transform', !expanded && '-rotate-90')}
          />
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-[#cccccc]">
            {category.title}
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {category.technologies.map((tech) => (
              <TechLogo key={tech.technology} technology={tech.technology} />
            ))}
          </div>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy YAML"
          className="shrink-0 rounded p-1.5 text-[#858585] transition-colors hover:bg-[#2a2d2e] hover:text-[#cccccc]"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#3c3c3c]">
          <ManifestYamlBlock code={yaml} />
        </div>
      )}
    </section>
  );
}
