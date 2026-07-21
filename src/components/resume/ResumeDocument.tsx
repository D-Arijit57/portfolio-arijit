import React from 'react';
import { resumeData, renderInlineMarkdown } from '../../content/resume';

/**
 * Sprint 10F.1: fully data-driven — every section maps over `resumeData`
 * (content/resume.ts), the single source of truth also behind RESUME.md's
 * markdown (generateResumeMarkdown) and the left-panel overview
 * (ResumeOverview.tsx). Adding a job/project/skill to that one file is
 * enough; nothing here hardcodes resume text anymore.
 *
 * This is the "compiled" resume — a pixel-oriented HTML/CSS replica of the
 * uploaded Arijit_Das_Resume.pdf, rendered off-screen and rasterized (see
 * resumeCapture.ts) into the texture the 3D preview and the "Download PDF"
 * toolbar action both consume.
 *
 * Fixed-width A4-at-96dpi (794px) regardless of viewport — resumeCapture.ts
 * rasterizes at a pixel scale for crispness, it never reflows this layout.
 * System serif stack only (no webfont fetch) so html2canvas never races a
 * font load.
 */

const SERIF = "Georgia, 'Times New Roman', Times, serif";

function Emphasized({ text }: { text: string }) {
  return (
    <>
      {renderInlineMarkdown(text).map((part, i) =>
        typeof part === 'string' ? <React.Fragment key={i}>{part}</React.Fragment> : <b key={i}>{part.bold}</b>
      )}
    </>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[13px] font-bold tracking-[0.08em] uppercase border-b border-black pb-[2px] mb-[6px] mt-[14px]"
      style={{ fontFamily: SERIF }}
    >
      {children}
    </h2>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <div>{left}</div>
      <div className="whitespace-nowrap text-right">{right}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-[2px] space-y-[2px]">
      {items.map((item, i) => (
        <li key={i} className="flex gap-[6px] text-[11px] leading-[1.38] pl-[2px]">
          <span className="shrink-0">–</span>
          <span><Emphasized text={item} /></span>
        </li>
      ))}
    </ul>
  );
}

export const RESUME_PAGE_WIDTH_PX = 794;
export const RESUME_PAGE_HEIGHT_PX = 1123;

export const ResumeDocument = React.forwardRef<HTMLDivElement>(function ResumeDocument(_props, ref) {
  const { basics, summary, skills, experience, projects, education, achievements } = resumeData;

  return (
    <div
      ref={ref}
      style={{ width: RESUME_PAGE_WIDTH_PX, minHeight: RESUME_PAGE_HEIGHT_PX, fontFamily: SERIF }}
      className="bg-white text-black px-[52px] py-[46px] text-[11.5px] leading-[1.4]"
    >
      <div className="text-center">
        <h1 className="text-[30px] font-bold tracking-[0.12em]">{basics.name.toUpperCase()}</h1>
        <p className="text-[11px] mt-[4px]">
          {basics.contact.phone} &nbsp;|&nbsp; {basics.contact.email} &nbsp;|&nbsp;{' '}
          <span className="underline">{basics.contact.linkedin.label}</span> &nbsp;|&nbsp;{' '}
          <span className="underline">{basics.contact.github.label}</span>
        </p>
      </div>

      <SectionHeading>Summary</SectionHeading>
      <p className="text-[11px] leading-[1.42]">
        <Emphasized text={summary} />
      </p>

      <SectionHeading>Education</SectionHeading>
      {education.map((edu, i) => (
        <React.Fragment key={i}>
          <Row left={<b>{edu.institution}</b>} right={edu.dateRange} />
          <Row left={<i>{edu.degree}</i>} right={edu.detail} />
        </React.Fragment>
      ))}

      <SectionHeading>Technical Skills</SectionHeading>
      <p className="text-[11px] leading-[1.5]">
        {skills.map((group, i) => (
          <React.Fragment key={group.category}>
            <b>{group.category}:</b> {group.items.join(', ')}
            {i < skills.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>

      <SectionHeading>Experience</SectionHeading>
      {experience.map((job, i) => (
        <React.Fragment key={i}>
          <Row left={<b>{job.company}</b>} right={`${job.startDate} – ${job.endDate}`} />
          <Row left={<i>{job.role}</i>} right={<i>{job.location}</i>} />
          <Bullets items={job.highlights} />
        </React.Fragment>
      ))}

      <SectionHeading>Projects</SectionHeading>
      {projects.map((project, i) => (
        <React.Fragment key={i}>
          <Row
            left={
              <>
                <b>{project.name}</b> <i>| {project.techStack.join(', ')} |</i>
                {project.link && <> <span className="underline">[{project.link.label}]</span></>}
              </>
            }
            right={project.dateRange}
          />
          <Bullets items={project.highlights} />
        </React.Fragment>
      ))}

      <SectionHeading>Achievements &amp; Certifications</SectionHeading>
      <Bullets items={achievements.map((a) => `**${a.title}:** ${a.description}`)} />
    </div>
  );
});
