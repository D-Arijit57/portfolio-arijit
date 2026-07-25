import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { LinkCardItem } from '../../documentation/linkCards';
import { resolveLinkTarget } from '../../documentation/resolveLinkTarget';

const CARD_CLASS =
  'group flex flex-col rounded-md border border-[#3c3c3c] bg-[#252526] p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)]';

/**
 * Renders a detected link-card list (documentation/linkCards.ts) — the
 * "Continue Exploring" pattern: cards that either open another workspace
 * file in-app (resolved relative to the current doc's own folder, see
 * resolveLinkTarget) or open an external URL in a new tab. Same
 * ManifestCard-matching visual/animation treatment as FeatureGrid, so the
 * two card grids read as one family.
 */
export function LinkCardGrid({ items, basePath }: { items: LinkCardItem[]; basePath: string }) {
  const openFile = useStore((state) => state.openFile);

  return (
    <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item, index) => {
        const target = resolveLinkTarget(item.href, basePath);
        const Icon = target.kind === 'internal' ? ArrowRight : ArrowUpRight;
        const motionProps = {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.25, delay: index * 0.04, ease: 'easeOut' as const },
          whileHover: { y: -2 },
        };

        const content = (
          <>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-white">{item.title}</h3>
              <Icon size={15} className="shrink-0 text-[#858585] transition-colors group-hover:text-[#cccccc]" />
            </div>
            <p className="text-[12px] leading-relaxed text-[#9d9d9d]">{item.description}</p>
          </>
        );

        if (target.kind === 'internal') {
          return (
            <motion.button
              key={item.title}
              type="button"
              onClick={() => openFile(target.fileId)}
              className={CARD_CLASS}
              {...motionProps}
            >
              {content}
            </motion.button>
          );
        }

        return (
          <motion.a
            key={item.title}
            href={target.href}
            target="_blank"
            rel="noreferrer"
            className={CARD_CLASS}
            {...motionProps}
          >
            {content}
          </motion.a>
        );
      })}
    </div>
  );
}
