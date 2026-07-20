import React from 'react';
import { useStore } from '../../store/useStore';
import { getFileById } from '../../content/fileSystem';
import Markdown, { type Components } from 'react-markdown';
import { WorkHistoryViewer } from './WorkHistoryViewer';
import { MermaidViewer } from './MermaidViewer';
import { ShikiEditor } from './ShikiEditor';
import { TypingReveal } from '../shared/TypingReveal';
import { ProfileStatusCard } from '../shared/ProfileStatusCard';
import { TechStackPills } from '../shared/TechStackPills';
import { GitHubContributionGraph } from '../shared/GitHubContributionGraph';
import { RecentActivityLog } from '../shared/RecentActivityLog';
import type { VirtualFile } from '../../types';

/**
 * Extension point for embedding rich widgets inside ordinary markdown files,
 * without a parallel renderer: any fenced code block whose language tag
 * matches a key here renders that component instead of a code block. This is
 * the *one* mechanism every markdown file shares (wired once, below) — a
 * future file opts in just by including e.g. ```github-contribution-calendar
 * in its own content, the same way profile.md does.
 */
const MARKDOWN_WIDGETS: Record<string, React.ComponentType> = {
  'profile-status': ProfileStatusCard,
  'tech-stack': TechStackPills,
  'github-contribution-calendar': GitHubContributionGraph,
  'github-recent-activity': RecentActivityLog,
};

function widgetForLanguage(className: string | undefined): React.ComponentType | undefined {
  const match = /language-([\w-]+)/.exec(className ?? '');
  return match ? MARKDOWN_WIDGETS[match[1]] : undefined;
}

const markdownComponents: Components = {
  pre({ children }) {
    const child = React.isValidElement<{ className?: string }>(children) ? children : null;
    if (child && widgetForLanguage(child.props.className)) {
      return <>{children}</>;
    }
    return <pre>{children}</pre>;
  },
  code({ className, children }) {
    const Widget = widgetForLanguage(className);
    if (Widget) {
      return <Widget />;
    }
    return <code className={className}>{children}</code>;
  },
};

export function EditorRenderer({ pane }: { pane: 'left' | 'right' }) {
  const { activeFileId, openedTabs } = useStore();

  const activeTabInPane = openedTabs.find(t => t.fileId === activeFileId && t.pane === pane)
    || openedTabs.filter(t => t.pane === pane).pop();

  if (!activeTabInPane) return null;

  const file = getFileById(activeTabInPane.fileId);
  if (!file) return null;

  return (
    <TypingReveal fileId={file.id} contentLength={file.content.length}>
      {renderFileContent(file)}
    </TypingReveal>
  );
}

function renderFileContent(file: VirtualFile) {
  if (file.type === 'markdown') {
    return (
      <div className="h-full overflow-y-auto bg-[#1e1e1e] p-8 text-[#cccccc]">
        <div className="max-w-3xl font-sans [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:border-b [&>h1]:border-[#3c3c3c] [&>h1]:pb-2 [&>h1]:text-white [&>h1]:mb-4 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:text-white [&>h2]:mb-4 [&>h2]:mt-8 [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:mb-4 [&>ul>li]:mb-2 [&>blockquote]:my-4 [&>blockquote]:border-l-2 [&>blockquote]:border-[#3c3c3c] [&>blockquote]:bg-[#252526] [&>blockquote]:px-4 [&>blockquote]:py-2 [&>blockquote]:italic [&>blockquote]:text-[13px] [&>blockquote]:text-[#9d9d9d] [&>blockquote>p]:mb-0 [&>pre]:bg-[#1e1e1e] [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:border [&>pre]:border-[#333333] [&>pre]:my-4 [&>pre>code]:font-mono [&>pre>code]:text-[13px] [&_code:not(pre>code)]:bg-[#333333] [&_code:not(pre>code)]:px-1.5 [&_code:not(pre>code)]:py-0.5 [&_code:not(pre>code)]:rounded [&_code:not(pre>code)]:text-white [&_strong]:text-white [&_a]:text-[#007acc] [&_a]:hover:underline">
          <Markdown components={markdownComponents}>{file.content}</Markdown>
        </div>
      </div>
    );
  }

  if (file.id === 'work_history') {
    return <WorkHistoryViewer />;
  }

  if (file.type === 'mermaid') {
    return <MermaidViewer content={file.content} />;
  }

  return <ShikiEditor fileId={file.id} />;
}
