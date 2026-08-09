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
import { CortexaExecutionFlow } from './CortexaExecutionFlow';
import { CortexaExploreTerminal } from './CortexaExploreTerminal';
import { ProjectIdentityLine } from './ProjectIdentityLine';
import { RakshachakraDocFlow } from './RakshachakraDocFlow';
import { createDocumentationComponents } from './documentationComponents';
import { useFileRevealSequence } from '../../hooks/useFileRevealSequence';
import { PAGE_BACKGROUND } from './ProjectTerminalPanel';

/**
 * The Project Documentation Viewer — a dedicated renderer for project
 * documentation markdown (see documentation/fileMatch.ts's path-based
 * scope), the third native workspace renderer alongside the Architecture
 * Canvas and Manifest Viewer. Renders entirely from the parsed
 * DocumentationModel; it never hardcodes a project name, section, or
 * technology, so any future project doc at /projects/<Name>/*.md gets the
 * same hero/sidebar/section treatment automatically — *unless* it opts into
 * the terminal grammar below.
 *
 * Two real, narrow, explicitly-approved exceptions to the generic path —
 * not "a project doc with slightly different styling" but a different
 * main-content renderer entirely, sharing one hero (`ProjectIdentityLine`,
 * `head -1`) and one page background (`PAGE_BACKGROUND`) but otherwise
 * independent:
 *
 *   - Cortexa (`isCortexaDoc`): `CortexaExecutionFlow` (the three-terminal
 *     chain: problem.sh derives a constraint → cortexa.sh justifies
 *     decisions against it → run-cortexa replays a session as evidence,
 *     then `cat`s the rest of the file), then `CortexaExploreTerminal`
 *     (`$ tree .`).
 *   - Rakshachakra (`isRakshachakraDoc`, Phase 2 of the Rakshachakra Grammar
 *     project): `RakshachakraDocFlow` — a linear chain (overview/problem →
 *     features → architecture → tradeoff → explore) built from the same
 *     shell/typography/reveal *primitives* Cortexa's own chain uses
 *     (`ProjectTerminalPanel`, `useInViewOnce`, `useFileRevealSequence`,
 *     `FeatureOutputTerminal`, `ProjectExploreTerminal`), reusing the
 *     technique without reusing Cortexa's own content (no decision log, no
 *     replay — Rakshachakra's canonical data has no equivalent of either,
 *     and inventing one would mean asserting facts the source material
 *     doesn't). See RakshachakraDocFlow's own comment for the full
 *     reasoning.
 *
 * Both terminal-grammar docs never read `model.intro`, `sidebar`, or the
 * shared reveal `sequence` — every other project doc is completely
 * unaffected, gated by `isCortexaDoc`/`isRakshachakraDoc` below. A doc
 * becomes a third terminal-grammar page the same way these two did: a real
 * branch here, not a config flag, since each one's actual content shape so
 * far has been different enough that a generic "terminal doc" abstraction
 * would be guessing at a shape only two data points have ever shown.
 */
export function ProjectDocumentationViewer({ file }: { file: VirtualFile }) {
  const model = useMemo(() => parseDocumentationDocument(file.content), [file.content]);
  const isCortexaDoc = file.id === 'cortexa_readme';
  const isRakshachakraDoc = file.id === 'rakshachakra_readme';
  const isTerminalGrammarDoc = isCortexaDoc || isRakshachakraDoc;

  // The folder this doc lives in — link-card targets (documentation/linkCards.ts,
  // e.g. "Continue Exploring" cards) resolve relative to this, the same way a
  // real filesystem link would, so the renderer never hardcodes a sibling
  // file's id.
  const basePath = file.path.slice(0, file.path.lastIndexOf('/'));
  const fileName = file.path.slice(file.path.lastIndexOf('/') + 1);
  const components = useMemo(() => createDocumentationComponents(basePath), [basePath]);
  const highlights = Array.isArray(model.frontmatter.highlights) ? model.frontmatter.highlights : [];

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

  const introContent = !isTerminalGrammarDoc && model.intro && (
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
  );

  const mainContent = isCortexaDoc ? (
    <>
      <CortexaExecutionFlow frontmatter={model.frontmatter} fileName={fileName} />
      <CortexaExploreTerminal />
    </>
  ) : isRakshachakraDoc ? (
    <RakshachakraDocFlow model={model} basePath={basePath} />
  ) : (
    <>
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
  );

  return (
    <DocumentationLayout
      containerRef={sequence.containerRef as React.RefObject<HTMLDivElement>}
      hero={
        isTerminalGrammarDoc ? (
          <ProjectIdentityLine title={model.title} frontmatter={model.frontmatter} fileName={fileName} />
        ) : (
          <DocumentationHero title={model.title} frontmatter={model.frontmatter} fileName={fileName} />
        )
      }
      metadata={isTerminalGrammarDoc ? undefined : <MetadataRow frontmatter={model.frontmatter} />}
      intro={introContent}
      main={mainContent}
      sidebar={isTerminalGrammarDoc ? undefined : <DocumentationSidebar highlights={highlights} sections={model.sections} />}
      background={isTerminalGrammarDoc ? PAGE_BACKGROUND : undefined}
    />
  );
}
