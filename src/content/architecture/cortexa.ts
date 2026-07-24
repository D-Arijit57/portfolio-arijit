import { registerArchitecture } from '../../architecture/registry';
import type { ArchitectureModel } from '../../architecture/types';

/**
 * Cortexa's canonical ArchitectureModel — the first consumer of the
 * Architecture Platform (ARCHITECTURE_PLATFORM_DESIGN.md §13, Phase 1).
 * This is the source of truth for Cortexa's architecture; architecture.mmd
 * is generated from this model (modelToMermaid(), see workspaceSeed.ts),
 * not the other way around.
 *
 * This is the **System Architecture** view — the default landing
 * architecture, answering "what are the major building blocks of Cortexa,
 * and how do they interact at a high level?" It deliberately stops at
 * service/domain *boundaries*, not internal workflow: Interview Lifecycle,
 * Judge Pipeline, Recording Management, etc. appear here as single
 * architectural-domain nodes, not decomposed into their internal states
 * (schedule → join → live → submit → record → complete, or
 * submission → sandbox → verdict). That decomposition is reserved for
 * future, separate ArchitectureModels (Authentication & RBAC, Interview
 * Lifecycle, Real-time Synchronization, Judge Pipeline, Data Model) that
 * will plug into this same platform without touching this model or any
 * platform code.
 *
 * Registers itself on import — whatever imports this module (workspaceSeed.ts)
 * must run before the app's first render, the same "module load = registration"
 * ordering the terminal command registry and search index already rely on.
 */
export const cortexaArchitecture: ArchitectureModel = {
  projectKey: 'cortexa',
  nodes: [
    // Layer 1 — Client
    {
      id: 'client',
      title: 'Client',
      category: 'client',
      technology: 'Next.js (React), TailwindCSS',
      description: 'The end-user browser experience — hosts every user-facing module and renders the interview platform UI.',
      responsibilities: ['UI rendering', 'Client-side routing', 'Hosting user-facing modules'],
      dependencies: ['dashboard', 'interview_workspace', 'scheduling_ui', 'meeting_room', 'monaco_editor'],
      runtime: 'Browser (client-side JavaScript)',
      deployment: 'Delivered as part of the Next.js client bundle',
      status: 'active',
    },

    // Layer 2 — User-Facing Modules (logical modules, not React components)
    {
      id: 'dashboard',
      title: 'Dashboard',
      category: 'frontend',
      technology: 'Next.js (React)',
      description: "The landing module summarizing a user's interviews and activity.",
      responsibilities: ['Overview of upcoming/past interviews', 'Entry point into other modules'],
      dependencies: ['next_js_app'],
      runtime: 'Browser (client-side)',
      deployment: 'Bundled as part of the Next.js client application',
      status: 'active',
    },
    {
      id: 'interview_workspace',
      title: 'Interview Workspace',
      category: 'frontend',
      technology: 'Next.js (React)',
      description: 'The module hosting the live interview experience — composes the Meeting Room and Monaco Editor during a session.',
      responsibilities: ['Interview session UI', 'Coordinates video and coding sub-modules during a live interview'],
      dependencies: ['next_js_app'],
      runtime: 'Browser (client-side)',
      deployment: 'Bundled as part of the Next.js client application',
      status: 'active',
    },
    {
      id: 'scheduling_ui',
      title: 'Scheduling',
      category: 'frontend',
      technology: 'Next.js (React)',
      description: 'The module for booking and managing interview time slots.',
      responsibilities: ['Calendar UI', 'Time slot selection', 'Booking UI'],
      dependencies: ['next_js_app'],
      runtime: 'Browser (client-side)',
      deployment: 'Bundled as part of the Next.js client application',
      status: 'active',
    },
    {
      id: 'meeting_room',
      title: 'Meeting Room',
      category: 'frontend',
      technology: 'Next.js (React), Stream Video SDK',
      description: 'The video call module used during live interviews.',
      responsibilities: ['Video/audio call UI', 'Screen sharing UI'],
      dependencies: ['next_js_app'],
      runtime: 'Browser (client-side)',
      deployment: 'Bundled as part of the Next.js client application',
      status: 'active',
    },
    {
      id: 'monaco_editor',
      title: 'Monaco Editor',
      category: 'frontend',
      technology: 'Monaco Editor',
      description: 'Embedded, in-browser code editor providing the live, multi-language coding workspace during interviews.',
      responsibilities: ['Live coding', 'Multi-language editing', 'Interview coding workspace'],
      dependencies: ['next_js_app'],
      runtime: 'Browser (client-side)',
      deployment: 'Bundled as part of the Next.js client application',
      status: 'active',
    },

    // Layer 3 — Application Layer
    {
      id: 'next_js_app',
      title: 'Next.js Application',
      category: 'backend',
      technology: 'Next.js (App Router)',
      description: "The orchestration layer — serves server components, routes requests, and coordinates every user-facing module's calls to Clerk, Convex, and Stream.",
      responsibilities: ['App Router / Server Components', 'Route Handlers', 'Middleware', 'API orchestration'],
      dependencies: ['clerk', 'convex', 'stream_video'],
      runtime: 'Node.js (Next.js server runtime)',
      deployment: 'Single deployable Next.js application',
      status: 'active',
    },

    // Layer 4 — Managed Platform Services
    {
      id: 'clerk',
      title: 'Clerk',
      category: 'external',
      technology: 'Clerk (managed platform service)',
      description: 'Managed authentication and identity provider — issues sessions and enforces role-based access for the platform.',
      responsibilities: ['Identity', 'Authentication', 'Session management', 'Role-based access control (RBAC)'],
      runtime: 'Managed/hosted by Clerk (SaaS)',
      deployment: 'External managed service — no self-hosted deployment',
      status: 'active',
    },
    {
      id: 'convex',
      title: 'Convex',
      category: 'database',
      technology: 'Convex (real-time backend platform)',
      description: "Real-time database and backend platform — hosts the queries, mutations, and actions backing the platform's business domains.",
      responsibilities: ['Real-time database', 'Queries, mutations, and actions', 'Realtime subscriptions', 'Business state'],
      dependencies: ['interview_scheduling', 'interview_lifecycle', 'coding_challenge', 'recording_management'],
      runtime: 'Managed/hosted by Convex (SaaS)',
      deployment: 'External managed backend platform — no self-hosted deployment',
      status: 'active',
    },
    {
      id: 'stream_video',
      title: 'Stream Video',
      category: 'external',
      technology: 'Stream (managed video platform)',
      description: 'Managed real-time communication platform powering interview video calls, screen sharing, and recording.',
      responsibilities: ['RTC', 'Audio', 'Video', 'Recording'],
      dependencies: ['recording_management'],
      runtime: 'Managed/hosted by Stream (SaaS)',
      deployment: 'External managed service — no self-hosted deployment',
      status: 'active',
    },

    // Layer 5 — Business Domains (architectural boundaries, not internal workflow)
    {
      id: 'interview_scheduling',
      title: 'Interview Scheduling',
      category: 'backend',
      technology: 'Convex functions',
      description: 'Business domain governing interview time slots and booking state.',
      responsibilities: ['Calendar/slot state', 'Booking workflow state'],
      dependencies: ['convex'],
      runtime: 'Convex functions (queries/mutations/actions)',
      deployment: 'Deployed as part of the Convex backend',
      status: 'active',
    },
    {
      id: 'interview_lifecycle',
      title: 'Interview Lifecycle',
      category: 'backend',
      technology: 'Convex functions',
      description: "Business domain governing an interview's state from scheduled through completed, and its participants.",
      responsibilities: ['Interview state/status', 'Participant tracking'],
      dependencies: ['convex', 'interview_scheduling'],
      runtime: 'Convex functions (queries/mutations/actions)',
      deployment: 'Deployed as part of the Convex backend',
      status: 'active',
    },
    {
      id: 'coding_challenge',
      title: 'Coding Challenge',
      category: 'backend',
      technology: 'Convex functions',
      description: 'Business domain governing challenge definitions, starter code, and submission workflow.',
      responsibilities: ['Challenge definitions', 'Starter code', 'Submission workflow state'],
      dependencies: ['convex'],
      runtime: 'Convex functions (queries/mutations/actions)',
      deployment: 'Deployed as part of the Convex backend',
      status: 'active',
    },
    {
      id: 'judge_pipeline',
      title: 'Judge Pipeline',
      category: 'backend',
      technology: 'Not fully specified in current source material',
      description: 'Business domain governing evaluation of a submitted coding challenge — execution, test cases, and result verdicts.',
      responsibilities: ['Code execution', 'Test cases', 'Result evaluation'],
      dependencies: ['coding_challenge'],
      tradeoffs: "Sandboxed code-execution model isn't specified in the current source material — represented here as a domain boundary rather than an implementation, to avoid inventing an execution/sandboxing mechanism that hasn't been confirmed.",
      status: 'active',
    },
    {
      id: 'recording_management',
      title: 'Recording Management',
      category: 'backend',
      technology: 'Convex functions, Stream Video',
      description: 'Business domain governing recording metadata, playback, and association with a given interview.',
      responsibilities: ['Recording metadata', 'Playback', 'Interview association'],
      dependencies: ['convex', 'stream_video'],
      runtime: 'Convex functions (queries/mutations/actions)',
      deployment: 'Deployed as part of the Convex backend; underlying media stored/served by Stream',
      status: 'active',
    },
  ],
  edges: [
    { from: 'client', to: 'dashboard' },
    { from: 'client', to: 'interview_workspace' },
    { from: 'client', to: 'scheduling_ui' },
    { from: 'client', to: 'meeting_room' },
    { from: 'client', to: 'monaco_editor' },

    { from: 'dashboard', to: 'next_js_app' },
    { from: 'interview_workspace', to: 'next_js_app' },
    { from: 'scheduling_ui', to: 'next_js_app' },
    { from: 'meeting_room', to: 'next_js_app' },
    { from: 'monaco_editor', to: 'next_js_app' },

    { from: 'next_js_app', to: 'clerk', label: 'Auth API' },
    { from: 'next_js_app', to: 'convex', label: 'Realtime' },
    { from: 'next_js_app', to: 'stream_video', label: 'Video API' },

    { from: 'convex', to: 'interview_scheduling' },
    { from: 'convex', to: 'interview_lifecycle' },
    { from: 'convex', to: 'coding_challenge' },
    { from: 'convex', to: 'recording_management' },

    { from: 'coding_challenge', to: 'judge_pipeline' },
    { from: 'stream_video', to: 'recording_management' },
  ],
};

registerArchitecture(cortexaArchitecture);
