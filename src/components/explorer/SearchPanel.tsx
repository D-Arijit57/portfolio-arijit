import React from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import type { SearchResult } from '../../search/types';

/**
 * UI consumes SearchResult only (ARCHITECTURE.md §10) — never imports
 * src/search/* directly, only reads store.searchState and calls
 * setSearchQuery/setActiveResultIndex/openFile.
 */
export function SearchPanel() {
  const { searchState, setSearchQuery, setActiveResultIndex, openFile } = useStore();
  const { query, results, activeResultIndex, status } = searchState;

  const openResult = (index: number) => {
    const result = results[index];
    if (!result) return;
    setActiveResultIndex(index);
    openFile(result.file.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveResultIndex(activeResultIndex === null ? 0 : Math.min(activeResultIndex + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveResultIndex(activeResultIndex === null ? 0 : Math.max(activeResultIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      openResult(activeResultIndex ?? 0);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 bg-[#3c3c3c] rounded px-2 py-1.5">
          <SearchIcon size={14} className="text-[#858585] shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files"
            className="bg-transparent outline-none text-[13px] text-[#cccccc] placeholder-[#858585] w-full"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        {query.trim() === '' && (
          <div className="px-3 py-2 text-[12px] text-[#858585]">
            Search filenames, paths, and file content.
          </div>
        )}
        {query.trim() !== '' && status !== 'searching' && results.length === 0 && (
          <div className="px-3 py-2 text-[12px] text-[#858585]">
            No results found for "{query}"
          </div>
        )}
        {results.map((result, index) => (
          <SearchResultRow
            key={result.file.id}
            result={result}
            isActive={index === activeResultIndex}
            onClick={() => openResult(index)}
          />
        ))}
      </div>
    </div>
  );
}

function SearchResultRow({
  result,
  isActive,
  onClick,
}: {
  result: SearchResult;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 cursor-pointer rounded',
        isActive ? 'bg-[#37373d]' : 'hover:bg-[#2a2d2e]'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-[#cccccc] truncate">{result.file.name}</span>
        {result.namespace !== 'workspace' && (
          <span className="text-[10px] uppercase tracking-wide text-[#858585] shrink-0">
            {result.namespace}
          </span>
        )}
      </div>
      <div className="text-[11px] text-[#858585] truncate">{result.file.path}</div>
      {result.snippet && (
        <div className="text-[11px] text-[#6a9955] truncate mt-0.5">{result.snippet}</div>
      )}
    </div>
  );
}
