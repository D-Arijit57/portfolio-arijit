import type { ReactNode } from 'react';

/**
 * Sprint 18 (spec §4.1, §11): the container the stage renders into.
 *
 * Sprint 17 drew a CSS perspective grid and an ambient light pool here,
 * behind a transparent WebGL canvas. Sprint 18's spec supersedes that: §4.1
 * ranks the CSS plane as fallback-tier only, because it cannot receive real
 * shadows, cannot participate in lighting, and aliases badly at grazing
 * angles. The floor is now an analytic shader grid inside the scene
 * (scene/ground.ts) and the backdrop is a dithered in-scene gradient
 * (scene/backdrop.ts) — which is also what allows the ground fog to match
 * the backdrop exactly, so there is no seam where they meet (spec §13.5).
 *
 * The renderer consequently runs opaque, and this element is just the sized
 * box it fills. The solid background below is only what shows for the
 * moment before the first frame lands; the CSS grid lives on in the
 * fallback tier (preview/StageFallback.tsx), which is where §8.3 puts it.
 */
export function ResumeStage({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-0 flex-1 overflow-hidden bg-[var(--resume-stage-bg)]">
      {children}
    </div>
  );
}
