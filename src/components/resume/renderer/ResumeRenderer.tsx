import React from 'react';
import { renderInlineMarkdown, type ResumeData } from '../../../content/resume';
import { resumeDocumentSpec, textStyle, dividerStyle } from '../specification/resumeSpec';

/**
 * Sprint 10F.4: the Resume Renderer — the single rendering pipeline both
 * the 3D preview's texture (via export/resumeCapture.ts) and the "Download
 * PDF" action are built from. Read structured data, apply the Document
 * Specification (specification/resumeSpec.ts), produce the complete resume
 * layout. It owns no content of its own and no design values of its own —
 * every number that used to live in a Tailwind arbitrary-value class here
 * now lives in exactly one place.
 *
 * Sprint 10F.5: `data` has no default and is required — this component
 * must never hardcode which resume it renders. Every caller resolves a
 * `ResumeData` from variants/resumeRegistry.ts (typically
 * `getDefaultResumeVariant().data`) and passes it in explicitly. A future
 * resume variant (AI Engineer, Backend, ...) is just a different
 * `ResumeData` object registered there — zero renderer changes required.
 *
 * Fixed-width A4-at-96dpi (page geometry from resumeSpec.ts) regardless of
 * viewport — resumeCapture.ts rasterizes at a pixel scale for crispness,
 * it never reflows this layout. System serif stack only (no webfont
 * fetch) so html2canvas never races a font load.
 */

const spec = resumeDocumentSpec;

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
      className="uppercase"
      style={{
        fontFamily: spec.fontFamily,
        marginTop: spec.spacing.sectionHeadingMarginTopPx,
        marginBottom: spec.spacing.sectionHeadingMarginBottomPx,
        paddingBottom: spec.spacing.sectionHeadingPaddingBottomPx,
        ...dividerStyle(spec),
        ...textStyle(spec.typography.sectionHeading),
      }}
    >
      {children}
    </h2>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline" style={{ gap: spec.spacing.rowGapPx }}>
      <div>{left}</div>
      <div className="whitespace-nowrap text-right">{right}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={{ marginTop: spec.spacing.bulletListMarginTopPx }}>
      {items.map((item, i) => (
        <li
          key={i}
          className="flex"
          style={{
            gap: spec.spacing.bulletMarkerGapPx,
            paddingLeft: spec.spacing.bulletIndentPx,
            marginTop: i === 0 ? 0 : spec.spacing.bulletItemSpacingPx,
            ...textStyle(spec.typography.bullet),
          }}
        >
          <span className="shrink-0">–</span>
          <span><Emphasized text={item} /></span>
        </li>
      ))}
    </ul>
  );
}

interface ResumeRendererProps {
  /** Required — resolve via variants/resumeRegistry.ts. Pass a different variant's ResumeData to render it through this exact same component. */
  data: ResumeData;
}

export const ResumeRenderer = React.forwardRef<HTMLDivElement, ResumeRendererProps>(function ResumeRenderer(
  { data },
  ref
) {
  const { basics, summary, skills, experience, projects, education, achievements } = data;

  return (
    <div
      ref={ref}
      style={{
        width: spec.page.widthPx,
        minHeight: spec.page.heightPx,
        fontFamily: spec.fontFamily,
        paddingLeft: spec.page.paddingXPx,
        paddingRight: spec.page.paddingXPx,
        paddingTop: spec.page.paddingYPx,
        paddingBottom: spec.page.paddingYPx,
        backgroundColor: spec.colors.background,
        color: spec.colors.text,
        ...textStyle(spec.typography.body),
      }}
    >
      <div className="text-center">
        <h1 style={textStyle(spec.typography.name)}>{basics.name.toUpperCase()}</h1>
        <p style={{ marginTop: spec.spacing.contactLineMarginTopPx, ...textStyle(spec.typography.contactLine) }}>
          {basics.contact.phone} &nbsp;|&nbsp; {basics.contact.email} &nbsp;|&nbsp;{' '}
          <span className="underline">{basics.contact.linkedin.label}</span> &nbsp;|&nbsp;{' '}
          <span className="underline">{basics.contact.github.label}</span>
        </p>
      </div>

      <SectionHeading>Summary</SectionHeading>
      <p style={textStyle(spec.typography.summary)}>
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
      <p style={textStyle(spec.typography.skillsList)}>
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
