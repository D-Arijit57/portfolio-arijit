import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { getPrompt } from '../../terminal/prompt';
import { OutputRenderer } from './OutputRenderer';
import { ResizeHandle } from '../shared/ResizeHandle';

/**
 * UI shell only (TERMINAL_DESIGN.md §1, §6). Collects input, displays
 * output, forwards execution requests to the store — never parses,
 * looks up, or executes a command itself.
 */
export function Terminal() {
  const { terminalState, setTerminalInput, submitTerminalCommand, navigateHistory, setTerminalHeight } = useStore();
  // Phase 9C: this panel shows the idle block caret only once startup.log's
  // signature sequence has handed the shell over (see TerminalRunner), so the
  // two prompts are never both advertising "type here" at the same time.
  const ownsShell = useStore((state) => state.shellOwner === 'terminal');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [terminalState.history]);

  // WA-03: the input is disabled while a command executes (below), and a
  // native <input> does not automatically regain focus when re-enabled —
  // it drops to <body>. Re-focus explicitly once execution finishes so the
  // terminal stays keyboard-ready without requiring a re-click. Phase 5:
  // skips its own first run — this effect firing on initial mount is what
  // the removed `autoFocus` prop used to do, dropping a fresh page load's
  // focus straight into the terminal before a screen-reader/keyboard user
  // has seen anything else. Every *later* transition away from
  // 'executing' still re-focuses, exactly as before.
  const isFirstStatusEffect = useRef(true);
  useEffect(() => {
    if (isFirstStatusEffect.current) {
      isFirstStatusEffect.current = false;
      return;
    }
    if (terminalState.status !== 'executing') {
      inputRef.current?.focus();
    }
  }, [terminalState.status]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTerminalCommand();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory('down');
    }
  };

  if (!terminalState.isOpen) return null;

  const isExecuting = terminalState.status === 'executing';

  // The idle "this shell is live and waiting for you" caret. Suppressed once
  // the input is genuinely focused or has content, because the browser's own
  // caret is then doing this job — two carets on one line would overlap at
  // exactly the same position.
  const showIdleCaret = ownsShell && !isFocused && terminalState.input === '' && !isExecuting;

  return (
    <div
      style={{ height: terminalState.height }}
      className="relative border-t border-[#3c3c3c] bg-[#1e1e1e] flex flex-col font-mono text-[13px] shrink-0"
    >
      <ResizeHandle
        direction="vertical"
        onResize={setTerminalHeight}
        className="absolute left-0 right-0 top-0 -mt-0.5"
      />
      {/* Phase 9C: `Output`/`Debug Console`/`Problems` were inert <span>s with
          no handler and no panel behind them. Beyond being dead chrome, three
          output-view names framed this panel as a set of read-only logs —
          the header itself was arguing the terminal was passive. Only the one
          real view is named now; no new tabs, no simulated VS Code panels. */}
      <div className="flex px-4 pt-2 space-x-6 text-[11px] font-bold uppercase text-[#858585]">
        <span className="text-white border-b-2 border-white pb-1">Terminal</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-[#cccccc]" onClick={() => inputRef.current?.focus()}>
        {terminalState.history.map((entry) => (
          <div key={entry.id} className="mb-2">
            {entry.command && (
              <div className="flex">
                <span className="text-[#569cd6] mr-2">{getPrompt(entry.cwd)}</span>
                <span>{entry.command}</span>
              </div>
            )}
            {entry.output.map((out, i) => (
              <OutputRenderer key={i} entry={out} />
            ))}
          </div>
        ))}
        <form onSubmit={onSubmit} className="flex">
          <span className="text-[#569cd6] mr-2 shrink-0">{getPrompt(terminalState.cwd)}</span>
          {/* The caret is an overlay on the (empty) input rather than a
              sibling of it: a sibling would either be pushed to the far right
              by `flex-1`, or shift the text one character when it appeared and
              disappeared. Absolute positioning means showing/hiding it costs
              no layout at all. */}
          <span className="relative flex-1 min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={terminalState.input}
              onChange={(e) => setTerminalInput(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isExecuting}
              aria-label="Terminal command input"
              className="w-full bg-transparent outline-none border-none text-[#cccccc] disabled:opacity-50"
            />
            {showIdleCaret && (
              // aria-hidden: purely a visual affordance. The <input> above is
              // and stays the real focus target and the only thing announced —
              // no autofocus, no second tab stop, no live region.
              <span
                aria-hidden="true"
                className="terminal-live-cursor pointer-events-none absolute left-0 top-0 text-[#cccccc]"
              >
                █
              </span>
            )}
          </span>
        </form>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
