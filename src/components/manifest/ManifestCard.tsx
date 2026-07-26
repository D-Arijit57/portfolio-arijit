import React from 'react';
import { motion } from 'motion/react';
import { Component } from 'lucide-react';
import type { ManifestCategory, ManifestTechnology } from '../../manifest/types';
import { resolveCategoryVisual } from '../../manifest/categoryVisuals';
import { resolveTechLogo } from '../../documentation/techLogos';
import { colorForString } from '../../manifest/colorHash';

/**
 * A technology's badge row. A single label (the common case: just `role`,
 * or a one-item `tags` like "Core"/"Managed Service") renders as one filled
 * pill, same treatment the old ManifestBadge used. Multiple `tags` (a real
 * breakdown, e.g. Convex's Database/Realtime/Queries/Mutations/Actions)
 * renders as a row of outline chips instead — a coarse label reads as a
 * single fact, a breakdown reads as a list.
 */
function TechnologyBadges({ tags, role, accentColor }: { tags: string[] | undefined; role: string; accentColor: string }) {
  const items = tags && tags.length > 0 ? tags : [role];

  if (items.length === 1) {
    const color = colorForString(items[0]);
    return (
      <span
        className="inline-block self-start rounded px-2 py-0.5 text-[11px] font-medium leading-none"
        style={{ color, backgroundColor: `${color}1f` }}
      >
        {items[0]}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 rounded border border-[#3c3c3c] px-2 py-0.5 text-[11px] text-[#cccccc]"
        >
          <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
          {tag}
        </span>
      ))}
    </div>
  );
}

/**
 * A single technology, now the hero of the card (Manifest Viewer visual
 * refinement). Renders the technology's official brand mark when
 * techLogos.ts has one; falls back to a generic icon in the same
 * deterministic hash color the rest of the workspace uses for unrecognized
 * strings, so a technology without a shipped logo mark never renders blank.
 */
function TechnologyCard({ tech, accentColor }: { tech: ManifestTechnology; accentColor: string }) {
  const logo = resolveTechLogo(tech.technology);
  const fallbackColor = colorForString(tech.technology);

  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-t-2 border-[#3c3c3c] bg-[#252526] p-4 transition-colors hover:border-[#4c4c4c]"
      style={{ borderTopColor: accentColor }}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e1e1e]">
        {logo ? (
          <svg viewBox="0 0 24 24" width={18} height={18} fill={logo.color} aria-hidden="true">
            <path d={logo.path} />
          </svg>
        ) : (
          <Component size={16} color={fallbackColor} />
        )}
      </div>

      <div>
        <h3 className="text-[15px] font-semibold leading-tight text-white">{tech.technology}</h3>
        <div className="mt-0.5 text-[12px] font-medium leading-snug" style={{ color: accentColor }}>
          {tech.role}
        </div>
      </div>

      {tech.description && <p className="text-[12px] leading-relaxed text-[#9d9d9d]">{tech.description}</p>}

      <TechnologyBadges tags={tech.tags} role={tech.role} accentColor={accentColor} />
    </div>
  );
}

export function ManifestCard({ category, index }: { category: ManifestCategory; index: number }) {
  const { icon: Icon, accentColor } = resolveCategoryVisual(category.key);
  // A category with a real breakdown of technologies reads better spanning
  // the full width; a single-hero-card category (most now, after
  // consolidating sub-features into one card's tags) pairs naturally
  // alongside another one-card category instead of stretching empty space.
  const spansFullWidth = category.technologies.length >= 3;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
      className={spansFullWidth ? 'lg:col-span-2' : undefined}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon size={13} color={accentColor} className="shrink-0" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#858585]">{category.title}</h2>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {category.technologies.map((tech) => (
          <TechnologyCard key={tech.technology} tech={tech} accentColor={accentColor} />
        ))}
      </div>
    </motion.section>
  );
}
