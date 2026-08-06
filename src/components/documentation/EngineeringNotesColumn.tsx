import React from 'react';
import { motion } from 'motion/react';
import { NotebookText } from 'lucide-react';
import { colorForString } from '../../manifest/colorHash';
import type { FileRevealSequenceResult } from '../../hooks/useFileRevealSequence';

/**
 * Documentation Redesign (Iteration 3) — Engineering Notes, previously a
 * sidebar block (frontmatter.highlights), now paired side-by-side with the
 * Core Features section for a balanced two-column layout instead of a
 * right-rail (see ProjectDocumentationViewer.tsx's isCortexaDoc gate —
 * Cortexa-only per explicit direction; every other project doc keeps
 * highlights in the sidebar exactly as before). Shares FeatureGrid's own
 * hairline-divided-list treatment (border-y/divide-y) so the two columns
 * read as one visual family, and the same icon+heading+divider header
 * DocumentationSection itself uses, even though this isn't a real markdown
 * H2 — `unitIndex`/`sequence` are the same ones passed to the paired Core
 * Features section, so both columns reveal together as one beat.
 */
export function EngineeringNotesColumn({
  highlights,
  unitIndex,
  sequence,
}: {
  highlights: string[];
  unitIndex: number;
  sequence: FileRevealSequenceResult;
}) {
  const accentColor = colorForString('Engineering Notes');

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      custom={unitIndex}
      variants={sequence.unitVariants}
      transition={sequence.isComplete ? { duration: 0 } : undefined}
      className="scroll-mt-8"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <NotebookText size={18} color={accentColor} className="shrink-0" />
        <h2 className="text-[20px] font-semibold text-white">Engineering Notes</h2>
      </div>
      <div className="mb-6 h-px bg-[#3c3c3c]" />
      <div className="flex flex-col divide-y divide-[#3c3c3c] border-y border-[#3c3c3c]">
        {highlights.map((note) => (
          <div key={note} className="flex items-baseline gap-2.5 px-1 py-2.5">
            <span className="text-[#4ec9b0]">•</span>
            <p className="min-w-0 text-[13px] leading-relaxed text-[#9d9d9d]">{note}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
