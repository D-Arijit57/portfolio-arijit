import type { VirtualFile } from '../../types';

export interface LeetCodeMarkdownBundle {
  readme: string;
  profile: string;
  stats: string;
  recent: string;
  contests: string;
  activity: string;
}

const LEETCODE_NAMESPACE = 'leetcode';

/**
 * VirtualFile Generator stage (VFS_DESIGN.md §11.2): wraps each markdown
 * string into a VirtualFile — namespaced id per §2, path, type: 'markdown',
 * isReadonly: true. Knows the VirtualFile contract and the id-namespacing
 * rule; knows nothing about the LeetCode API shape.
 *
 * Returns the flat set of files reconcileGeneratedSubtree expects as the
 * "leetcode" namespace's direct children (VFS_DESIGN.md §7.1) — the
 * repository builds the /leetcode folder wrapper itself.
 */
export function generateLeetCodeVirtualFiles(markdown: LeetCodeMarkdownBundle): VirtualFile[] {
  const file = (key: string, name: string, content: string): VirtualFile => ({
    id: `${LEETCODE_NAMESPACE}:${key}`,
    name,
    type: 'markdown',
    path: `/${LEETCODE_NAMESPACE}/${name}`,
    content,
    isReadonly: true,
  });

  return [
    file('readme', 'README.md', markdown.readme),
    file('profile', 'profile.md', markdown.profile),
    file('stats', 'stats.md', markdown.stats),
    file('recent', 'recent.md', markdown.recent),
    file('contests', 'contests.md', markdown.contests),
    file('activity', 'activity.md', markdown.activity),
  ];
}
