import React from 'react';
import { ProfileStatusCard } from '../shared/ProfileStatusCard';
import { ProfileSidebar } from '../shared/ProfileSidebar';
import { TechStackPills } from '../shared/TechStackPills';
import { GitHubContributionGraph } from '../shared/GitHubContributionGraph';
import { RecentActivityLog } from '../shared/RecentActivityLog';

/**
 * Extension point for embedding rich widgets inside ordinary markdown files,
 * without a parallel renderer: any fenced code block whose language tag
 * matches a key here renders that component instead of a code block. This
 * is the *one* mechanism every markdown file shares — relocated out of
 * EditorRenderer.tsx so both the plain MarkdownFileView and the Project
 * Documentation Viewer's own component map import the same definition
 * rather than drifting into two copies. `profile-status` and
 * `github-contribution-calendar` stay registered individually (reusable on
 * their own) even though profile.md itself now composes them together via
 * the single `profile-sidebar` marker.
 */
const MARKDOWN_WIDGETS: Record<string, React.ComponentType> = {
  'profile-status': ProfileStatusCard,
  'profile-sidebar': ProfileSidebar,
  'tech-stack': TechStackPills,
  'github-contribution-calendar': GitHubContributionGraph,
  'github-recent-activity': RecentActivityLog,
};

export function widgetForLanguage(className: string | undefined): React.ComponentType | undefined {
  const match = /language-([\w-]+)/.exec(className ?? '');
  return match ? MARKDOWN_WIDGETS[match[1]] : undefined;
}
