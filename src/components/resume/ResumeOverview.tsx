import React from 'react';
import { Phone, Mail, Linkedin, Github, MapPin, Code2, FolderGit2, Briefcase, GraduationCap, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { getResumeOverview, renderInlineMarkdown } from '../../content/resume';
import { getDefaultResumeVariant } from './variants/resumeRegistry';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { cn } from '../../lib/utils';

/**
 * Sprint 12 Phase 2: premium redesign of the left panel. Same data source
 * (getResumeOverview(getDefaultResumeVariant().data)) and same section set
 * this workspace has always shown — Summary, Skills, Projects, Experience,
 * Education, Download — just with a considered type scale, lighter
 * "eyebrow + hairline" section labels (matching ProfileSidebar's existing
 * pattern instead of this file's old full-width borders), unified premium
 * cards, and small monospace "impact" stat badges pulled from real
 * highlight numbers already in the data (see content/resume.ts's
 * `impact?: string[]` field) so Projects/Experience read as measurable
 * results at a glance, not just prose.
 *
 * "Career Highlights" (Sprint 10F.1) is no longer its own heavy section —
 * folded into compact tag chips directly under the Summary, since it
 * duplicated ground Experience/Projects now cover in more depth here.
 *
 * Sprint 12 Phase 2.5 (polish pass): every color below is one of the app's
 * existing tokens (see ProfileStatusCard.tsx/GitHubContributionGraph.tsx) —
 * `#252526`/`#333333` (card), `#2d2d2d`/`#3c3c3c` (chip), `#858585` (all
 * muted/meta text), `#cccccc` (body), `#007acc` (the one accent), `#3fb950`
 * (the one success/positive-signal green). The initial redesign had drifted
 * into a shadow palette of near-duplicate one-off grays/blues/greens
 * (`#6e6e6e`, `#9a9a9a`, `#5b9bd5`, `#7ee08a`, ...); consolidating onto the
 * existing tokens is what this pass fixed, plus a matching focus-visible
 * ring (`GitHubContributionGraph`'s own convention) on every interactive
 * element, which had none before.
 *
 * Sprint 15 (brightening pass): cards/chips were blending into the panel
 * background rather than reading as elevated surfaces. Rather than invent
 * new grays, this reuses tones already established elsewhere in this app
 * for exactly this purpose: `#454545` is `CommandPalette.tsx`/
 * `Notifications.tsx`'s own border for floating/elevated UI; `#37373d`/
 * `#2a2d2e` are `Explorer.tsx`'s active/hover row backgrounds; `#9d9d9d` is
 * `EditorRenderer.tsx`'s blockquote text — a readable-but-secondary tier one
 * step brighter than `#858585`. `#858585` itself is kept for genuinely
 * decorative/quiet elements (the highlight tags, the bullet marker) so it
 * still reads as intentionally muted rather than just lower-contrast.
 */

const CHIP_CLASS =
  'rounded-full border border-[#3c3c3c] bg-[#2d2d2d] px-2.5 py-1 font-mono text-[11px] tracking-tight text-[#9cdcfe] whitespace-nowrap transition-colors hover:border-[#454545] hover:bg-[#37373d]';
// Sprint 15: border brightened one step at rest (#333333 -> #3c3c3c, the
// same value action buttons already default to) so cards read as distinct
// surfaces even before any interaction, with a further step to #454545 on
// hover (Notifications/CommandPalette's own "elevated" border) — plus a
// small always-on shadow, not just a hover-triggered one, so the "elevated
// from the background" feeling doesn't depend on the cursor being there.
const CARD_CLASS =
  'rounded-lg border border-[#3c3c3c] bg-[#252526] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-[border-color,box-shadow] duration-200 hover:border-[#454545] hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)]';
const FOCUS_RING = 'outline-none focus-visible:ring-1 focus-visible:ring-[#007acc]';
// The primary Download button's own fill is `#007acc` — a flush ring in the
// same color would be invisible against it, so it needs a ring-offset (a
// page-color gap) to read as a distinct halo instead of a plain focus ring.
const FOCUS_RING_ON_ACCENT = 'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1e1e] focus-visible:ring-[#007acc]';

function Emphasized({ text }: { text: string }) {
  return (
    <>
      {renderInlineMarkdown(text).map((part, i) =>
        typeof part === 'string' ? (
          <React.Fragment key={i}>{part}</React.Fragment>
        ) : (
          <strong key={i} className="font-semibold text-white">{part.bold}</strong>
        )
      )}
    </>
  );
}

function SectionEyebrow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span className="text-[#007acc]">{icon}</span>
      {/* Sprint 15: strengthened via type (#858585 -> #9d9d9d, a touch more
          letter-spacing) rather than a heavier divider — the hairline stays
          #333333 exactly as before, per this pass's own instruction not to
          lean on heavier dividers for hierarchy. */}
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9d9d9d] font-mono">{children}</h2>
      <span className="h-px flex-1 bg-[#333333]" />
    </div>
  );
}

function ImpactBadges({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {items.map((stat) => (
        <span
          key={stat}
          className="rounded border border-[#3fb950]/30 bg-[#3fb950]/10 px-2 py-0.5 font-mono text-[10.5px] tracking-tight text-[#3fb950] whitespace-nowrap"
        >
          {stat}
        </span>
      ))}
    </div>
  );
}

interface ResumeOverviewProps {
  onDownloadPdf: () => void;
}

const REDUCE_MOTION = prefersReducedMotion();

const sectionVariants = {
  hidden: { opacity: 0, y: REDUCE_MOTION ? 0 : 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: REDUCE_MOTION ? 0 : 0.32, delay: REDUCE_MOTION ? 0 : i * 0.045, ease: 'easeOut' as const },
  }),
};

function Section({ index, className, children }: { index: number; className?: string; children: React.ReactNode }) {
  return (
    <motion.div custom={index} variants={sectionVariants} initial="hidden" animate="visible" className={className}>
      {children}
    </motion.div>
  );
}

export function ResumeOverview({ onDownloadPdf }: ResumeOverviewProps) {
  const overview = getResumeOverview(getDefaultResumeVariant().data);

  return (
    <div className="h-full overflow-y-auto bg-[#1e1e1e] px-7 py-8 text-[#cccccc]">
      <div className="max-w-2xl">
        <Section index={0}>
          <h1 className="text-[28px] font-semibold tracking-tight text-white leading-tight">{overview.name}</h1>
          <p className="mt-1 text-[12.5px] font-mono uppercase tracking-wider text-[#9d9d9d]">{overview.title}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
            <a href={`tel:${overview.contact.phone}`} className={cn('flex items-center gap-1.5 text-[#cccccc] hover:text-white transition-colors', FOCUS_RING)}>
              <Phone size={13} className="text-[#858585]" /> {overview.contact.phone}
            </a>
            <a href={`mailto:${overview.contact.email}`} className={cn('flex items-center gap-1.5 text-[#cccccc] hover:text-white transition-colors', FOCUS_RING)}>
              <Mail size={13} className="text-[#858585]" /> {overview.contact.email}
            </a>
            <span className="flex items-center gap-1.5 text-[#cccccc]">
              <MapPin size={13} className="text-[#858585]" /> {overview.contact.location}
            </span>
            <a
              href={overview.contact.linkedin.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn('flex items-center gap-1.5 text-[#007acc] hover:text-white transition-colors', FOCUS_RING)}
            >
              <Linkedin size={13} /> LinkedIn
            </a>
            <a
              href={overview.contact.github.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn('flex items-center gap-1.5 text-[#007acc] hover:text-white transition-colors', FOCUS_RING)}
            >
              <Github size={13} /> GitHub
            </a>
          </div>
        </Section>

        <Section index={1}>
          <p className="mt-6 text-[13.5px] leading-relaxed text-[#cccccc]">
            <Emphasized text={overview.summary} />
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {overview.highlights.map((h) => (
              <span
                key={h}
                className="rounded border border-[#333333] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wide text-[#858585]"
              >
                {h}
              </span>
            ))}
          </div>
        </Section>

        <Section index={2} className="mt-9">
          <SectionEyebrow icon={<Code2 size={13} />}>Skills</SectionEyebrow>
          <div className="space-y-3">
            {overview.skills.map((group) => (
              <div key={group.category}>
                <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wide text-[#9d9d9d]">{group.category}</div>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span key={item} className={CHIP_CLASS}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section index={3} className="mt-9">
          <SectionEyebrow icon={<FolderGit2 size={13} />}>Projects</SectionEyebrow>
          <div className="space-y-4">
            {overview.featuredProjects.map((project) => (
              <div key={project.name} className={CARD_CLASS}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <h3 className="text-[14px] font-semibold text-white">{project.name}</h3>
                  <span className="text-[11px] font-mono text-[#9d9d9d] whitespace-nowrap">
                    {project.dateRange}
                    {project.link && <span> · {project.link.label}</span>}
                  </span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[#cccccc]">{project.oneLiner}</p>
                <ImpactBadges items={project.impact} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <span key={tech} className={CHIP_CLASS}>{tech}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section index={4} className="mt-9">
          <SectionEyebrow icon={<Briefcase size={13} />}>Experience</SectionEyebrow>
          <div className="space-y-4">
            {overview.experience.map((job) => (
              <div key={job.company} className={CARD_CLASS}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <h3 className="text-[14px] font-semibold text-white">{job.role}</h3>
                  <span className="text-[11px] font-mono text-[#9d9d9d] whitespace-nowrap">{job.startDate} – {job.endDate}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 text-[12px] text-[#cccccc]">
                  <span>{job.company}</span>
                  <span className="text-[#9d9d9d]">{job.location}</span>
                </div>
                <ImpactBadges items={job.impact} />
                <ul className="mt-3 space-y-1.5">
                  {job.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[#cccccc]">
                      <span className="mt-1.75 h-1 w-1 shrink-0 rounded-full bg-[#858585]" />
                      <span><Emphasized text={h} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section index={5} className="mt-9">
          <SectionEyebrow icon={<GraduationCap size={13} />}>Education</SectionEyebrow>
          <div className="space-y-4">
            {overview.education.map((edu) => (
              <div key={edu.institution} className={CARD_CLASS}>
                <div className="text-[14px] font-semibold text-white">{edu.institution}</div>
                <div className="mt-0.5 text-[12.5px] text-[#cccccc]">{edu.degree}</div>
                <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-[11.5px] text-[#9d9d9d]">
                  <span>{edu.dateRange}</span>
                  <span className="font-mono">{edu.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section index={6}>
          <div className="mt-9 flex flex-wrap gap-2 pb-2">
            <button
              type="button"
              onClick={onDownloadPdf}
              className={cn('flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium text-white bg-[#007acc] hover:bg-[#0086e0] active:scale-[0.97] rounded-md transition-[background-color,transform] duration-150', FOCUS_RING_ON_ACCENT)}
            >
              <Download size={13} />
              Download Resume
            </button>
            <a
              href={overview.contact.linkedin.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn('flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-[#cccccc] bg-[#2d2d2d] hover:bg-[#3c3c3c] active:bg-[#333333] active:scale-[0.97] border border-[#3c3c3c] rounded-md transition-[background-color,transform] duration-150', FOCUS_RING)}
            >
              <Linkedin size={13} /> Open LinkedIn
            </a>
            <a
              href={overview.contact.github.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn('flex items-center gap-1.5 px-3.5 py-2 text-[12px] text-[#cccccc] bg-[#2d2d2d] hover:bg-[#3c3c3c] active:bg-[#333333] active:scale-[0.97] border border-[#3c3c3c] rounded-md transition-[background-color,transform] duration-150', FOCUS_RING)}
            >
              <Github size={13} /> Open GitHub
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}
