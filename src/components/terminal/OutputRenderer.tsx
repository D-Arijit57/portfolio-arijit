import React from 'react';
import { useStore } from '../../store/useStore';
import type { OutputEntry } from '../../terminal/types';

/**
 * OutputEntry.type → JSX, one exhaustive switch, same dispatch shape
 * EditorRenderer already uses for file.type (TERMINAL_DESIGN.md §6, §7).
 * Never knows which command produced an entry.
 */
export function OutputRenderer({ entry }: { entry: OutputEntry }) {
  const openFile = useStore((state) => state.openFile);

  switch (entry.type) {
    case 'text':
      return <div className="whitespace-pre-wrap text-[#cccccc]">{entry.text}</div>;

    case 'error':
      return <div className="whitespace-pre-wrap text-[#f48771]">{entry.text}</div>;

    case 'file-link':
      return (
        <div>
          <button
            type="button"
            onClick={() => openFile(entry.fileId)}
            className="text-[#3794ff] hover:underline cursor-pointer"
          >
            {entry.label}
          </button>
        </div>
      );

    case 'list':
      return (
        <div className="flex flex-wrap gap-x-4">
          {entry.items.map((item, i) => (
            <span key={i} className="text-[#cccccc]">{item}</span>
          ))}
        </div>
      );

    case 'table':
      return (
        <table className="text-left">
          <tbody>
            {entry.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="pr-6 align-top text-[#cccccc]">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );

    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}
