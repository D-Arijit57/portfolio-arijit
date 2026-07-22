import React from 'react';
import { Phone, Mail, Linkedin, Github, MapPin, User, GraduationCap, Code2, Award, FolderGit2, CheckCircle2, Download } from 'lucide-react';
import { getResumeOverview, renderInlineMarkdown } from '../../content/resume';
import { getDefaultResumeVariant } from './variants/resumeRegistry';
import { cn } from '../../lib/utils';

/**
 * Sprint 10F.1: the redesigned left panel — an executive overview, not
 * RESUME.md rendered as prose (that was the Sprint 10F version this
 * replaces). Goal per the brief: a recruiter understands the profile in
 * about 30 seconds. Every section reads from
 * getResumeOverview(getDefaultResumeVariant().data) — nothing here
 * hardcodes resume text or a specific variant (Sprint 10F.5).
 */

const CHIP_CLASS = 'rounded-full border border-[#3c3c3c] bg-[#2d2d2d] px-2.5 py-0.5 font-mono text-[11px] text-[#9cdcfe] whitespace-nowrap';

function Emphasized({ text }: { text: string }) {
  return (
    <>
      {renderInlineMarkdown(text).map((part, i) =>
        typeof part === 'string' ? (
          <React.Fragment key={i}>{part}</React.Fragment>
        ) : (
          <strong key={i} className="text-white">{part.bold}</strong>
        )
      )}
    </>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-5 first:mt-0 pb-1.5 border-b border-[#333333]">
      <span className="text-[#007acc]">{icon}</span>
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-white">{children}</h2>
    </div>
  );
}

interface ResumeOverviewProps {
  onDownloadPdf: () => void;
  isDownloading: boolean;
}

export function ResumeOverview({ onDownloadPdf, isDownloading }: ResumeOverviewProps) {
  const overview = getResumeOverview(getDefaultResumeVariant().data);

  return (
    <div className="h-full overflow-y-auto bg-[#1e1e1e] px-6 py-6 text-[#cccccc]">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-white">{overview.name}</h1>
        <p className="text-[13px] text-[#858585] mt-0.5">{overview.title}</p>

        <SectionHeading icon={<User size={13} />}>Contact</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
          <a href={`tel:${overview.contact.phone}`} className="flex items-center gap-2 hover:text-white">
            <Phone size={13} className="text-[#858585] shrink-0" /> {overview.contact.phone}
          </a>
          <a href={`mailto:${overview.contact.email}`} className="flex items-center gap-2 hover:text-white truncate">
            <Mail size={13} className="text-[#858585] shrink-0" /> <span className="truncate">{overview.contact.email}</span>
          </a>
          <a href={overview.contact.linkedin.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#007acc] hover:underline">
            <Linkedin size={13} className="text-[#858585] shrink-0" /> LinkedIn
          </a>
          <a href={overview.contact.github.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#007acc] hover:underline">
            <Github size={13} className="text-[#858585] shrink-0" /> GitHub
          </a>
          <div className="flex items-center gap-2 col-span-full">
            <MapPin size={13} className="text-[#858585] shrink-0" /> {overview.contact.location}
          </div>
        </div>

        <SectionHeading icon={<User size={13} />}>Professional Summary</SectionHeading>
        <p className="text-[12.5px] leading-relaxed">
          <Emphasized text={overview.summary} />
        </p>

        <SectionHeading icon={<Code2 size={13} />}>Core Skills</SectionHeading>
        <div className="space-y-2">
          {overview.skills.map((group) => (
            <div key={group.category}>
              <div className="text-[10.5px] uppercase tracking-wide text-[#858585] mb-1">{group.category}</div>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span key={item} className={CHIP_CLASS}>{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <SectionHeading icon={<Award size={13} />}>Career Highlights</SectionHeading>
        <ul className="space-y-1.5">
          {overview.highlights.map((h) => (
            <li key={h} className="flex items-center gap-2 text-[12.5px]">
              <CheckCircle2 size={14} className="text-[#3fb950] shrink-0" />
              {h}
            </li>
          ))}
        </ul>

        <SectionHeading icon={<FolderGit2 size={13} />}>Featured Projects</SectionHeading>
        <div className="space-y-3">
          {overview.featuredProjects.map((project) => (
            <div key={project.name} className="rounded-md border border-[#333333] bg-[#232323] p-3">
              <div className="text-[13px] font-semibold text-white">{project.name}</div>
              <p className="text-[12px] text-[#a3a3a3] mt-0.5 leading-snug">{project.oneLiner}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {project.techStack.map((tech) => (
                  <span key={tech} className={CHIP_CLASS}>{tech}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <SectionHeading icon={<GraduationCap size={13} />}>Education</SectionHeading>
        {overview.education.map((edu) => (
          <div key={edu.institution} className="text-[12.5px]">
            <div className="font-semibold text-white">{edu.institution}</div>
            <div className="text-[#a3a3a3]">{edu.degree}</div>
            <div className="text-[#858585] text-[11px] mt-0.5">{edu.dateRange}</div>
          </div>
        ))}

        <div className="mt-6 flex flex-wrap gap-2 pb-2">
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#007acc] hover:bg-[#0086e0] disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition-colors"
          >
            <Download size={13} />
            {isDownloading ? 'Preparing...' : 'Download PDF'}
          </button>
          <a
            href={overview.contact.linkedin.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#cccccc] bg-[#2d2d2d] hover:bg-[#3c3c3c] border border-[#3c3c3c] rounded-sm transition-colors')}
          >
            <Linkedin size={13} /> Open LinkedIn
          </a>
          <a
            href={overview.contact.github.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#cccccc] bg-[#2d2d2d] hover:bg-[#3c3c3c] border border-[#3c3c3c] rounded-sm transition-colors')}
          >
            <Github size={13} /> Open GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
