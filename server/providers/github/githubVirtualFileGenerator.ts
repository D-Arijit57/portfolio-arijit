import type { VirtualFile } from '../../types';

export interface GitHubMarkdownBundle {
  readme: string;
  profile: string;
  repositories: string;
  pinned: string;
  activity: string;
  contributions: string;
}

const GITHUB_NAMESPACE = 'github';

/**
 * VirtualFile Generator stage (VFS_DESIGN.md §11.2): wraps each markdown
 * string into a VirtualFile — namespaced id per §2, path, type: 'markdown',
 * isReadonly: true. Knows the VirtualFile contract and the id-namespacing
 * rule; knows nothing about the GitHub API shape.
 *
 * Returns the flat set of files reconcileGeneratedSubtree expects as the
 * "github" namespace's direct children (VFS_DESIGN.md §7.1) — the repository
 * builds the /github folder wrapper itself.
 */
export function generateGitHubVirtualFiles(markdown: GitHubMarkdownBundle): VirtualFile[] {
  const file = (key: string, name: string, content: string): VirtualFile => ({
    id: `${GITHUB_NAMESPACE}:${key}`,
    name,
    type: 'markdown',
    path: `/${GITHUB_NAMESPACE}/${name}`,
    content,
    isReadonly: true,
  });

  return [
    file('readme', 'README.md', markdown.readme),
    file('profile', 'profile.md', markdown.profile),
    file('repositories', 'repositories.md', markdown.repositories),
    file('pinned', 'pinned.md', markdown.pinned),
    file('activity', 'activity.md', markdown.activity),
    file('contributions', 'contributions.md', markdown.contributions),
  ];
}
