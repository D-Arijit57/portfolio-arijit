import React, { useEffect, useRef } from 'react';
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [terminalState.history]);

  // WA-03: the input is disabled while a command executes (below), and a
  // native <input> does not automatically regain focus when re-enabled —
  // it drops to <body>. Re-focus explicitly once execution finishes so the
  // terminal stays keyboard-ready without requiring a re-click.
  useEffect(() => {
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
      <div className="flex px-4 pt-2 space-x-6 text-[11px] font-bold uppercase text-[#858585]">
        <span className="text-white border-b-2 border-white pb-1 cursor-pointer">Terminal</span>
        <span className="hover:text-white cursor-pointer pb-1 border-b-2 border-transparent">Output</span>
        <span className="hover:text-white cursor-pointer pb-1 border-b-2 border-transparent">Debug Console</span>
        <span className="hover:text-white cursor-pointer pb-1 border-b-2 border-transparent">Problems</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-[#cccccc]" onClick={() => inputRef.current?.focus()}>
        {terminalState.history.map((entry) => (
          <div key={entry.id} className="mb-2">
            {entry.command && (
              <div className="flex">
                <span className="text-[#3572A5] mr-2">{getPrompt(entry.cwd)}</span>
                <span>{entry.command}</span>
              </div>
            )}
            {entry.output.map((out, i) => (
              <OutputRenderer key={i} entry={out} />
            ))}
          </div>
        ))}
        <form onSubmit={onSubmit} className="flex">
          <span className="text-[#3572A5] mr-2">{getPrompt(terminalState.cwd)}</span>
          <input
            ref={inputRef}
            type="text"
            value={terminalState.input}
            onChange={(e) => setTerminalInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isExecuting}
            className="flex-1 bg-transparent outline-none border-none text-[#cccccc] disabled:opacity-50"
            autoFocus
          />
        </form>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
