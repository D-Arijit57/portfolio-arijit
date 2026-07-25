import React from 'react';
import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import type { VirtualFile } from '../../types';
import { widgetAwareComponents } from '../documentation/documentationWidgets';

const markdownComponents: Components = widgetAwareComponents;

/**
 * Sprint 10F: pulled out of renderFileContent() so ResumeWorkspace's left
 * panel can render RESUME.md through the exact same markdown renderer/prose
 * styling as every other markdown file, per the sprint brief's "reuse the
 * existing markdown renderer" requirement — no parallel implementation.
 *
 * Extracted into its own module (not defined inline in EditorRenderer.tsx)
 * so ProjectDocumentationViewer can import it for its own empty-state
 * fallback without EditorRenderer.tsx and the documentation/ presentation
 * layer importing each other in a cycle.
 */
export function MarkdownFileView({ file }: { file: VirtualFile }) {
  // Sprint 10D.2: profile.md is the one markdown file wide enough to give
  // its floated `profile-sidebar` (see ProfileSidebar.tsx) room to sit
  // beside the flowing text without cramping either side. Every other
  // markdown file keeps the original max-w-3xl width, completely
  // unchanged — this is a width difference on the shared wrapper, not a
  // different rendering path.
  const containerWidthClass = file.id === 'profile' ? 'max-w-5xl' : 'max-w-3xl';
  return (
    <div className="h-full overflow-y-auto bg-[#1e1e1e] p-8 text-[#cccccc]">
      <div className={`${containerWidthClass} font-sans [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:border-b [&>h1]:border-[#3c3c3c] [&>h1]:pb-2 [&>h1]:text-white [&>h1]:mb-4 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:text-white [&>h2]:mb-4 [&>h2]:mt-8 [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-4 [&>ul>li]:mb-2 [&>blockquote]:my-4 [&>blockquote]:border-l-2 [&>blockquote]:border-[#3c3c3c] [&>blockquote]:bg-[#252526] [&>blockquote]:px-4 [&>blockquote]:py-2 [&>blockquote]:italic [&>blockquote]:text-[13px] [&>blockquote]:text-[#9d9d9d] [&>blockquote>p]:mb-0 [&>pre]:bg-[#1e1e1e] [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:border [&>pre]:border-[#333333] [&>pre]:my-4 [&>pre>code]:font-mono [&>pre>code]:text-[13px] [&_code:not(pre>code)]:bg-[#333333] [&_code:not(pre>code)]:px-1.5 [&_code:not(pre>code)]:py-0.5 [&_code:not(pre>code)]:rounded [&_code:not(pre>code)]:text-white [&_strong]:text-white [&_a]:text-[#007acc] [&_a]:hover:underline`}>
        <Markdown components={markdownComponents}>{file.content}</Markdown>
      </div>
    </div>
  );
}
