import type { ResumeData } from './resumeTypes';
import { escapeLatex, renderInlineLatex } from './latexEscape';

/**
 * Sprint 11: the canonical Document Specification is now this LaTeX
 * template, not a CSS file — margins, typography, section rules, and
 * spacing all live in the constants and command definitions below, in
 * exactly one place, the same way specification/resumeSpec.ts (Sprint
 * 10F.4) was the one place for the old HTML pipeline. This function's only
 * job is turning a `ResumeData` into a complete .tex document string; it
 * has no opinion on which variant it's given.
 */

/** `\needspace` (below) reserves room for the heading plus a few lines of
 * whatever follows it, so a heading can never be orphaned alone at the
 * bottom of a page with its content pushed to the next — TeX breaks the
 * page before the heading instead, once too little room remains. */
function sectionHeading(title: string): string {
  return `\\needspace{5\\baselineskip}\n\\resSection{${escapeLatex(title)}}\n`;
}

/** A left/right line (company + dates, institution + dates, ...) — `\hfill` inside one paragraph line, exactly like the old HTML Row component's `justify-between`. */
function row(left: string, right: string): string {
  return `\\noindent ${left}\\hfill ${right}\\\\\n`;
}

function bulletList(items: string[]): string {
  const lines = items.map((item) => `  \\item ${renderInlineLatex(item)}`).join('\n');
  return `\\begin{itemize}[leftmargin=14pt, itemsep=0pt, topsep=1pt, parsep=0pt]\n${lines}\n\\end{itemize}\n`;
}

export function generateLatexSource(data: ResumeData): string {
  const { basics, summary, skills, experience, projects, education, achievements } = data;

  const parts: string[] = [];

  parts.push(String.raw`\documentclass[10pt]{article}
\usepackage[margin=0.5in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{enumitem}
\usepackage{needspace}
\usepackage{hyperref}
\hypersetup{colorlinks=true, urlcolor=black, linkcolor=black}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\renewcommand{\baselinestretch}{0.96}
\newcommand{\resSection}[1]{%
  \vspace{3pt}%
  {\large\bfseries #1}\\[-8pt]%
  \noindent\rule{\linewidth}{0.6pt}\\[0pt]%
}
\begin{document}
`);

  // Header: name, contact line with real hyperlinks (a genuine upgrade over
  // the old raster pipeline, where these were just underlined, non-clickable
  // text baked into a PNG).
  parts.push(`\\begin{center}\n`);
  parts.push(`{\\Huge \\bfseries ${escapeLatex(basics.name.toUpperCase())}}\\\\[4pt]\n`);
  const linkedin = `\\href{${basics.contact.linkedin.url}}{\\underline{${escapeLatex(basics.contact.linkedin.label)}}}`;
  const github = `\\href{${basics.contact.github.url}}{\\underline{${escapeLatex(basics.contact.github.label)}}}`;
  parts.push(
    `{\\small ${escapeLatex(basics.contact.phone)} ~|~ ${escapeLatex(basics.contact.email)} ~|~ ${linkedin} ~|~ ${github}}\n`
  );
  parts.push(`\\end{center}\n`);

  parts.push(sectionHeading('Summary'));
  parts.push(`${renderInlineLatex(summary)}\n`);

  parts.push(sectionHeading('Education'));
  for (const edu of education) {
    parts.push(row(`\\textbf{${escapeLatex(edu.institution)}}`, escapeLatex(edu.dateRange)));
    parts.push(row(`\\textit{${escapeLatex(edu.degree)}}`, escapeLatex(edu.detail)));
  }

  parts.push(sectionHeading('Technical Skills'));
  skills.forEach((group, i) => {
    const sep = i < skills.length - 1 ? '\\\\' : '';
    parts.push(`\\textbf{${escapeLatex(group.category)}:} ${escapeLatex(group.items.join(', '))}${sep}\n`);
  });

  parts.push(sectionHeading('Experience'));
  for (const job of experience) {
    parts.push(row(`\\textbf{${escapeLatex(job.company)}}`, `${escapeLatex(job.startDate)} -- ${escapeLatex(job.endDate)}`));
    parts.push(row(`\\textit{${escapeLatex(job.role)}}`, `\\textit{${escapeLatex(job.location)}}`));
    parts.push(bulletList(job.highlights));
  }

  parts.push(sectionHeading('Projects'));
  for (const project of projects) {
    const linkPart = project.link ? ` ~\\underline{[${escapeLatex(project.link.label)}]}` : '';
    const left = `\\textbf{${escapeLatex(project.name)}} \\textit{| ${escapeLatex(project.techStack.join(', '))} |}${linkPart}`;
    parts.push(row(left, escapeLatex(project.dateRange)));
    parts.push(bulletList(project.highlights));
  }

  parts.push(sectionHeading('Achievements & Certifications'));
  parts.push(bulletList(achievements.map((a) => `**${a.title}:** ${a.description}`)));

  parts.push(`\\end{document}\n`);

  return parts.join('\n');
}
