import React from 'react';
import { motion } from 'motion/react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DocumentationSectionModel } from '../../documentation/types';
import { resolveSectionVisual } from '../../documentation/sectionIcons';

/**
 * One H2-level documentation section: icon + heading + divider, then the
 * section's own markdown body rendered through the shared components map.
 * Sections stagger in with ManifestCard's exact motion timing for visual
 * consistency with the Manifest Viewer. `components` is built once by
 * ProjectDocumentationViewer (createDocumentationComponents, closed over
 * the document's basePath) and passed down rather than rebuilt per section.
 */
export function DocumentationSection({
  section,
  index,
  components,
}: {
  section: DocumentationSectionModel;
  index: number;
  components: Components;
}) {
  const { icon: Icon, accentColor } = resolveSectionVisual(section.heading);

  return (
    <motion.section
      id={section.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
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
