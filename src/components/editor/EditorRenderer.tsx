import React from 'react';
import { useStore } from '../../store/useStore';
import { getFileById } from '../../content/fileSystem';
import { WorkHistoryViewer } from './WorkHistoryViewer';
import { ArchitectureCanvas } from '../architecture/ArchitectureCanvas';
import { ManifestViewer } from '../manifest/ManifestViewer';
import { isManifestFile } from '../../manifest/fileMatch';
import { isProjectDocFile } from '../../documentation/fileMatch';
import { ProjectDocumentationViewer } from '../documentation/ProjectDocumentationViewer';
import { MarkdownFileView } from './MarkdownFileView';
import { ShikiEditor } from './ShikiEditor';
import { TypingReveal } from '../shared/TypingReveal';
import { ResumeWorkspace } from '../resume/ResumeWorkspace';
import type { VirtualFile } from '../../types';

export function EditorRenderer({ pane }: { pane: 'left' | 'right' }) {
  const { activeFileId, openedTabs } = useStore();

  const activeTabInPane = openedTabs.find(t => t.fileId === activeFileId && t.pane === pane)
    || openedTabs.filter(t => t.pane === pane).pop();

  if (!activeTabInPane) return null;

  const file = getFileById(activeTabInPane.fileId);
  if (!file) return null;

  // Sprint 10F: RESUME.md owns its own internal synchronized split (markdown
  // source + 3D preview) and its own typing-reveal sequencing (see
  // ResumeWorkspace.tsx) — it deliberately bypasses the generic single-clip
  // TypingReveal wrap below, unlike work_history which stays inside it.
  if (file.id === 'resume') {
    return <ResumeWorkspace file={file} />;
  }

  return (
    <TypingReveal fileId={file.id} contentLength={file.content.length}>
      {renderFileContent(file, pane)}
    </TypingReveal>
  );
}

function renderFileContent(file: VirtualFile, pane: 'left' | 'right') {
  // Project documentation (see documentation/fileMatch.ts: any .md directly
  // inside /projects/<Name>/) gets the rich Project Documentation Viewer;
  // every other markdown file keeps the plain MarkdownFileView, unchanged.
  if (file.type === 'markdown') {
    return isProjectDocFile(file) ? <ProjectDocumentationViewer file={file} /> : <MarkdownFileView file={file} />;
  }

  if (file.id === 'work_history') {
    return <WorkHistoryViewer />;
  }

  // ARCHITECTURE_PLATFORM_DESIGN.md §9: .mmd is pane-aware — left shows raw
  // source (the existing ShikiEditor, unchanged), right shows the real
  // Architecture Canvas renderer. Every other file type is unaffected.
  if (file.type === 'mermaid') {
    return pane === 'right' ? <ArchitectureCanvas file={file} /> : <ShikiEditor fileId={file.id} />;
  }

  // Manifest Viewer v2: manifest.json is a single rendered file, never raw
  // JSON, in either pane — its raw source is an internal implementation
  // detail (see useStore's requiresDualPaneSplit branch, which now pairs it
  // with its project's architecture.mmd in the other pane instead of
  // showing manifest.json's own source). Every other JSON file (metrics,
  // package.json-style files, etc.) keeps rendering through the plain
  // ShikiEditor below, unaffected.
  if (isManifestFile(file)) {
    return <ManifestViewer file={file} />;
  }

  return <ShikiEditor fileId={file.id} />;
}
