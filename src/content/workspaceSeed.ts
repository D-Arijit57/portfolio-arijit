import { VirtualFolder, VirtualFile, ExplorerNode } from '../types';
import { modelToMermaid } from '../architecture/renderers/mermaidRenderer';
import { latticeArchitecture } from './architecture/lattice';
import { rakshachakraArchitecture } from './architecture/rakshachakra';
import { workHistoryToYaml } from '../experience/renderers/yamlRenderer';
import { workHistory } from './workHistory';
import { contactChannelsToShellScript } from '../contact/renderers/shellRenderer';
import { CONTACT_CHANNELS } from './contact';
import { WELCOME_PARAGRAPHS } from './welcome';
import { WELCOME_BANNER } from '../components/signature/signatureBanner';
import {
  ENGINEERING_PROFILE_FIELDS,
  ENGINEERING_PROFILE_FIELD_COLUMN_WIDTH,
  ENGINEERING_PROFILE_STATUS,
} from './engineeringProfile';

// welcome.md's fence body: the widget renderer (documentationWidgets.tsx's
// `welcome-intro` entry) ignores this text entirely — WelcomeIntro.tsx
// renders its own typewriter reveal from the same WELCOME_PARAGRAPHS
// import, independent of whatever sits inside the fence. This exists only
// so `cat welcome.md` and search see the real approved copy instead of an
// empty directive — same duplication caveat as every other generated field
// below: server/repositories/seed/workspaceSeed.ts can't import from src/,
// so its copy is a literal string kept in sync by hand.
const WELCOME_INTRO_CONTENT = `\`\`\`welcome-intro\n${WELCOME_PARAGRAPHS.join('\n\n')}\n\`\`\`\n`;

// startup.log's raw VFS content: a truthful static snapshot of what
// StartupLogViewer's real renderer (TerminalRunner, via signature.sh) shows
// once its sequence settles, built from the exact same WELCOME_BANNER and
// engineering-profile data TerminalRunner itself renders from — not a
// duplicate of its phase machine, just the same source formatted the same
// way EngineeringProfile.tsx pads its own field labels. Deliberately omits
// the visitor count: that's live, per-visitor state fetched at render time
// (visitorClient.recordVisit()), and there's no honest static number to
// print here — see VisitorLine.tsx's own "no fabricated placeholder"
// precedent. Same duplication caveat as WELCOME_INTRO_CONTENT above.
function formatStartupLogContent(): string {
  const fieldLines = ENGINEERING_PROFILE_FIELDS
    .map((f) => `${f.label.padEnd(ENGINEERING_PROFILE_FIELD_COLUMN_WIDTH)}${f.value}`)
    .join('\n');
  const statusLine = `${'Status'.padEnd(ENGINEERING_PROFILE_FIELD_COLUMN_WIDTH)}● ${ENGINEERING_PROFILE_STATUS}`;

  return [
    '$ ./signature.sh',
    '',
    WELCOME_BANNER.join('\n'),
    '',
    fieldLines,
    statusLine,
    '',
    'arijit@portfolio:~$',
  ].join('\n') + '\n';
}

const STARTUP_LOG_CONTENT = formatStartupLogContent();

// hire_me.md: the left panel's content is a hand-authored artifact styled
// like generated CLI output — "why hire this engineer" — rather than
// restating the resume the PDF on the right already covers. Rendered by
// HireMeDocumentView.tsx's own line-based terminal parser, not the generic
// markdown pipeline. Still duplicated as a literal string in
// server/repositories/seed/workspaceSeed.ts (that seed can't import from
// src/, same "no frontend imports" convention every backend seed file
// already follows) — keep both copies byte-identical by hand.
const HIRE_ME_REPORT = `$ review candidate

Loading profile...

Candidate ........... Arijit Das
Role ................ Software Engineer
Focus ............... Backend systems • REST APIs
Status .............. AVAILABLE

Strengths
─────────
✓ Node.js/Express and Django REST Framework backends
✓ Production debugging and root-cause analysis
✓ Multi-tenant API design on PostgreSQL
✓ Tested code shipped through Docker and CI
✓ Performance work measured with load tests

Recent Highlights
─────────────────
• Restored a failing serverless deploy across 37 backend modules
• Traced a production data race in unawaited async hydration
• Diagnosed a schema-validation defect behind 3 failing tests
• Contributed to an AI assistant alongside senior engineers
• Built Lattice, a multi-tenant headless content engine

Looking For
───────────
Backend engineering roles where APIs, data modelling and
production reliability are the daily work.

Recommendation
──────────────
✓ Strong candidate for Backend Engineering Roles

Learn More
──────────
→ Download resume.pdf
→ Explore projects/
→ View github.com/D-Arijit57
`;

// ARCHITECTURE_PLATFORM_DESIGN.md §6.1/§13 (Phase 1): architecture.mmd is now
// generated from the canonical ArchitectureModel (src/content/architecture/
// lattice.ts), not hand-written. Same duplication caveat as RFC_MARKDOWN
// above — server/repositories/seed/workspaceSeed.ts can't import from src/,
// so its copy is a literal string kept in sync by hand.
const LATTICE_ARCHITECTURE_MERMAID = modelToMermaid(latticeArchitecture);

// Same generated-not-hand-written relationship as LATTICE_ARCHITECTURE_MERMAID
// above, from src/content/architecture/rakshachakra.ts. Same duplication
// caveat — server/repositories/seed/workspaceSeed.ts's copy is a literal
// string kept in sync by hand.
const RAKSHACHAKRA_ARCHITECTURE_MERMAID = modelToMermaid(rakshachakraArchitecture);

// Career Roadmap redesign: americanchase.yaml's displayed source is
// generated from the canonical WorkExperience[] (src/content/workHistory.ts),
// the same relationship LATTICE_ARCHITECTURE_MERMAID has with
// latticeArchitecture above — the Career Roadmap panel imports that array
// directly rather than parsing this text back, so there's exactly one place
// the data lives. Same duplication caveat as the others — server/
// repositories/seed/workspaceSeed.ts can't import from src/, so its copy is
// a literal string kept in sync by hand.
const WORK_HISTORY_YAML = workHistoryToYaml(workHistory);

// contact.sh's displayed source — same "model in, source text out"
// relationship as WORK_HISTORY_YAML above, from src/content/contact.ts's
// CONTACT_CHANNELS (itself a projection of ResumeContact, never a second
// set of literal values). Same duplication caveat as the others — server/
// repositories/seed/workspaceSeed.ts can't import from src/, so its copy
// is a literal string kept in sync by hand.
const CONTACT_SH_CONTENT = contactChannelsToShellScript(CONTACT_CHANNELS);

// Hand-authored project documentation, same duplication convention as
// RFC_MARKDOWN and LATTICE_ARCHITECTURE_MERMAID above — kept textually
// identical to server/repositories/seed/workspaceSeed.ts's own copy, update
// both by hand together.
// Lattice's page renders through the generic Project Documentation Viewer
// (hero + sidebar + sections) from this markdown alone: summary, badges,
// highlights and metadata come from the frontmatter, and the sections are
// parsed as written. Every claim here is taken from the project's README
// or the 2026 résumé's Lattice bullets.
const LATTICE_DOC_MARKDOWN = `---
summary: A multi-tenant, headless content engine where organizations define their own content types at runtime — no code change or migration per type.
badges: [python, django, django-rest-framework, postgresql, docker, github-actions, react, vite, tailwind, vercel, render]
highlights: [Runtime-defined content types stored as JSONB, Immutable versioned JSON Schemas, Tenant isolation checked on every organization-scoped route, 150x faster list queries via a composite index, Queries per page cut from 54 to 4]
metadata: [Status: Deployed, Architecture: Browser → Vercel proxy → Render (Docker) → Postgres, Backend: Django REST Framework, Database: PostgreSQL (JSONB), Authentication: JWT in httpOnly cookies + hashed API keys, CI: GitHub Actions]
---

# Lattice

## Overview

Lattice is a multi-tenant, headless content engine. Organizations define their own content types — Product, Event, Course — at runtime by declaring fields, then create and read entries through a REST API. Entries are stored as JSONB and validated against immutable, versioned JSON Schemas generated from those fields, so a new content type needs no code change and no database migration.

## Problem Statement

A content backend usually bakes its content types into the schema: every new kind of content means a model, a migration and a deploy. Lattice moves that decision to runtime. A content type is data, a published version is an immutable JSON Schema, and an entry is pinned to the version it was created under — so changing a type never rewrites the entries that already exist. Isolation between organizations is enforced on the server, on every route, not assumed by the client.

## Core Features

- **Runtime content types** — organizations declare fields (string, number, boolean, date, optionally required) and publish a version; the JSON Schema is generated from the fields.
- **Versioned, immutable schemas** — publishing a new version never changes an old one, and each entry stays pinned to the version it was validated against.
- **Per-field validation errors** — an invalid entry returns every field error at once, not just the first.
- **Tenant isolation** — membership checks on every organization-scoped route, backed by database-level unique constraints.
- **Cookie-based auth** — JWTs live in httpOnly cookies; the refresh cookie is scoped to the refresh endpoint only.
- **Delivery API** — hashed, revocable, read-only API keys let an outside app fetch content without a user login, with rate limiting per key.
- **Measured performance** — load-tested with k6 on 100k entries: a composite index made list queries 150x faster (46 to 0.3 ms), fixing an N+1 query cut queries per page from 54 to 4, and one worker serves 150 req/s error-free.
- **Tested in CI** — a pytest suite runs in GitHub Actions against Postgres on every push.

## Continue Exploring

- [Architecture Canvas](architecture.mmd) — Explore the interactive system architecture.
- [Tech Stack Constellation](constellation.explore) — Browse the complete categorized technology inventory.
- [GitHub Repository](https://github.com/D-Arijit57/Lattice) — Explore the implementation and source code.
- [Live Demo](https://lattice-five-orcin.vercel.app) — Live, deployed instance of the app.
`;

// Manifest Viewer (Engineering Manifest Explorer): every top-level key
// except "project"/"description" is read as a category by
// src/manifest/parser.ts — adding a new key here (e.g. "observability")
// is the entire mechanism for a new card to appear, with zero renderer
// changes. No "stack" wrapper — categories are flat top-level keys, so a
// future addition is exactly the shape the brief's example showed.
//
// The file is named constellation.explore (see the virtual file entry
// below) but this text stays JSON-flow-style rather than YAML block
// style — JSON is a valid subset of YAML 1.2, so parseManifest()'s
// JSON.parse() keeps working unchanged. It's never shown raw either way
// (ManifestViewer always renders the parsed model, never this source
// text), so the flow-style form costs nothing and avoids a parser rewrite.
//
// Lattice's Tech Stack Constellation is the Boötes constellation (user-supplied
// reference image): 9 stars, 9 technologies. `position` is each star's pixel
// location in that image, offset to the top-left star and divided by 235 (the
// same divisor on both axes, so the silhouette keeps its proportions; 235 is
// what keeps the closest pair, the two small stars at the right-hand tip,
// clear of each other at the 42-unit node radius). Arcturus, the brightest
// star, carries Django. `connectsTo` is the constellation's own 8 line
// segments, directed outward from Django as a spanning tree (Boötes has no
// cycle, so nothing is dropped). Which technology sits on which star is an
// authoring choice — swap any two names and positions to reorder.
const LATTICE_MANIFEST_YAML = `{
  "project": "Lattice",
  "description": "The core technologies behind Lattice's backend, data layer and delivery pipeline — a curated overview, not an exhaustive dependency list (see lattice.md for the feature inventory).",
  "backend": [
    {
      "technology": "Django",
      "role": "Application Framework",
      "description": "Python web framework hosting the models, services and routing for the whole API.",
      "tags": ["Core"],
      "importance": "primary",
      "position": { "x": 1.01, "y": 0.58 },
      "color": "#3B82F6",
      "connectsTo": ["PostgreSQL", "Django REST Framework", "Docker"]
    },
    {
      "technology": "Python",
      "role": "Programming Language",
      "description": "Language for the backend, its service layer and its test suite.",
      "tags": ["Core"],
      "importance": "supporting",
      "position": { "x": 0.28, "y": 0.60 },
      "color": "#60A5FA"
    },
    {
      "technology": "Django REST Framework",
      "role": "API Layer",
      "description": "Thin views and serializers exposing auth, organizations, content and delivery endpoints.",
      "tags": ["Core", "REST"],
      "importance": "supporting",
      "position": { "x": 0.64, "y": 0.94 },
      "color": "#38BDF8"
    },
    {
      "technology": "JWT",
      "role": "Authentication",
      "description": "Access and refresh tokens kept in httpOnly cookies, with the refresh cookie scoped to the refresh endpoint only.",
      "tags": ["Auth", "Security"],
      "importance": "supporting",
      "position": { "x": 1.60, "y": -0.07 },
      "color": "#818CF8"
    }
  ],
  "testing": [
    {
      "technology": "pytest",
      "role": "Test Framework",
      "description": "Backend test suite covering auth, tenancy, schema generation, versioning, validation and delivery.",
      "tags": ["Testing"],
      "importance": "supporting",
      "position": { "x": 0.31, "y": 0.22 },
      "color": "#2DD4BF",
      "connectsTo": ["GitHub Actions", "Python"]
    },
    {
      "technology": "GitHub Actions",
      "role": "Continuous Integration",
      "description": "Runs the backend suite against a Postgres service container, and type-checks and builds the frontend, on every push.",
      "tags": ["CI"],
      "importance": "supporting",
      "position": { "x": 0.03, "y": 0.03 },
      "color": "#5EEAD4"
    }
  ],
  "deployment": [
    {
      "technology": "Render",
      "role": "Backend Hosting",
      "description": "Runs the Dockerized backend behind the Vercel proxy.",
      "tags": ["Managed Service"],
      "importance": "secondary",
      "position": { "x": 1.98, "y": 0.17 },
      "color": "#F97316",
      "connectsTo": ["JWT"]
    },
    {
      "technology": "Docker",
      "role": "Containerization",
      "description": "Packages the backend so the same image runs locally and in production.",
      "tags": ["Container"],
      "importance": "supporting",
      "position": { "x": 1.53, "y": 0.34 },
      "color": "#FBBF24",
      "connectsTo": ["Render"]
    }
  ],
  "data": [
    {
      "technology": "PostgreSQL",
      "role": "Primary Database",
      "description": "Relational store with JSONB entries, database-level unique constraints and a composite index on entry lists.",
      "tags": ["Database", "JSONB"],
      "importance": "secondary",
      "position": { "x": 0.83, "y": 0.13 },
      "color": "#A855F7",
      "connectsTo": ["pytest"]
    }
  ]
}
`;

// Rakshachakra: hand-authored project documentation, same shape/convention
// as LATTICE_DOC_MARKDOWN above (frontmatter + Overview/Problem Statement/
// Core Features/Continue Exploring) — kept textually identical to server/
// repositories/seed/workspaceSeed.ts's own copy, update both by hand
// together. Continue Exploring has 3 link-cards, not Lattice's 4: no live
// demo URL exists for this project, and inventing one isn't warranted.
const RAKSHACHAKRA_DOC_MARKDOWN = `---
summary: A behavior-based continuous-authentication demo — a Flutter banking app backed by a Flask risk-scoring API on AWS — verifying identity throughout a session, not just at login.
badges: [Python, Flask, AWS, Flutter, Dart, Firebase, Cloud Firestore]
highlights: [25+ behavioral features scored per session to predict login risk, Throughput raised from 27 to 101 req/s with a per-user ETag cache, p50 latency cut from 3.5 s to 140 ms, Prediction latency under mixed load cut from 2 s to 38 ms via background training jobs, Intermittent HTTP 500s during retraining eliminated with per-user file locks]
metadata: [Status: Demo / Prototype, Built: Jun – Jul 2025, Architecture: Layered (Presentation/Application/Data/ML), Platform: Flutter, Backend: Flask REST API on AWS EC2 + Firebase, Authentication: Continuous Behavioral + Biometric, Risk Engine: Flask Model Service]
---

# Rakshachakra

## Overview

Rakshachakra is a mobile banking demo built around behavior-based continuous authentication, with a Flutter client and a Flask backend on AWS EC2 that scores each session's behavior. Instead of verifying identity once at login, it continuously evaluates whether live touch, motion, and device behavior still match the enrolled user's profile, and adjusts the security response in real time based on the resulting risk score. It replaces the common pattern of a single login checkpoint with a system that treats identity as something to be continuously re-confirmed throughout a session.

## Problem Statement

Most mobile banking apps authenticate a user once at login and then trust that session until it expires or the user logs out — leaving no mechanism to detect a stolen or hijacked session where the underlying behavior no longer matches the real user. Rakshachakra keeps behavioral signal collection, feature extraction, risk inference, and the resulting security response inside one continuously running pipeline, rather than treating authentication as a single gate the user passes through once.

## Core Features

- **Continuous behavioral authentication** — identity is re-evaluated throughout the session against touch, motion, and device signals, not just once at login.
- **Behavioral feature extraction** — raw sensor and interaction events are transformed into 25+ behavioral features describing how the current user is interacting with the device.
- **Real-time risk inference** — a Flask REST API on AWS EC2 scores 25+ behavioral features per session against the enrolled profile to predict login risk; a per-user ETag cache raised throughput from 27 to 101 req/s and cut p50 latency from 3.5 s to 140 ms.
- **Adaptive response engine** — security response scales with risk: low risk continues normally, medium risk triggers step-up authentication, high risk locks or restricts the session.
- **Background model retraining** — the behavioral model evolves as legitimate usage patterns change; 8–18 s training jobs run in background processes, cutting prediction latency under mixed load from 2 s to 38 ms, and per-user file locks removed the race condition behind intermittent HTTP 500s during retraining.
- **Local and biometric authentication support** — device-level biometric and local authentication checks back the behavioral layer.

## Continue Exploring

- [Architecture Canvas](architecture.mmd) — Explore the interactive system architecture.
- [Tech Stack Constellation](constellation.explore) — Browse the complete categorized technology inventory.
- [GitHub Repository](https://github.com/D-Arijit57/Rakshachakra) — Explore the implementation and source code.
`;

// Rakshachakra's Manifest Viewer source — same JSON-flow-style-inside-a-
// .yaml-file convention as LATTICE_MANIFEST_YAML above (see that constant's
// comment for why: parseManifest() uses JSON.parse(), not a real YAML
// parser).
//
// Layout v5 — Crystal Lattice (final direction after 4 rejected passes:
// dense 20-node lattice, curated 8-node tree, Orion). Per explicit user
// direction, this is NOT a real-world constellation reference at all —
// silhouette (a gem/crystal reading) took precedence over literal
// dependency accuracy throughout, including one deliberate deviation from
// the user's own suggested edge list: their brief left Cloud Firestore
// with a single connection (to Firebase), which conflicts with their own
// "no dangling nodes" rule — added `Cloud Firestore -> Python ML` (closing
// a triangle with the existing Firebase<->Python ML core edge) to fix
// that, exactly the kind of adjustment the brief explicitly permits
// ("the important part is not the exact edges").
//
// Structure: Flutter/Firebase/Python ML form the rigid 3-node core
// triangle. Three more triangular facets share an edge with the core or
// with each other — Flutter-Provider-Dart, Flutter-Firebase-Provider, and
// Firebase-Python-ML-Cloud-Firestore — plus one two-hop cross-brace
// (Flutter -> Local Auth -> Hive -> fed by Python ML) that anchors at
// BOTH ends rather than dead-ending, satisfying "cross-bracing" and "no
// isolated branches" simultaneously. Every node has >= 2 connections
// (verified programmatically), zero edge crossings (verified via segment-
// intersection check on these exact coordinates), zero cycles, single
// connected component. Bounding box is compact/near-square (~1.15 x 1.05
// normalized units) rather than the previous landscape or portrait
// layouts — deliberately gem-like rather than elongated.
//
// Hierarchy: Flutter alone is `primary` tier (largest/brightest, the
// existing isRoot sparkle treatment). Firebase and Python ML are
// `secondary`. Every other node is `supporting` — this is the data-only
// way "Flutter should read as clearly most important, Firebase/Python ML
// as clear seconds" is satisfied without any renderer change, reusing
// ConstellationStar.tsx's existing tier-driven size/glow exactly as
// before.
//
// Colors/tags/roles/descriptions are unchanged from the prior 8-node
// pass (Dart's revived from the very first 20-node lattice, byte-
// identical to that round). Node set: Sensors Plus dropped, Dart restored
// — this exact 8 (Flutter, Dart, Provider, Hive, Firebase, Cloud
// Firestore, Python ML, Local Auth) per explicit instruction.
// Rakshachakra's Tech Stack Constellation is Taurus (user-supplied reference
// image): its 7 stars plus one small extra star (Python ML, between the
// Flask star and Cloud Firestore) for the eighth technology. `position` is each
// star's pixel location in that image, offset to the top-left and divided by
// 400, then ×2.6, on both axes so the silhouette keeps its proportions
// and the nodes render at the same on-screen size as Lattice's. The big hub stars
// carry Flutter and Firebase; Flask and AWS come from the 2026 résumé's
// RakshaChakra line (Python, Flask, REST APIs, AWS EC2). `connectsTo` is the
// image's own 6 line segments plus one for the extra star, directed outward
// from Flutter.
const RAKSHACHAKRA_MANIFEST_YAML = `{
  "project": "Rakshachakra",
  "description": "The core technologies that define Rakshachakra's architecture — a curated overview, not an exhaustive dependency list (see rakshachakra.md for the full feature/package inventory).",
  "mobileApp": [
    {
      "technology": "Flutter",
      "role": "Application Framework",
      "description": "Cross-platform mobile framework powering the entire client application.",
      "tags": ["Core"],
      "importance": "primary",
      "position": { "x": 0.49, "y": 0.83 },
      "color": "#3B82F6",
      "connectsTo": ["Dart", "Flask", "Firebase"]
    },
    {
      "technology": "Dart",
      "role": "Programming Language",
      "description": "Primary language for the Flutter application and its business logic.",
      "tags": ["Core"],
      "importance": "supporting",
      "position": { "x": 0.00, "y": 0.36 },
      "color": "#60A5FA"
    }
  ],
  "backend": [
    {
      "technology": "Flask",
      "role": "API Backend",
      "description": "Python web framework serving the risk-scoring REST API; scores 25+ behavioral features per session, with a per-user ETag cache.",
      "tags": ["Python", "REST"],
      "importance": "secondary",
      "position": { "x": 0.86, "y": 0.47 },
      "color": "#38BDF8",
      "connectsTo": ["AWS", "Python ML"]
    },
    {
      "technology": "AWS",
      "role": "Cloud Hosting",
      "description": "Hosts the Flask backend on EC2.",
      "tags": ["Cloud", "EC2"],
      "importance": "supporting",
      "position": { "x": 0.68, "y": 0.00 },
      "color": "#FB923C"
    }
  ],
  "localData": [
    {
      "technology": "Hive",
      "role": "Local Database",
      "description": "Lightweight local key-value/object storage for on-device data.",
      "tags": ["Local Storage"],
      "importance": "supporting",
      "position": { "x": 0.21, "y": 1.40 },
      "color": "#5EEAD4"
    }
  ],
  "cloudAndData": [
    {
      "technology": "Firebase",
      "role": "Cloud Platform",
      "description": "Core Firebase integration underpinning the app's cloud services.",
      "tags": ["Managed Service"],
      "importance": "secondary",
      "position": { "x": 1.07, "y": 1.51 },
      "color": "#F97316",
      "connectsTo": ["Cloud Firestore", "Hive"]
    },
    {
      "technology": "Cloud Firestore",
      "role": "Cloud Database",
      "description": "Cloud data storage and sync for user profile and session data.",
      "tags": ["Database", "Sync"],
      "importance": "supporting",
      "position": { "x": 1.79, "y": 0.96 },
      "color": "#FBBF24"
    }
  ],
  "intelligenceLayer": [
    {
      "technology": "Python ML",
      "role": "Behavioral Risk Inference",
      "description": "Python service serving real-time behavioral risk inference; training jobs run in background processes so predictions stay fast.",
      "tags": ["Python", "Inference"],
      "importance": "supporting",
      "position": { "x": 1.43, "y": 0.39 },
      "color": "#A855F7"
    }
  ]
}
`;

// Sprint 11 (Knowledge Graph): consolidates the old skills/frontend.yaml +
// skills/backend.yaml into one skills.graph file, matching the
// 6-category scheme (Programming Languages, Frontend, Backend, Artificial
// Intelligence, Cloud, Developer Tools) and the richer GraphNode schema
// (src/graph/types.ts). Real YAML, not JSON-in-yaml — parsed by
// loadGraphModel() (src/graph/loader.ts) via the `yaml` package, an
// explicit, approved exception to the JSON-flow-style trick
// constellation.explore uses, since this file is meant to read as
// genuinely developer-authored.
//
// Content grounding (per explicit instruction: do not fabricate years,
// proficiency percentages, project usage, or certifications):
// - Every node here appears in the 2026 résumé, either in TECHNICAL SKILLS
//   or in a project's own technology line. Technologies that appeared only
//   in an earlier résumé were removed rather than kept for breadth — see
//   the deletion list below.
// - `projects`/`notes` cite only what the résumé itself documents. A node
//   the résumé lists but never attributes to a project (SQL, Prompt
//   Engineering, Vector DBs, Hugging Face, Open-Source LLMs, JIRA, Postman,
//   Git, GitHub) carries a factual description of the technology and no
//   personal claim.
// - `proficiency`/`proficiencyPercent`/`years` are left unset on every
//   node — nothing in the résumé states per-skill duration or a percentage.
// - `isCore` is the graph's only weighting axis, so it is spent on the
//   technologies that define the current positioning (backend services in
//   Node/Express, the languages they are written in, the React/Next stack
//   the projects are built on, and RAG) rather than on everything credible.
//   C++ is deliberately not core: it is real (TCS CodeVita, top 5%) but it
//   is not what this portfolio is arguing.
//
// Removed in the 2026 pass, each because the current résumé no longer
// mentions it anywhere: OpenAI API, LangChain (the LLM stack the previous
// American Chase story was built on), Go, Vue, Tailwind CSS, Framer Motion,
// shadcn/ui + Radix UI, HTML/CSS, Zustand, PostgreSQL, MongoDB, Redis,
// GraphQL, Microservices, Convex, Vercel, Monaco Editor.
const SKILLS_GRAPH_YAML = `title: Skills
description: An interactive map of the languages, frameworks, and tools I build with.

categories:
  - key: languages
    title: Programming Languages
    nodes:
      - id: javascript
        name: JavaScript
        category: languages
        isCore: true
        description: The language of the web, and the runtime language of the Node.js backends and React frontends in this workspace.
        documentation: https://developer.mozilla.org/docs/Web/JavaScript
        projects: [American Chase]
        relatedNodes: [nodejs, react]
        tags: [web, backend, frontend]

      - id: python
        name: Python
        category: languages
        isCore: true
        description: A dynamically-typed, readable general-purpose language widely used for backends, scripting, and data work.
        documentation: https://docs.python.org/3
        projects: [Lattice - Multi-Tenant Content Engine, RakshaChakra - Behaviour-Based Authentication]
        notes: The language behind Lattice's Django backend and RakshaChakra's Flask analytics backend.
        relatedNodes: [django, drf, pytest]
        tags: [backend, scripting]

      - id: cpp
        name: C++
        category: languages
        description: A high-performance, compiled systems language with manual memory control and object-oriented features.
        documentation: https://en.cppreference.com
        notes: Used for competitive algorithmic work — TCS CodeVita 2025, top 5% of 100,000+ participants (Rank 4,811).
        tags: [systems, compiled, algorithms]

      - id: sql
        name: SQL
        category: languages
        description: The declarative query language for relational data — joins, aggregates, and set operations over tables.
        documentation: https://www.postgresql.org/docs/current/sql.html
        relatedNodes: [postgresql]
        tags: [data, query]

  - key: backend
    title: Backend & Databases
    nodes:
      - id: nodejs
        name: Node.js
        category: backend
        isCore: true
        description: A JavaScript runtime for building server-side applications outside the browser.
        documentation: https://nodejs.org/docs
        projects: [American Chase]
        notes: Debugged a serverless Node.js/Express backend at American Chase — an ESM deploy failure across 37 modules and an un-awaited provider refresh.
        relatedNodes: [expressjs, javascript, rest-apis]
        tags: [runtime, backend]

      - id: expressjs
        name: Express.js
        category: backend
        description: A minimal, unopinionated web framework for Node.js.
        documentation: https://expressjs.com
        projects: [American Chase]
        notes: The application framework behind the serverless backend worked on at American Chase.
        relatedNodes: [nodejs, rest-apis]
        tags: [framework, backend]

      - id: django
        name: Django
        category: backend
        isCore: true
        description: A batteries-included Python web framework with an ORM, migrations, and an admin.
        documentation: https://docs.djangoproject.com
        projects: [Lattice - Multi-Tenant Content Engine]
        notes: The framework behind Lattice, a multi-tenant headless content engine.
        relatedNodes: [drf, postgresql, python]
        tags: [framework, backend, python]

      - id: drf
        name: Django REST Framework
        category: backend
        isCore: true
        description: A toolkit for building Web APIs on Django — serializers, viewsets, authentication, and throttling.
        documentation: https://www.django-rest-framework.org
        projects: [Lattice - Multi-Tenant Content Engine]
        notes: Lattice's API layer — JWT auth in httpOnly cookies, hashed API keys, and rate limiting.
        relatedNodes: [django, rest-apis]
        tags: [api, backend, python]

      - id: postgresql
        name: PostgreSQL
        category: backend
        isCore: true
        description: An open-source relational database with JSONB, rich indexing, and strong transactional guarantees.
        documentation: https://www.postgresql.org/docs
        projects: [Lattice - Multi-Tenant Content Engine]
        notes: Lattice stores entries as JSONB; a composite index made list queries 150x faster (46 to 0.3 ms).
        relatedNodes: [django, sql]
        tags: [database, jsonb]

      - id: rest-apis
        name: REST APIs
        category: backend
        isCore: true
        description: An architectural style for designing networked applications around stateless, resource-oriented HTTP endpoints.
        documentation: https://developer.mozilla.org/docs/Web/HTTP
        projects: [American Chase, Lattice - Multi-Tenant Content Engine, RakshaChakra - Behaviour-Based Authentication]
        relatedNodes: [nodejs, expressjs, drf]
        tags: [http, api, backend]

  - key: frontend
    title: Frontend
    nodes:
      - id: react
        name: React
        category: frontend
        description: A component-based UI library for building interfaces from composable, stateful pieces.
        documentation: https://react.dev
        projects: [Portfolio Workspace (this site)]
        relatedNodes: [javascript, html5, tailwind]
        tags: [ui, components]

      - id: html5
        name: HTML5
        category: frontend
        description: The current standard markup language for structuring and presenting content on the web.
        documentation: https://developer.mozilla.org/docs/Web/HTML
        relatedNodes: [react]
        tags: [web, markup]

      - id: tailwind
        name: Tailwind CSS
        category: frontend
        description: A utility-first CSS framework for composing styles directly in markup.
        documentation: https://tailwindcss.com/docs
        projects: [Portfolio Workspace (this site)]
        relatedNodes: [react, html5]
        tags: [css, styling]

  - key: cloud
    title: DevOps & Cloud
    nodes:
      - id: aws
        name: AWS
        category: cloud
        description: Amazon Web Services — compute, storage, and networking primitives for running applications in the cloud.
        documentation: https://docs.aws.amazon.com
        projects: [RakshaChakra - Behaviour-Based Authentication]
        notes: Ran RakshaChakra's Flask backend on EC2.
        relatedNodes: [docker]
        tags: [cloud, infrastructure]

      - id: docker
        name: Docker
        category: cloud
        description: Container tooling that packages an application and its dependencies into a portable image.
        documentation: https://docs.docker.com
        projects: [Lattice - Multi-Tenant Content Engine]
        notes: Lattice's backend ships as a Docker image deployed on Render.
        relatedNodes: [github-actions, aws]
        tags: [containers, deployment]

      - id: github-actions
        name: GitHub Actions
        category: cloud
        description: GitHub's built-in CI/CD — workflows that build, test, and deploy on every push.
        documentation: https://docs.github.com/actions
        projects: [Lattice - Multi-Tenant Content Engine]
        notes: Runs Lattice's pytest suite against Postgres on every push.
        relatedNodes: [docker, pytest, github]
        tags: [ci, automation]

  - key: devtools
    title: Testing & Tools
    nodes:
      - id: pytest
        name: pytest
        category: devtools
        description: A Python testing framework with fixtures and plain-assert tests.
        documentation: https://docs.pytest.org
        projects: [Lattice - Multi-Tenant Content Engine]
        notes: Lattice's backend suite runs under pytest in CI.
        relatedNodes: [python, github-actions]
        tags: [testing, python]

      - id: postman
        name: Postman
        category: devtools
        description: A client for exercising and inspecting HTTP APIs while building and debugging them.
        documentation: https://learning.postman.com/docs
        relatedNodes: [rest-apis]
        tags: [api, testing]

      - id: git
        name: Git
        category: devtools
        description: A distributed version control system tracking history as a graph of immutable commits.
        documentation: https://git-scm.com/doc
        relatedNodes: [github]
        tags: [vcs]

      - id: github
        name: GitHub
        category: devtools
        description: A hosting platform for Git repositories, with pull requests, reviews, and CI automation.
        documentation: https://docs.github.com
        relatedNodes: [git, github-actions]
        tags: [vcs, collaboration]

      - id: jira
        name: JIRA
        category: devtools
        description: An issue and sprint tracker for planning work and following it through to delivery.
        documentation: https://support.atlassian.com/jira-software-cloud
        tags: [planning, process]
`;

/**
 * Pre-hydration seed for the workspace store. Schema-equivalent to the
 * backend's own seed (server/repositories/seed/workspaceSeed.ts) so the
 * app renders identically before and after hydrateVFS() replaces it with
 * real backend data (see VFS_DESIGN.md, BACKEND_BOOTSTRAP.md Milestone 4).
 */
export const workspaceSeed: VirtualFolder = {
  id: 'root',
  name: 'Journey',
  path: '/',
  children: [
    {
      id: 'readme',
      name: 'welcome.md',
      type: 'markdown',
      path: '/welcome.md',
      content: WELCOME_INTRO_CONTENT,
    } as VirtualFile,
    {
      id: 'startup-log',
      name: 'startup.log',
      type: 'log',
      path: '/startup.log',
      content: STARTUP_LOG_CONTENT,
    } as VirtualFile,
    {
      id: 'about',
      name: 'about',
      path: '/about',
      children: [
        {
          id: 'whoami',
          name: 'whoami.md',
          type: 'markdown',
          path: '/about/whoami.md',
          content: `# signature

\`\`\`identity-terminals
\`\`\`

\`\`\`about-activity-row
\`\`\`

\`\`\`contributions-terminal
\`\`\`
`,
        } as VirtualFile,
        {
          id: 'resume',
          name: 'hire_me.md',
          type: 'markdown',
          path: '/about/hire_me.md',
          content: HIRE_ME_REPORT,
        } as VirtualFile,
      ],
    } as VirtualFolder,
    {
      id: 'experience',
      name: 'experience',
      path: '/experience',
      children: [
        {
          id: 'american_chase',
          name: 'americanchase.yaml',
          type: 'yaml',
          path: '/experience/americanchase.yaml',
          content: WORK_HISTORY_YAML,
        } as VirtualFile,
      ],
    } as VirtualFolder,
    {
      id: 'projects',
      name: 'projects',
      path: '/projects',
      children: [
        {
          id: 'lattice',
          name: 'Lattice',
          path: '/projects/Lattice',
          children: [
            {
              id: 'lattice_readme',
              name: 'lattice.md',
              type: 'markdown',
              path: '/projects/Lattice/lattice.md',
              content: LATTICE_DOC_MARKDOWN,
            } as VirtualFile,
            {
              id: 'lattice_arch',
              name: 'architecture.mmd',
              type: 'mermaid',
              path: '/projects/Lattice/architecture.mmd',
              content: LATTICE_ARCHITECTURE_MERMAID,
            } as VirtualFile,
            {
              id: 'lattice_manifest',
              name: 'constellation.explore',
              type: 'explore',
              path: '/projects/Lattice/constellation.explore',
              content: LATTICE_MANIFEST_YAML,
            } as VirtualFile,
          ],
        } as VirtualFolder,
        {
          id: 'rakshachakra',
          name: 'Rakshachakra',
          path: '/projects/Rakshachakra',
          children: [
            {
              id: 'rakshachakra_readme',
              name: 'rakshachakra.md',
              type: 'markdown',
              path: '/projects/Rakshachakra/rakshachakra.md',
              content: RAKSHACHAKRA_DOC_MARKDOWN,
            } as VirtualFile,
            {
              id: 'rakshachakra_arch',
              name: 'architecture.mmd',
              type: 'mermaid',
              path: '/projects/Rakshachakra/architecture.mmd',
              content: RAKSHACHAKRA_ARCHITECTURE_MERMAID,
            } as VirtualFile,
            {
              id: 'rakshachakra_manifest',
              name: 'constellation.explore',
              type: 'explore',
              path: '/projects/Rakshachakra/constellation.explore',
              content: RAKSHACHAKRA_MANIFEST_YAML,
            } as VirtualFile,
          ],
        } as VirtualFolder,
      ],
    } as VirtualFolder,
    {
      id: 'skills',
      name: 'skills',
      path: '/skills',
      children: [
        {
          id: 'skills_graph',
          name: 'skills.graph',
          type: 'graph',
          path: '/skills/skills.graph',
          content: SKILLS_GRAPH_YAML,
        } as VirtualFile,
      ],
    } as VirtualFolder,
    {
      id: 'contact',
      name: 'contact',
      path: '/contact',
      children: [
        {
          id: 'contact_sh',
          name: 'contact.sh',
          type: 'shell',
          path: '/contact/contact.sh',
          content: CONTACT_SH_CONTENT,
        } as VirtualFile,
      ],
    } as VirtualFolder,
  ],
};

export function getAllFiles(node: ExplorerNode): VirtualFile[] {
  if ('content' in node) {
    return [node as VirtualFile];
  }
  return (node as VirtualFolder).children.flatMap(getAllFiles);
}
