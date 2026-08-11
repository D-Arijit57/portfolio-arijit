import React from 'react';
import { motion } from 'motion/react';
import { FileText, FileJson, GitBranch, Globe, File as FileIcon, type LucideIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { LinkCardItem } from '../../documentation/linkCards';
import { resolveLinkTarget } from '../../documentation/resolveLinkTarget';

/**
 * Renders a detected link-card list (documentation/linkCards.ts) — the
 * "Continue Exploring" pattern — as a list of VS Code-style file rows
 * rather than CTA cards: icon + filename-style title + description,
 * hover = file-row select highlight (Explorer.tsx's own FileNode
 * treatment), not a card lift. Navigation is unchanged from the previous
 * LinkCardGrid: internal targets (resolveLinkTarget) open in-app via the
 * same VFS `openFile`, external targets are a plain new-tab anchor.
 *
 * `staggerSeconds` (Iteration 8): same optional-with-default pattern as
 * FeatureGrid.tsx's own — every non-Cortexa caller keeps the original fast
 * 0.04s stagger; Cortexa's explore.sh-gated Continue Exploring passes a
 * slower value so the rows read as "appear sequentially... not
 * simultaneously" rather than a near-instant pop.
 */
const EXTENSION_ICON: Record<string, { Icon: LucideIcon; color: string }> = {
  mmd: { Icon: FileText, color: '#ff3670' },
  yaml: { Icon: FileJson, color: '#cb3837' },
  git: { Icon: GitBranch, color: '#f97316' },
  live: { Icon: Globe, color: '#4CD964' },
};

function iconForTitle(title: string): { Icon: LucideIcon; color: string } {
  const ext = title.split('.').pop() ?? '';
  return EXTENSION_ICON[ext] ?? { Icon: FileIcon, color: '#cccccc' };
}

const ROW_CLASS =
  'group flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[#cccccc] transition-colors hover:bg-[#2a2d2e]';

export function LinkFileList({
  items,
  basePath,
  staggerSeconds = 0.04,
}: {
  items: LinkCardItem[];
  basePath: string;
  staggerSeconds?: number;
}) {
  const openFile = useStore((state) => state.openFile);

  return (
    <div className="my-4 flex flex-col overflow-hidden rounded-md border border-[#3c3c3c]">
      {items.map((item, index) => {
        const target = resolveLinkTarget(item.href, basePath);
        const { Icon, color } = iconForTitle(item.title);
        const motionProps = {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.25, delay: index * staggerSeconds, ease: 'easeOut' as const },
        };

        const content = (
          <>
            <Icon size={15} className="shrink-0" style={{ color }} />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium text-white">{item.title}</span>
              <span className="ml-2 text-[12px] text-[#9d9d9d]">{item.description}</span>
            </span>
          </>
        );

        if (target.kind === 'internal') {
          return (
            <motion.button key={item.title} type="button" onClick={() => openFile(target.fileId)} className={ROW_CLASS} {...motionProps}>
              {content}
            </motion.button>
          );
        }

        return (
          <motion.a key={item.title} href={target.href} target="_blank" rel="noreferrer" className={ROW_CLASS} {...motionProps}>
            {content}
          </motion.a>
        );
      })}
    </div>
  );
}
