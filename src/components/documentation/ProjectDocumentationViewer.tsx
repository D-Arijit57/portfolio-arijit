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
import { ProjectIdentityLine } from './ProjectIdentityLine';
import { RakshachakraDocFlow } from './RakshachakraDocFlow';
import { LatticeDocFlow } from './LatticeDocFlow';
import { LatticeLoginSnapshot } from './LatticeLoginSnapshot';
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
 * One real, narrow, explicitly-approved exception to the generic path —
 * not "a project doc with slightly different styling" but a different
 * main-content renderer entirely, sharing one hero (`ProjectIdentityLine`,
 * `head -1`) and one page background (`PAGE_BACKGROUND`):
 *
 *   - Rakshachakra (`isRakshachakraDoc`): `RakshachakraDocFlow` — a linear
 *     chain (problem.sh → signals.sh → session.sh, then explore) built from
 *     the shared terminal-grammar primitives (`ProjectTerminalPanel`,
 *     `useInViewOnce`, `useFileRevealSequence`, `FeatureOutputTerminal`,
 *     `ProjectExploreTerminal`). It never reads `model.intro`, `sidebar`,
 *     or the shared reveal `sequence`.
 *
 *   - Lattice (`isLatticeDoc`): `LatticeDocFlow` — the same chain shape
 *     (problem.sh → schema.sh → request.sh, then explore), plus a login-page
 *     snapshot in the hero's top-right corner.
 *
 * Every other project doc is unaffected and gets the
 * generic hero/sidebar/section treatment. A doc becomes a terminal-grammar
 * page the same way Rakshachakra did: a real branch here, not a config flag.
 */
export function ProjectDocumentationViewer({ file }: { file: VirtualFile }) {
  const model = useMemo(() => parseDocumentationDocument(file.content), [file.content]);
  const isRakshachakraDoc = file.id === 'rakshachakra_readme';
  const isLatticeDoc = file.id === 'lattice_readme';
  const isTerminalGrammarDoc = isRakshachakraDoc || isLatticeDoc;

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

  const liveDemoUrl = isLatticeDoc
    ? model.sections
        .find((section) => section.heading.toLowerCase() === 'continue exploring')
        ?.bodyMarkdown.match(/\[Live Demo\]\((https?:\/\/[^)]+)\)/i)?.[1]
    : undefined;

  const mainContent = isRakshachakraDoc ? (
    <RakshachakraDocFlow model={model} basePath={basePath} />
  ) : isLatticeDoc ? (
    <LatticeDocFlow model={model} basePath={basePath} />
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
        isLatticeDoc ? (
          <div className="relative">
            <LatticeLoginSnapshot href={liveDemoUrl} />
            <div className="md:pr-[250px] lg:pr-[330px]">
              <ProjectIdentityLine title={model.title} frontmatter={model.frontmatter} fileName={fileName} />
            </div>
          </div>
        ) : isTerminalGrammarDoc ? (
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
