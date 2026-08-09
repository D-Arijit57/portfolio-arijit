import React, { forwardRef } from 'react';
import { Check } from 'lucide-react';
import type { ContactChannel } from '../../content/contact';

const ACTION_LABEL: Record<ContactChannel['action'], string> = {
  copy: 'copy',
  open: 'open',
  download: 'save',
};

function accessibleLabel(channel: ContactChannel): string {
  if (channel.action === 'copy') return `Copy ${channel.label.toLowerCase()} address ${channel.value}`;
  return `Open ${channel.label} profile`;
}

/**
 * One Export row. LinkedIn/GitHub are real anchors with real `href` +
 * `target="_blank"` + `rel="noopener noreferrer"` — no onClick needed,
 * default anchor behavior already is the correct action, and a screen
 * reader/no-JS visitor still has a working link. Email is the one row
 * with an onClick: on a fine pointer it intercepts the click to copy
 * instead of navigating (see ContactHandoff's handleEmailClick), while
 * still carrying a real `mailto:` href so a coarse pointer (phone) or a
 * middle-click/right-click on desktop always has correct fallback
 * behavior — never a `<button>` masquerading as a link.
 *
 * Forwards its ref to the anchor itself so ContactHandoff's keyboard
 * shortcuts can call the exact same `.click()` a mouse would — one
 * behavior, one code path, not a second hand-written activation branch
 * per shortcut.
 */
export const ContactRow = forwardRef<HTMLAnchorElement, {
  channel: ContactChannel;
  copied: boolean;
  onEmailClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}>(function ContactRow({ channel, copied, onEmailClick }, ref) {
  const isEmail = channel.action === 'copy';

  return (
    <li className="border-b border-[#3c3c3c]">
      <a
        ref={ref}
        href={channel.href}
        target={isEmail ? undefined : '_blank'}
        rel={isEmail ? undefined : 'noopener noreferrer'}
        onClick={onEmailClick}
        aria-label={accessibleLabel(channel)}
        aria-keyshortcuts={channel.shortcut}
        className="flex min-h-[44px] flex-col gap-0.5 py-2.5 text-[13px] text-[#cccccc] hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#569cd6] sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="w-20 shrink-0 text-[#858585]">{channel.label}</span>
        <span className="flex-1 truncate font-mono">{channel.value}</span>
        <span className="flex shrink-0 items-center gap-3 text-[#858585]">
          <span className="w-16 text-right">
            {copied ? (
              <span className="inline-flex items-center gap-1 text-[#3fb950]">
                <Check size={12} /> copied
              </span>
            ) : (
              ACTION_LABEL[channel.action]
            )}
          </span>
          <kbd className="hidden w-4 text-right text-[11px] text-[#6e7681] sm:inline">{channel.shortcut}</kbd>
        </span>
      </a>
    </li>
  );
});
