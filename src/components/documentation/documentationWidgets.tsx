import React from 'react';
import { IdentityTerminals } from '../shared/IdentityTerminals';
import { ContributionsTerminal } from '../shared/ContributionsTerminal';
import { AboutSection } from '../shared/AboutSection';
import { AboutActivityRow } from '../shared/AboutActivityRow';
import { GitHubContributionGraph } from '../shared/GitHubContributionGraph';
import { RecentActivityLog } from '../shared/RecentActivityLog';
import { WelcomeIntro } from '../shared/WelcomeIntro';

/**
 * Extension point for embedding rich widgets inside ordinary markdown files,
 * without a parallel renderer: any fenced code block whose language tag
 * matches a key here renders that component instead of a code block. This
 * is the *one* mechanism every markdown file shares — relocated out of
 * EditorRenderer.tsx so both the plain MarkdownFileView and the Project
 * Documentation Viewer's own component map import the same definition
 * rather than drifting into two copies. `github-contribution-calendar`,
 * `about-section` and `github-recent-activity` all stay registered
 * individually (reusable on their own) even though whoami.md itself
 * reaches About and Recent Activity together through the single
 * `about-activity-row` marker, and GitHub Contributions entirely through
 * `contributions-terminal` (which owns its own "arijit@github:~$
 * ./contributions.sh" heading — no separate markdown heading needed, see
 * workspaceSeed.ts).
 */
const MARKDOWN_WIDGETS: Record<string, React.ComponentType> = {
  'identity-terminals': IdentityTerminals,
  'contributions-terminal': ContributionsTerminal,
  'about-section': AboutSection,
  'about-activity-row': AboutActivityRow,
  'github-contribution-calendar': GitHubContributionGraph,
  'github-recent-activity': RecentActivityLog,
  'welcome-intro': WelcomeIntro,
};

export function widgetForLanguage(className: string | undefined): React.ComponentType | undefined {
  const match = /language-([\w-]+)/.exec(className ?? '');
  return match ? MARKDOWN_WIDGETS[match[1]] : undefined;
}
