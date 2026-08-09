import React from 'react';
import type { VirtualFile } from '../../../../types';
import type { FileRevealSequenceResult } from '../../../../hooks/useFileRevealSequence';
import { WorkHistoryYamlBlock } from '../../WorkHistoryYamlBlock';
import { ExperienceTerminalPanel } from './ExperienceTerminalPanel';

/**
 * Terminal 3 — the hidden source terminal, "Show me the source." The same
 * shell Terminal 1/2 use (ExperienceTerminalPanel — same border, same
 * header treatment, same Roboto Mono chrome), so it reads as a third
 * session in the same system rather than a different kind of UI — but
 * mounted only once "view source" is opened for the first time (see
 * PipelineVisualization's `hasOpened` gate): a reference a reader opens
 * deliberately, not something that costs anything before that.
 *
 * WorkHistoryYamlBlock is reused completely unchanged, including its own
 * Geist Mono / Shiki syntax highlighting (`font-mono`, set directly on its
 * own root) — deliberate, not an oversight: the terminal *chrome* around
 * it is Roboto Mono, but the actual file content keeps exactly the
 * typeface and highlighting every other rendered source file in this
 * workspace already uses. `file.content` is the genuine VFS content for
 * americanchase.yaml — nothing here is a second copy of it.
 */
export function ExperienceTerminalThree({
  file,
  sequence,
}: {
  file: VirtualFile;
  sequence: FileRevealSequenceResult;
}) {
  return (
    <ExperienceTerminalPanel title="americanchase.yaml — source">
      <WorkHistoryYamlBlock
        code={file.content}
        lang={file.type === 'typescript' ? 'ts' : file.type}
        sequence={sequence}
      />
    </ExperienceTerminalPanel>
  );
}
