import type { ResumeData } from '../../../content/resume';

/**
 * Sprint 10F.5: the FullStack+AI resume variant — the portfolio's default,
 * canonical public resume (see ../variants/resumeRegistry.ts). This is a
 * data file only: presentation lives entirely in
 * ../specification/resumeSpec.ts + ../renderer/ResumeRenderer.tsx, shared
 * by every resume variant. Adding another variant (AI Engineer, Backend,
 * Software Engineer, ...) means adding a sibling file here in the same
 * shape, then one entry in the registry — nothing in this file's shape
 * is FullStack+AI-specific.
 *
 * Content verified verbatim against the user-supplied source resume
 * (Arijit_Das_Resume.pdf) — wording, dates, and numbers are not paraphrased.
 */
export const fullstackAiResumeData: ResumeData = {
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
  // parsed by renderInlineMarkdown() (content/resume.ts) wherever this needs
  // to render as styled text (ResumeOverview, ResumeRenderer), used as-is in
  // the raw markdown (generateResumeMarkdown), so which terms are
  // emphasized only has to be decided once.
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
