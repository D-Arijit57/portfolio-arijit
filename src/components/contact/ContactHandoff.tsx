import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import type { VirtualFile } from '../../types';
import { CONTACT_CHANNELS, CONTACT_LOCATION, type ContactChannel } from '../../content/contact';
import { toVCard } from '../../contact/vcard';
import { ContactRow } from './ContactRow';
import { ResumeRow, type ResumeStatus } from './ResumeRow';
import { WorkspaceReview } from './WorkspaceReview';

const RESUME_PATH = '/resume/Arijit_Das_Resume.pdf';
const RESUME_FILENAME = 'Arijit_Das_Resume.pdf';
const VCARD_FILENAME = 'arijit-das.vcf';
const COPY_CONFIRM_MS = 1600;

function isCoarsePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * contact.sh's renderer — "the Handoff." Every real contact value is
 * visible at rest (no hover/click/selection required to reveal any of
 * them); every action has a real anchor underneath it, so keyboard
 * shortcuts (below) work by finding that same anchor and calling
 * `.click()` on it rather than duplicating each action's behavior a
 * second time. Deliberately the lightest-weight renderer in the app: no
 * canvas/SVG/animation library, and — unlike every other file-opening
 * reveal in this workspace — no useFileRevealSequence stagger, since
 * animating contact information in would put motion between the visitor
 * and the one thing this page exists to hand over immediately.
 */
export function ContactHandoff({ file: _file }: { file: VirtualFile }) {
  const isCoarse = useMemo(isCoarsePointer, []);
  const [announcement, setAnnouncement] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resumeStatus, setResumeStatus] = useState<ResumeStatus>('checking');
  const [resumeSize, setResumeSize] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const resumeRef = useRef<HTMLAnchorElement>(null);
  const reviewSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(RESUME_PATH, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setResumeStatus('unavailable');
          return;
        }
        setResumeStatus('available');
        const length = res.headers.get('content-length');
        if (length) setResumeSize(formatBytes(Number(length)));
      })
      .catch(() => {
        if (!cancelled) setResumeStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const handleCopyEmail = async (channel: ContactChannel) => {
    try {
      await navigator.clipboard.writeText(channel.value);
      setCopiedId(channel.id);
      setAnnouncement(`Copied ${channel.value}`);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedId(null), COPY_CONFIRM_MS);
    } catch {
      // Clipboard write genuinely failed (permission denied, insecure
      // context) — never claim "copied ✓" for something that didn't
      // happen. The row is still a real `mailto:` link, so nothing is
      // dead — the visitor can right-click / long-press to copy manually.
      setAnnouncement('Clipboard unavailable — right-click or long-press the email to copy it manually');
    }
  };

  const handleEmailClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isCoarse) return; // let the real mailto: href fire — correct primary action on a phone
    event.preventDefault();
    const channel = CONTACT_CHANNELS.find((c) => c.action === 'copy');
    if (channel) void handleCopyEmail(channel);
  };

  const handleSaveAll = () => {
    downloadBlob(toVCard(), VCARD_FILENAME, 'text/vcard;charset=utf-8');
    setAnnouncement(`Downloaded ${VCARD_FILENAME}`);
  };

  const handleResumeClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (resumeStatus !== 'available') {
      event.preventDefault();
    } else {
      setAnnouncement(`Downloading ${RESUME_FILENAME}`);
    }
  };

  // Keyboard shortcuts: E/L/G/R open/copy the exact same anchor a mouse
  // click would (via rowRefs/resumeRef — one behavior, one code path);
  // Enter saves the vCard. Guarded per contact.sh's spec: never while
  // typing (input/textarea/contentEditable), never with a modifier held,
  // never while focus is anywhere inside the Review section (its own
  // buttons/textarea use plain Enter/Space natively — this is what stops
  // the vCard shortcut from firing while composing a review), and every
  // action also has a full mouse/touch path independent of this listener.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (reviewSectionRef.current && target && reviewSectionRef.current.contains(target)) return;

      const key = event.key.toUpperCase();

      const channel = CONTACT_CHANNELS.find((c) => c.shortcut === key);
      if (channel) {
        event.preventDefault();
        rowRefs.current.get(channel.id)?.click();
        return;
      }
      if (key === 'R') {
        event.preventDefault();
        resumeRef.current?.click();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSaveAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="h-full w-full overflow-y-auto bg-[#1e1e1e]">
      <div className="mx-auto max-w-[640px] px-6 py-10 sm:px-10">
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>

        <p className="text-[13px] leading-relaxed text-[#cccccc]">
          You've been reading my files.
          <br />
          Take one with you.
        </p>

        <div className="mt-8 flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[#858585]">Export</h2>
          <span className="text-[11px] text-[#6e7681]">{CONTACT_CHANNELS.length + 1} items</span>
        </div>

        <ul className="mt-3 border-t border-[#3c3c3c]">
          {CONTACT_CHANNELS.map((channel) => (
            <ContactRow
              key={channel.id}
              channel={channel}
              copied={copiedId === channel.id}
              onEmailClick={channel.action === 'copy' ? handleEmailClick : undefined}
              ref={(el) => {
                if (el) rowRefs.current.set(channel.id, el);
                else rowRefs.current.delete(channel.id);
              }}
            />
          ))}
          <ResumeRow
            ref={resumeRef}
            status={resumeStatus}
            size={resumeSize}
            filename={RESUME_FILENAME}
            href={RESUME_PATH}
            onClick={handleResumeClick}
          />
        </ul>

        <button
          type="button"
          onClick={handleSaveAll}
          aria-keyshortcuts="Enter"
          aria-label="Save contact as vCard"
          className="mt-5 flex min-h-[44px] w-full items-center justify-between border-t border-[#3c3c3c] py-3 text-left text-[13px] text-[#cccccc] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#569cd6]"
        >
          <span className="flex items-center gap-2">
            <Download size={13} className="text-[#858585]" />
            Save all as {VCARD_FILENAME}
          </span>
          <kbd className="hidden text-[11px] text-[#6e7681] sm:inline">↵</kbd>
        </button>

        <p className="mt-4 text-[12px] text-[#6e7681]">{CONTACT_LOCATION}</p>

        <div className="mt-10 border-t-2 border-[#3c3c3c] pt-6" ref={reviewSectionRef}>
          <WorkspaceReview />
        </div>
      </div>
    </div>
  );
}
