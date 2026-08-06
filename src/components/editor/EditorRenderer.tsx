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
import { StartupLogViewer } from './StartupLogViewer';
import { ShikiEditor } from './ShikiEditor';
import { ResumeWorkspace } from '../resume/ResumeWorkspace';
import { resolveVisualization } from '../../graph/registry/visualizationRegistry';
import '../../graph/registerBuiltins';
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
  // ResumeWorkspace.tsx) — untouched by the Workspace-Wide File Opening
  // Animation System sprint, which drives every other renderer below.
  if (file.id === 'resume') {
    return <ResumeWorkspace file={file} />;
  }

  // startup.log owns its own animated renderer — see StartupLogViewer.tsx
  // and components/signature/TerminalRunner.tsx.
  if (file.id === 'startup-log') {
    return <StartupLogViewer file={file} />;
  }

  // Sprint: Workspace-Wide File Opening Animation System — each renderer
  // now drives its own reveal internally via useFileRevealSequence
  // (block-by-block for markdown, per-line for code/YAML, node-then-edge
  // for Mermaid, per-category for the Manifest Viewer), replacing the old
  // one-size-fits-all TypingReveal clip-path wrap that used to sit here.
  return renderFileContent(file);
}

function renderFileContent(file: VirtualFile) {
  // Project documentation (see documentation/fileMatch.ts: any .md directly
  // inside /projects/<Name>/) gets the rich Project Documentation Viewer;
  // every other markdown file keeps the plain MarkdownFileView, unchanged.
  if (file.type === 'markdown') {
    return isProjectDocFile(file) ? <ProjectDocumentationViewer file={file} /> : <MarkdownFileView file={file} />;
  }

  if (file.id === 'work_history') {
    return <WorkHistoryViewer />;
  }

  // Portfolio Polish Sprint (Architecture full-screen): .mmd is a dedicated
  // full-screen visualization, not a code file — every pane renders the
  // Architecture Canvas, never the raw Mermaid source (see
  // ARCHITECTURE_PLATFORM_DESIGN.md §9's revision note; this replaces the
  // old pane-aware raw-source/canvas split). Every other file type is
  // unaffected.
  if (file.type === 'mermaid') {
    return <ArchitectureCanvas file={file} />;
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

  // Visualization Registry — proving itself this sprint with the Knowledge
  // Graph Renderer only (see graph/registry/visualizationRegistry.ts).
  // Markdown/Mermaid/Manifest above stay as their existing hardcoded
  // branches on purpose; migrating them onto this same registry is a
  // deliberate future follow-up, not part of this sprint.
  const visualization = resolveVisualization(file);
  if (visualization) {
    const Component = visualization.component;
    return <Component file={file} />;
  }

  return <ShikiEditor fileId={file.id} />;
}
