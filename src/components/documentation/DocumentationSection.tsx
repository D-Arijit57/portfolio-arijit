import React from 'react';
import { motion } from 'motion/react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DocumentationSectionModel } from '../../documentation/types';
import { resolveSectionVisual } from '../../documentation/sectionIcons';
import type { FileRevealSequenceResult } from '../../hooks/useFileRevealSequence';

/**
 * One H2-level documentation section: icon + heading + divider, then the
 * section's own markdown body rendered through the shared components map.
 * `components` is built once by ProjectDocumentationViewer
 * (createDocumentationComponents, closed over the document's basePath) and
 * passed down rather than rebuilt per section.
 *
 * Sprint: Workspace-Wide File Opening Animation System — stagger now comes
 * from the shared useFileRevealSequence engine (`sequence`/`unitIndex`)
 * instead of a bare `index * 0.04`, which used to replay on every remount
 * (e.g. revisiting a previously-viewed project doc tab within the same
 * session) since it had no session-gating of its own.
 */
export function DocumentationSection({
  section,
  unitIndex,
  components,
  sequence,
}: {
  section: DocumentationSectionModel;
  unitIndex: number;
  components: Components;
  sequence: FileRevealSequenceResult;
}) {
  const { icon: Icon, accentColor } = resolveSectionVisual(section.heading);

  return (
    <motion.section
      id={section.id}
      initial="hidden"
      animate="visible"
      custom={unitIndex}
      variants={sequence.unitVariants}
      transition={sequence.isComplete ? { duration: 0 } : undefined}
      onAnimationComplete={sequence.isLastUnit(unitIndex) ? sequence.onLastUnitComplete : undefined}
      className="scroll-mt-8 pt-8 first:pt-0"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <Icon size={18} color={accentColor} className="shrink-0" />
        <h2 className="text-[20px] font-semibold text-white">{section.heading}</h2>
      </div>
      <div className="mb-6 h-px bg-[#3c3c3c]" />
      {/* remarkGfm: plain react-markdown doesn't parse pipe-table syntax at
          all (it falls through as raw text) — needed for sections like
          "Managed Services" to reach documentationComponents' table
          overrides. Scoped to the Documentation Viewer only. */}
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {section.bodyMarkdown}
      </Markdown>
    </motion.section>
  );
}
