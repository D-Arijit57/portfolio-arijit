import React from 'react';

/**
 * Documentation Redesign: a subtle glyph between two sections (e.g.
 * Problem Statement -> Solution) — detected by documentationComponents.tsx's
 * `p()` override when a paragraph's sole text content is a recognized
 * transition glyph. Static, no independent entrance animation — it lives
 * inside the section's own already-fading-in reveal unit, same posture as
 * Callout.tsx.
 */
export function TransitionGlyph({ glyph }: { glyph: string }) {
  return (
    <div aria-hidden="true" className="my-2 flex justify-center text-[#6a6a6a]">
      <span className="font-mono text-[16px]">
        {glyph}
      </span>
    </div>
  );
}
