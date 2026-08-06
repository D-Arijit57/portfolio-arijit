import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { VirtualFile } from '../../types';
import type { DocumentationModel } from '../../documentation/types';
import { parseDocumentationDocument } from '../../documentation/parser';
import { MarkdownFileView } from '../editor/MarkdownFileView';
import { DocumentationLayout } from './DocumentationLayout';
import { DocumentationHero } from './DocumentationHero';
import { MetadataRow } from './MetadataRow';
import { DocumentationSidebar } from './DocumentationSidebar';
import { DocumentationSection } from './DocumentationSection';
import { EngineeringNotesColumn } from './EngineeringNotesColumn';
import { createDocumentationComponents } from './documentationComponents';
import { useFileRevealSequence, type FileRevealSequenceResult } from '../../hooks/useFileRevealSequence';
import { hasAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import { SESSION_KEY as CORTEXA_TERMINALS_SESSION_KEY, BUILD_COMPLETE_EVENT } from './ProblemSolutionTerminals';

/**
 * The doc's H2 sections, factored out of ProjectDocumentationViewer so the
 * Cortexa-only late-mount path (§6 below) can wrap this same rendering in
 * one outer fade without duplicating the section/pairing logic. `fadeIn`
 * is the only behavioral difference from an always-true, always-inline
 * render — see its own call-site comment.
 */
function MainSections({
  fadeIn,
  model,
  introOffset,
  pairedHighlights,
  components,
  sequence,
}: {
  fadeIn: boolean;
  model: DocumentationModel;
  introOffset: number;
  pairedHighlights: string[];
  components: Components;
  sequence: FileRevealSequenceResult;
}) {
  const content = model.sections.map((section, index) => {
    const unitIndex = index + introOffset;
    const pairWithNotes = pairedHighlights.length > 0 && /feature/i.test(section.heading);

    if (pairWithNotes) {
      return (
        <div key={section.id} className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
          <DocumentationSection section={section} unitIndex={unitIndex} components={components} sequence={sequence} />
          <EngineeringNotesColumn highlights={pairedHighlights} unitIndex={unitIndex} sequence={sequence} />
        </div>
      );
    }

    return <DocumentationSection key={section.id} section={section} unitIndex={unitIndex} components={components} sequence={sequence} />;
  });

  if (!fadeIn) return <>{content}</>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
      {content}
    </motion.div>
  );
}

/**
 * The Project Documentation Viewer — a dedicated renderer for project
 * documentation markdown (see documentation/fileMatch.ts's path-based
 * scope), the third native workspace renderer alongside the Architecture
 * Canvas and Manifest Viewer. Renders entirely from the parsed
 * DocumentationModel; it never hardcodes a project name, section, or
 * technology, so any future project doc at /projects/<Name>/*.md gets the
 * same hero/sidebar/section treatment automatically.
 *
 * One deliberate, explicitly-approved exception (Documentation Redesign,
 * Iteration 3): Cortexa's Engineering Notes pair side-by-side with its Core
 * Features section (a balanced two-column layout) instead of sitting in the
 * sidebar — the user asked for this scoped to Cortexa only, not applied
 * generically, so `isCortexaDoc` below is a real, narrow project check
 * rather than the usual project-agnostic rendering. Every other project doc
 * (Rakshachakra included) keeps highlights in the sidebar exactly as
 * before, unaffected by this branch.
 */
export function ProjectDocumentationViewer({ file }: { file: VirtualFile }) {
  const model = useMemo(() => parseDocumentationDocument(file.content), [file.content]);
  const isCortexaDoc = file.id === 'cortexa_readme';

  // The folder this doc lives in — link-card targets (documentation/linkCards.ts,
  // e.g. "Continue Exploring" cards) resolve relative to this, the same way a
  // real filesystem link would, so the renderer never hardcodes a sibling
  // file's id.
  const basePath = file.path.slice(0, file.path.lastIndexOf('/'));
  const fileName = file.path.slice(file.path.lastIndexOf('/') + 1);
  const components = useMemo(() => createDocumentationComponents(basePath), [basePath]);
  const highlights = Array.isArray(model.frontmatter.highlights) ? model.frontmatter.highlights : [];
  const pairedHighlights = isCortexaDoc ? highlights : [];
  const sidebarHighlights = isCortexaDoc ? [] : highlights;

  // Intro (if present) is unit 0; every section's unit index shifts by one
  // to make room for it — one shared reveal sequence spans the whole doc.
  const introOffset = model.intro ? 1 : 0;
  const sequence = useFileRevealSequence({
    fileId: file.id,
    unitCount: model.sections.length + introOffset,
  });

  // Interaction Polish (Iteration 5 §6): Cortexa's Core Features/Continue
  // Exploring wait for the terminals' own "Solution Found" beat rather than
  // the doc's generic entrance timer above — that timer finishes in under a
  // second regardless of how long the terminals take to actually type,
  // which would reveal the rest of the page mid-build on a first-time
  // visit. `cortexaBuildAlreadyDone` mirrors ProblemSolutionTerminals' own
  // `instant` check (same session key, same prefers-reduced-motion read) so
  // a repeat-visit-this-session or reduced-motion mount starts unlocked —
  // never a wait once the story has already played once. Scoped to
  // `isCortexaDoc` alone; every other project doc's sections render exactly
  // as before, ungated.
  const cortexaBuildAlreadyDone = isCortexaDoc && (hasAnimated(CORTEXA_TERMINALS_SESSION_KEY) || prefersReducedMotion());
  const [sectionsReady, setSectionsReady] = useState(() => !isCortexaDoc || cortexaBuildAlreadyDone);

  useEffect(() => {
    if (!isCortexaDoc || sectionsReady) return undefined;
    const handleBuildComplete = () => setSectionsReady(true);
    window.addEventListener(BUILD_COMPLETE_EVENT, handleBuildComplete);
    return () => window.removeEventListener(BUILD_COMPLETE_EVENT, handleBuildComplete);
  }, [isCortexaDoc, sectionsReady]);

  if (model.sections.length === 0 && !model.intro) {
    return <MarkdownFileView file={file} />;
  }

  return (
    <DocumentationLayout
      containerRef={sequence.containerRef as React.RefObject<HTMLDivElement>}
      hero={<DocumentationHero title={model.title} frontmatter={model.frontmatter} fileName={fileName} />}
      metadata={<MetadataRow frontmatter={model.frontmatter} />}
      intro={
        model.intro && (
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
        )
      }
      main={
        sectionsReady ? (
          <MainSections
            // Only Cortexa's sections mount late (after "Solution Found"),
            // by which point `sequence.isComplete` is already true (its own
            // ~1s entrance timer has long since elapsed) — its per-unit
            // `transition={sequence.isComplete ? {duration:0} : undefined}`
            // would otherwise pop these in with no fade at all. This outer
            // fade only wraps the gated Cortexa path; every other doc's
            // sections render exactly as before, ungated and unwrapped.
            fadeIn={isCortexaDoc && !cortexaBuildAlreadyDone}
            model={model}
            introOffset={introOffset}
            pairedHighlights={pairedHighlights}
            components={components}
            sequence={sequence}
          />
        ) : null
      }
      sidebar={<DocumentationSidebar highlights={sidebarHighlights} sections={model.sections} />}
    />
  );
}
