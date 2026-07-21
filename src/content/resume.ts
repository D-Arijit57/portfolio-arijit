/**
 * Sprint 10F.1: the single source of truth for every resume representation —
 * RESUME.md's raw markdown (generateResumeMarkdown below), the condensed
 * left-panel overview (ResumeOverview.tsx), the pixel-accurate 3D/PDF
 * preview (ResumeDocument.tsx), all read this one structured object. Update
 * a job, a project, a skill here and every representation picks it up —
 * nothing else in this codebase should hardcode resume content.
 *
 * Content verified verbatim against the user-supplied source resume
 * (Arijit_Das_Resume.pdf) — wording, dates, and numbers are not paraphrased.
 */

export interface ResumeLink {
  label: string;
  url?: string;
}

export interface ResumeContact {
  phone: string;
  email: string;
  linkedin: ResumeLink;
  github: ResumeLink;
  /** The one geographic fact the resume itself states (current role's location) — not a separate invented field. */
  location: string;
}

export interface ResumeSkillGroup {
  category: string;
  items: string[];
}

export interface ResumeExperience {
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  highlights: string[];
}

export interface ResumeProject {
  name: string;
  techStack: string[];
  link?: ResumeLink;
  dateRange: string;
  /** Full bullet list — used verbatim by the full preview/PDF. */
  highlights: string[];
  /** Single-line condensation of `highlights` for the overview only — derived, not new facts. */
  oneLiner: string;
}

export interface ResumeEducationEntry {
  institution: string;
  degree: string;
  dateRange: string;
  detail: string;
}

export interface ResumeAchievement {
  title: string;
  description: string;
}

export interface ResumeData {
  basics: {
    name: string;
    /** Sourced from the current/most recent role's title, not invented. */
    title: string;
    contact: ResumeContact;
  };
  summary: string;
  /** Career-highlight labels for the overview only — themes already present in `experience`/`projects`, not new claims. */
  highlights: string[];
  skills: ResumeSkillGroup[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducationEntry[];
  achievements: ResumeAchievement[];
}

export const resumeData: ResumeData = {
  basics: {
    name: 'Arijit Das',
    title: 'Software Engineer',
    contact: {
      phone: '+91-9475101535',
      email: 'dasarijit5704@gmail.com',
      linkedin: { label: 'linkedin.com/in/arijit-das-66b5b5248', url: 'https://linkedin.com/in/arijit-das-66b5b5248' },
      github: { label: 'github.com/D-Arijit57', url: 'https://github.com/D-Arijit57' },
      location: 'Indore, MP',
    },
  },

  // Inline **bold** spans mirror the source resume's own emphasis exactly —
  // parsed by renderInlineMarkdown() below wherever this needs to render as
  // styled text (ResumeOverview, ResumeDocument), used as-is in the raw
  // markdown (generateResumeMarkdown), so which terms are emphasized only
  // has to be decided once.
  summary:
    'Software Engineer with a strong foundation in **C++**, **OOP**, and full-stack development, building ' +
    '**AI-powered applications** and developer tools. Possesses high learning velocity through shipping side ' +
    'projects and hackathons. Familiar with **LLM primitives** (tokens, embeddings), **Transformer architecture**, ' +
    'and experimenting with open-source **LLMs** (Llama, Mistral). Capable of building basic **RAG pipelines**, ' +
    'applying structured **prompting techniques**, and writing testable code with a strong **evaluation mindset** ' +
    'to monitor expected behavior and safety.',

  highlights: [
    'AI workflow automation',
    'Production backend systems',
    'RAG applications',
    'Performance optimization',
    'Full-stack development',
  ],

  skills: [
    { category: 'Programming Languages', items: ['C++', 'Python', 'JavaScript', 'SQL'] },
    { category: 'AI & LLM Tools', items: ['RAG', 'Vector Stores', 'Prompt Engineering', 'Open-Source LLMs (Llama, Mistral)', 'Hugging Face'] },
    { category: 'Developer Tools & Tech', items: ['React.js', 'Next.js', 'Node.js', 'Express.js', 'REST APIs', 'Git', 'GitHub', 'AWS', 'JIRA', 'Postman'] },
  ],

  experience: [
    {
      company: 'American Chase',
      role: 'Software Engineer',
      location: 'Indore, MP',
      startDate: 'Mar 2025',
      endDate: 'Present',
      highlights: [
        'Developed an LLM-powered document workflow using **OpenAI API** and **LangChain**, automating key-field extraction and saving **2 hrs/week** for a US operations team.',
        'Resolved **5+ production defects** in a Node.js/Express backend, reducing recurring issues by **35%** through root-cause analysis and improved logging.',
        'Integrated a **RAG pipeline** into an internal business tool, enabling natural language search across **200+ documents** and reducing lookup time from **5 mins to under 2 mins**.',
        'Contributed to the delivery of **2 AI-assisted workflow features**, collaborating with US stakeholders from requirements gathering through production rollout.',
      ],
    },
  ],

  projects: [
    {
      name: 'Cortexa Remote Interview Platform',
      techStack: ['React.js', 'Next.js', 'Node.js', 'TypeScript'],
      link: { label: 'GitHub' },
      dateRange: 'May – Jul 2025',
      oneLiner: 'Full-stack video interviewing platform with real-time calls and a 4-language interactive code editor.',
      highlights: [
        'Built a full-stack video interviewing platform utilizing a strong software engineering foundation, featuring real-time video calls and an interactive code editor supporting **4 languages** including Python and C++.',
        'Developed robust backend workflows and **API integrations** for live coding capabilities, focusing on writing readable, testable code and ensuring secure session management without leaking sensitive data.',
        'Designed an scalable scheduling system with calendar integration, applying an evaluation mindset to write simple test cases validating user roles and data synchronization across the platform.',
      ],
    },
    {
      name: 'RakshaChakra - Secure Mobile Banking',
      techStack: ['Python', 'Machine Learning', 'AWS', 'Flutter'],
      link: { label: 'GitHub' },
      dateRange: 'Jun – Jul 2025',
      oneLiner: 'Python fraud-detection backend at 92% accuracy, with on-device ML keeping 95% of sensitive data local.',
      highlights: [
        'Developed a **Python-based** fraud detection backend, evaluating machine learning models against expected behavior and achieving **92% accuracy** in identifying suspicious transactions.',
        'Implemented a cloud-based behavioral analytics system on **AWS EC2**, demonstrating a solid grasp of data pipelines and real-time monitoring for enhanced application security.',
        'Built on-device ML processing to keep **95% of sensitive data** local, maintaining strict privacy standards parallel to **data safety** requirements.',
      ],
    },
  ],

  education: [
    {
      institution: 'Vellore Institute of Technology',
      degree: 'Bachelor of Technology (B.Tech), Computer Science and Engineering',
      dateRange: 'Oct 2022 – Jun 2026',
      detail: 'CGPA: 8.80/10.0',
    },
  ],

  achievements: [
    {
      title: 'TCS CodeVita 2025',
      description: 'Ranked in Top 5% (4,811 / 100,000), demonstrating algorithmic problem-solving speed and accuracy under competition conditions.',
    },
    {
      title: 'Canara Bank Suraksha Hackathon 2025',
      description: 'Top 105 teams from 4,000+ participants, showcasing teamwork and the ability to build secure, data-centric systems.',
    },
    {
      title: 'IBM Gen AI Certification',
      description: 'Completed training in generative AI technologies, demonstrating curiosity and practical exposure to LLM primitives, prompting techniques, and exploring the LLM training pipeline.',
    },
    {
      title: 'Smart India Hackathon 2024',
      description: 'Participated in national hackathon, demonstrating learning velocity by rapidly prototyping innovative technological solutions and experimenting with external APIs.',
    },
  ],
};

function bold(text: string): string {
  return `**${text}**`;
}

/**
 * Splits a `**bold**`-marked string into plain/bold segments — the one
 * place that interprets resumeData's inline emphasis as JSX, reused by
 * ResumeDocument.tsx (3D/PDF) and ResumeOverview.tsx (left panel) so
 * neither hardcodes its own `<b>` spans. Deliberately not a full markdown
 * parser: resumeData only ever uses `**bold**`, nothing else needs support.
 */
export function renderInlineMarkdown(text: string): (string | { bold: string })[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) => {
    const match = /^\*\*([^*]+)\*\*$/.exec(part);
    return match ? { bold: match[1] } : part;
  });
}

/**
 * Regenerates RESUME.md's exact markdown text from `resumeData` — the VFS
 * file's content is a generated artifact of this data, not hand-typed
 * separately (see workspaceSeed.ts). Output matches the previously
 * hand-written RESUME_MARKDOWN string byte-for-byte; the server's own copy
 * (server/repositories/seed/workspaceSeed.ts) stays a literal duplicate of
 * this function's output, per this repo's existing "no frontend imports in
 * the backend seed" convention — same reasoning as every other seed file.
 */
export function generateResumeMarkdown(data: ResumeData): string {
  const { basics, summary, skills, experience, projects, education, achievements } = data;
  const lines: string[] = [];

  lines.push(`# ${basics.name}`, '');
  lines.push(
    `${basics.contact.phone} | ${basics.contact.email} | [${basics.contact.linkedin.label}](${basics.contact.linkedin.url}) | [${basics.contact.github.label}](${basics.contact.github.url})`,
    ''
  );

  lines.push('## Summary', '', summary, '');

  lines.push('## Education', '');
  for (const edu of education) {
    lines.push(`${bold(edu.institution)} — ${edu.dateRange}`);
    lines.push(`*${edu.degree}* — ${edu.detail}`, '');
  }

  lines.push('## Technical Skills', '');
  lines.push(...skills.map((g) => `- ${bold(g.category + ':')} ${g.items.join(', ')}`), '');

  lines.push('## Experience', '');
  for (const job of experience) {
    lines.push(`${bold(job.company)} — ${job.startDate} – ${job.endDate}`);
    lines.push(`*${job.role}* — ${job.location}`, '');
    lines.push(...job.highlights.map((h) => `- ${h}`), '');
  }

  lines.push('## Projects', '');
  for (const project of projects) {
    const linkPart = project.link ? ` | [${project.link.label}]` : '';
    lines.push(`${bold(project.name)} | ${project.techStack.join(', ')}${linkPart} — ${project.dateRange}`, '');
    lines.push(...project.highlights.map((h) => `- ${h}`), '');
  }

  lines.push('## Achievements & Certifications', '');
  lines.push(...achievements.map((a) => `- ${bold(a.title + ':')} ${a.description}`));

  return lines.join('\n') + '\n';
}

export interface ResumeOverviewModel {
  name: string;
  title: string;
  contact: ResumeContact;
  summary: string;
  highlights: string[];
  skills: ResumeSkillGroup[];
  featuredProjects: { name: string; oneLiner: string; techStack: string[] }[];
  education: { institution: string; degree: string; dateRange: string }[];
}

const MAX_FEATURED_PROJECTS = 3;

/**
 * Condensed view for the left-panel overview (ResumeOverview.tsx) — the
 * "Parser/Transformer -> Overview Model" step. Never hand-authored
 * separately from `resumeData`: featured projects/education/skills are all
 * sliced or reshaped from the same arrays the full preview reads, so they
 * can't drift out of sync with a resume update.
 */
export function getResumeOverview(data: ResumeData): ResumeOverviewModel {
  return {
    name: data.basics.name,
    title: data.basics.title,
    contact: data.basics.contact,
    summary: data.summary,
    highlights: data.highlights,
    skills: data.skills,
    featuredProjects: data.projects.slice(0, MAX_FEATURED_PROJECTS).map((p) => ({
      name: p.name,
      oneLiner: p.oneLiner,
      techStack: p.techStack,
    })),
    education: data.education.map((e) => ({ institution: e.institution, degree: e.degree, dateRange: e.dateRange })),
  };
}
