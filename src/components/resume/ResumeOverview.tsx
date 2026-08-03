import { useRef } from 'react';
import { User, GraduationCap, Briefcase, Code2, FolderGit2, Award } from 'lucide-react';
import { getResumeOverview } from '../../content/resume';
import { getDefaultResumeVariant } from './variants/resumeRegistry';
import { Highlighted } from './document/Highlighted';
import { Section } from './document/Section';
import { Entry } from './document/Entry';
import { ResumeHeader } from './document/ResumeHeader';
import { ScrollHint } from './document/ScrollHint';

/**
 * Sprint 17 (RESUME.md spec §4): the resume document.
 *
 * This is a rewrite of the Sprint 12 "premium card" treatment, and the
 * change is a change of premise rather than of styling. That version
 * expressed hierarchy through containers — every entry sat in a rounded,
 * bordered, drop-shadowed card, with metrics extracted into colored pill
 * badges and thematic labels floated as outline chips. It read as a
 * portfolio website's resume page.
 *
 * The spec's premise is that a resume is a source file, so hierarchy comes
 * from typography, alignment, and hue instead:
 *   - emphasis is syntax highlighting (document/Highlighted.tsx), never
 *     bold — a term's color says what kind of thing it is
 *   - entries are justified two-row blocks (document/Entry.tsx), not cards
 *   - sections are foldable, like regions in an editor
 *
 * Consequently the cards, the impact badges, and the focus-area chips are
 * all gone. `impact` and `highlights` remain on ResumeData (nothing else
 * was asked to change about the data model, and other consumers may still
 * want them) but this document deliberately renders neither: the metrics
 * they surfaced are already in the bullets, where the `metric` token role
 * now colors them in place.
 *
 * Section order is fixed by the spec: SUMMARY -> EDUCATION -> EXPERIENCE
 * -> SKILLS -> PROJECTS -> ACHIEVEMENTS & CERTIFICATIONS. EDUCATION had no
 * placement at all before (it rendered last); it now sits directly after
 * the summary, where a recent graduate's resume wants it.
 */
export function ResumeOverview() {
  const overview = getResumeOverview(getDefaultResumeVariant().data);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto bg-[var(--resume-editor-bg)] px-7 py-8 text-[var(--resume-fg)]"
    >
      <div className="max-w-2xl">
        <ResumeHeader name={overview.name} contact={overview.contact} />

        <Section icon={User} title="SUMMARY">
          <p className="text-[14px] leading-[1.7]">
            <Highlighted text={overview.summary} />
          </p>
        </Section>

        <Section icon={GraduationCap} title="EDUCATION">
          {overview.education.map((edu) => (
            <Entry
              key={edu.institution}
              org={edu.institution}
              meta={edu.dateRange}
              role={edu.degree}
              subMeta={edu.detail}
            />
          ))}
        </Section>

        <Section icon={Briefcase} title="EXPERIENCE">
          {overview.experience.map((job) => (
            <Entry
              key={job.company}
              org={job.company}
              meta={`${job.startDate} – ${job.endDate}`}
              role={job.role}
              subMeta={job.location}
              bullets={job.highlights}
            />
          ))}
        </Section>

        {/* Skills stay plain on purpose. Every item here is a token-registry
            candidate, so highlighting them would light up the entire
            section — and per the spec, if everything lights up nothing
            does. The category label carries the structure instead. */}
        <Section icon={Code2} title="SKILLS">
          <dl className="space-y-2.5">
            {overview.skills.map((group) => (
              <div key={group.category} className="flex flex-wrap gap-x-2 text-[14px] leading-[1.65]">
                <dt className="font-semibold text-[var(--resume-fg-strong)]">{group.category}:</dt>
                <dd className="text-[var(--resume-fg)]">{group.items.join(', ')}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section icon={FolderGit2} title="PROJECTS">
          {overview.featuredProjects.map((project) => (
            <Entry
              key={project.name}
              org={project.name}
              meta={project.dateRange}
              role={project.techStack.join(', ')}
              subMeta={project.link?.label}
              bullets={project.highlights}
            />
          ))}
        </Section>

        <Section icon={Award} title="ACHIEVEMENTS & CERTIFICATIONS">
          <ul className="space-y-2">
            {overview.achievements.map((achievement) => (
              <li
                key={achievement.title}
                className="flex gap-2.5 text-[14px] leading-[1.65] text-[var(--resume-fg)]"
              >
                <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[var(--tok-lang)]" />
                <span>
                  <span className="font-semibold text-[var(--resume-fg-strong)]">{achievement.title}:</span>{' '}
                  <Highlighted text={achievement.description} />
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <div className="h-4" />
      </div>

      <ScrollHint scrollRef={scrollRef} />
    </div>
  );
}
