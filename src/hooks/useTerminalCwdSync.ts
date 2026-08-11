import { useEffect } from 'react';
import { useStore } from '../store/useStore';

/**
 * Phase 9C ("two views, one system"): keeps the Terminal's working directory
 * pointed at whatever file the workspace is currently showing, so the shell
 * and the editor are two views of the same place rather than two unrelated
 * panels — `ls` lists the project you're reading, `cat <sibling>` needs no
 * path.
 *
 * Deliberately one effect keyed on `activeFileId` alone, mounted once at the
 * shell level, rather than a call added to each navigation entry point.
 * Explorer clicks, Command Palette selections, router/popstate deep links,
 * terminal `open`, and clickable `file-link` output all converge on
 * activeFileId, so all five inherit this without any of them gaining a
 * dependency on the terminal — and no future navigation path can forget to
 * opt in.
 *
 * Mounted in VSCodeShell rather than inside Terminal.tsx because Terminal
 * returns null while the panel is toggled closed; an effect living there
 * would stop tracking, and reopening the panel would reveal a stale cwd.
 *
 * The "has the visitor taken the shell with their own `cd`?" check lives in
 * the store action, not here — this hook's only job is to say *when* to
 * re-derive, never whether it's allowed to.
 */
export function useTerminalCwdSync(): void {
  const activeFileId = useStore((state) => state.activeFileId);
  const syncCwdToActiveFile = useStore((state) => state.syncCwdToActiveFile);

  useEffect(() => {
    syncCwdToActiveFile();
  }, [activeFileId, syncCwdToActiveFile]);
}
