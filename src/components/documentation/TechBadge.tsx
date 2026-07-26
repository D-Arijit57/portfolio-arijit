import React from 'react';
import { Component } from 'lucide-react';
import { resolveTechLogo } from '../../documentation/techLogos';
import { colorForString } from '../../manifest/colorHash';

/**
 * Hero-specific technology badge: larger and logo-bearing. Renders the
 * technology's official mark (src/documentation/techLogos.ts) when one
 * exists; falls back to a generic icon in the same deterministic hash
 * color the rest of the workspace uses for unrecognized strings, so a
 * future badge (a technology simple-icons doesn't cover) never renders
 * blank.
 */
export function TechBadge({ label }: { label: string }) {
  const logo = resolveTechLogo(label);
  const fallbackColor = colorForString(label);

  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-[#3c3c3c] bg-[#252526] px-3 py-1.5 text-[13px] font-medium text-[#cccccc] transition-colors hover:border-[#4c4c4c]">
      {logo ? (
        <svg viewBox="0 0 24 24" width={16} height={16} fill={logo.color} aria-hidden="true" className="shrink-0">
          <path d={logo.path} />
        </svg>
      ) : (
        <Component size={15} color={fallbackColor} className="shrink-0" />
      )}
      {label}
    </span>
  );
}
