import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { VirtualFile } from '../../types';
import { parseDocumentationDocument } from '../../documentation/parser';
import { MarkdownFileView } from '../editor/MarkdownFileView';
import { DocumentationLayout } from './DocumentationLayout';
import { DocumentationHero } from './DocumentationHero';
import { MetadataRow } from './MetadataRow';
import { DocumentationSidebar } from './DocumentationSidebar';
import { DocumentationSection } from './DocumentationSection';
import { createDocumentationComponents } from './documentationComponents';
import { useFileRevealSequence } from '../../hooks/useFileRevealSequence';

/**
 * The Project Documentation Viewer — a dedicated renderer for project
 * documentation markdown (see documentation/fileMatch.ts's path-based
 * scope), the third native workspace renderer alongside the Architecture
 * Canvas and Manifest Viewer. Renders entirely from the parsed
 * DocumentationModel; it never hardcodes a project name, section, or
 * technology, so any future project doc at /projects/<Name>/*.md gets the
 * same hero/sidebar/section treatment automatically.
 */
export function ProjectDocumentationViewer({ file }: { file: VirtualFile }) {
  const model = useMemo(() => parseDocumentationDocument(file.content), [file.content]);

  // The folder this doc lives in — link-card targets (documentation/linkCards.ts,
  // e.g. "Continue Exploring" cards) resolve relative to this, the same way a
  // real filesystem link would, so the renderer never hardcodes a sibling
  // file's id.
  const basePath = file.path.slice(0, file.path.lastIndexOf('/'));
  const components = useMemo(() => createDocumentationComponents(basePath), [basePath]);

  // Intro (if present) is unit 0; every section's unit index shifts by one
  // to make room for it — one shared reveal sequence spans the whole doc.
  const introOffset = model.intro ? 1 : 0;
  const sequence = useFileRevealSequence({
    fileId: file.id,
    unitCount: model.sections.length + introOffset,
  });

  if (model.sections.length === 0 && !model.intro) {
    return <MarkdownFileView file={file} />;
  }

  return (
    <DocumentationLayout
      containerRef={sequence.containerRef as React.RefObject<HTMLDivElement>}
      hero={<DocumentationHero title={model.title} frontmatter={model.frontmatter} />}
      metadata={<MetadataRow frontmatter={model.frontmatter} />}
      main={
        <>
          {model.intro && (
            <motion.div
              initial="hidden"
              animate="visible"
              custom={0}
              variants={sequence.unitVariants}
              transition={sequence.isComplete ? { duration: 0 } : undefined}
              onAnimationComplete={sequence.isLastUnit(0) ? sequence.onLastUnitComplete : undefined}
            >
              <Markdown remarkPlugins={[remarkGfm]} components={components}>
                {model.intro}
              </Markdown>
            </motion.div>
          )}
          {model.sections.map((section, index) => (
            <DocumentationSection
              key={section.id}
              section={section}
              unitIndex={index + introOffset}
              components={components}
              sequence={sequence}
            />
          ))}
        </>
      }
      sidebar={<DocumentationSidebar frontmatter={model.frontmatter} sections={model.sections} />}
    />
  );
}
