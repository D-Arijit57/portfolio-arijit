import React from 'react';
import { motion } from 'motion/react';
import { TechBadge } from './TechBadge';
import type { DocumentationFrontmatter } from '../../documentation/types';

/**
 * Title + one-sentence summary + technology badges, all sourced from the
 * document itself (H1 for title, frontmatter for summary/badges) — never
 * hardcoded per project. Badges use the Hero-specific TechBadge (larger,
 * logo-bearing).
 */
export function DocumentationHero({ title, frontmatter }: { title: string; frontmatter: DocumentationFrontmatter }) {
  const summary = typeof frontmatter.summary === 'string' ? frontmatter.summary : undefined;
  const badges = Array.isArray(frontmatter.badges) ? frontmatter.badges : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mb-8"
    >
      <h1 className="text-[32px] font-bold text-white">{title}</h1>
      {summary && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#9d9d9d]">{summary}</p>}
      {badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <TechBadge key={badge} label={badge} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
