import React from 'react';
import { TerminalRunner } from '../signature/TerminalRunner';
import type { VirtualFile } from '../../types';

/**
 * startup.log's right-pane viewer. The pane's own file identity (id
 * `startup-log`, tab/breadcrumb name `startup.log`, the `startup` terminal
 * command that reopens it) is unchanged — only what renders inside it is
 * now TerminalRunner's terminal-story sequence instead of a static boot
 * log. `file` isn't otherwise used: TerminalRunner's own session-gating key
 * is independent of the VFS, since this is a self-contained animated
 * experience rather than a per-file content reveal.
 */
export function StartupLogViewer({ file: _file }: { file: VirtualFile }) {
  return <TerminalRunner />;
}
