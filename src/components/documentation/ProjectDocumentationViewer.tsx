import React, { useMemo } from 'react';
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

  if (model.sections.length === 0 && !model.intro) {
    return <MarkdownFileView file={file} />;
  }

  return (
    <DocumentationLayout
      hero={<DocumentationHero title={model.title} frontmatter={model.frontmatter} />}
      metadata={<MetadataRow frontmatter={model.frontmatter} />}
      main={
        <>
          {model.intro && (
            <Markdown remarkPlugins={[remarkGfm]} components={components}>
              {model.intro}
            </Markdown>
          )}
          {model.sections.map((section, index) => (
            <DocumentationSection key={section.id} section={section} index={index} components={components} />
          ))}
        </>
      }
      sidebar={<DocumentationSidebar frontmatter={model.frontmatter} sections={model.sections} />}
    />
  );
}
