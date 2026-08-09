import React, { forwardRef } from 'react';

export type ResumeStatus = 'checking' | 'available' | 'unavailable';

/**
 * The Résumé row — the one export that isn't a ContactChannel (it's a
 * document, not a contact detail, so it's never part of CONTACT_CHANNELS
 * or the vCard). `status` starts 'checking' and the row stays enabled
 * during that brief window (see ContactHandoff's HEAD-request probe) —
 * genuinely disabling only once the asset is confirmed missing, never
 * showing a fabricated size. `checking` and `unavailable` both suppress
 * the keyboard shortcut hint and the `download` attribute so a stale
 * disabled row can never look clickable.
 */
export const ResumeRow = forwardRef<HTMLAnchorElement, {
  status: ResumeStatus;
  size: string | null;
  filename: string;
  href: string;
  onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}>(function ResumeRow({ status, size, filename, href, onClick }, ref) {
  const disabled = status === 'unavailable';

  return (
    <li className="border-b border-[#3c3c3c]">
      <a
        ref={ref}
        href={disabled ? undefined : href}
        download={disabled ? undefined : filename}
        onClick={onClick}
        aria-disabled={disabled}
        aria-label={disabled ? 'Résumé unavailable' : 'Download résumé'}
        aria-keyshortcuts={disabled ? undefined : 'R'}
        className={`flex min-h-[44px] flex-col gap-0.5 py-2.5 text-[13px] sm:flex-row sm:items-center sm:gap-4 ${
          disabled
            ? 'cursor-not-allowed text-[#6e7681]'
            : 'text-[#cccccc] hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#569cd6]'
        }`}
      >
        <span className="w-20 shrink-0 text-[#858585]">Résumé</span>
        <span className="flex-1 truncate font-mono">
          {filename}
          {size ? <span className="text-[#6e7681]"> · {size}</span> : null}
          {disabled ? <span className="text-[#f14c4c]"> · unavailable</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-[#858585]">
          <span className="w-16 text-right">{disabled ? '' : 'save'}</span>
          <kbd className="hidden w-4 text-right text-[11px] text-[#6e7681] sm:inline">{disabled ? '' : 'R'}</kbd>
        </span>
      </a>
    </li>
  );
});
