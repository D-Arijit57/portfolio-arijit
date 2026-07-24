import React from 'react';
import { colorForString } from '../../manifest/colorHash';

/**
 * A small role badge (e.g. "Framework", "Realtime Database"). Color is
 * deterministic from the role text itself (src/manifest/colorHash.ts) —
 * the same role always renders the same color everywhere, with no
 * hand-authored role-to-color table to maintain as new roles appear.
 */
export function ManifestBadge({ label }: { label: string }) {
  const color = colorForString(label);
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium leading-none transition-colors hover:brightness-125"
      style={{ color, backgroundColor: `${color}1f` }}
    >
      {label}
    </span>
  );
}
