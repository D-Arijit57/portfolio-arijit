import { registerArchitecture } from '../../architecture/registry';
import type { ArchitectureModel } from '../../architecture/types';

/**
 * Lattice's canonical ArchitectureModel — same shape and conventions as
 * rakshachakra.ts (see ARCHITECTURE_PLATFORM_DESIGN.md §13). architecture.mmd
 * is generated from this model by modelToMermaid(), never the other way
 * around.
 *
 * Every node is grounded in the project's own README (github.com/D-Arijit57/
 * Lattice): the Browser → Vercel (static SPA + api/proxy.ts) → Render
 * (Docker: Gunicorn + Django) → Supabase Postgres request path, the
 * services/ vs. thin-views split, and the organization-scoped tenancy and
 * API-key delivery paths. Nothing here asserts a component the README
 * doesn't describe.
 *
 * Registers itself on import — whatever imports this module
 * (workspaceSeed.ts) must run before the app's first render.
 */
export const latticeArchitecture: ArchitectureModel = {
  projectKey: 'lattice',
  nodes: [
    // Layer 1 — Client
    {
      id: 'browser',
      title: 'Browser',
      category: 'client',
      technology: 'React, Vite, Tailwind CSS',
      description: 'The single-page admin UI where members sign in, define content types and fields, publish versions, and create entries.',
      responsibilities: ['Auth screens', 'Content-type and field management', 'Entry creation and listing'],
      dependencies: ['vercel_proxy'],
      runtime: 'Browser (client-side)',
      deployment: 'Static SPA served from Vercel',
      status: 'active',
    },
    {
      id: 'external_app',
      title: 'External App',
      category: 'client',
      technology: 'Any HTTP client',
      description: 'A third-party application that reads published content with an organization-issued API key, without a user login.',
      responsibilities: ['Read-only content fetch via Bearer API key'],
      dependencies: ['vercel_proxy'],
      runtime: 'Caller-owned',
      status: 'active',
    },

    // Layer 2 — Gateway
    {
      id: 'vercel_proxy',
      title: 'Vercel Proxy',
      category: 'gateway',
      technology: 'Vercel Function (api/proxy.ts)',
      description: 'Rewrites every /api/* request to one function that forwards method, headers, body and Set-Cookie to the backend, keeping auth cookies first-party and removing CORS from production.',
      responsibilities: ['Single-origin /api routing', 'Header, body and Set-Cookie forwarding'],
      dependencies: ['django_api'],
      runtime: 'Vercel serverless function (Singapore region)',
      deployment: 'Deployed with the frontend; rewrite defined in vercel.json',
      status: 'active',
    },

    // Layer 3 — Application
    {
      id: 'django_api',
      title: 'Django REST API',
      category: 'backend',
      technology: 'Django, Django REST Framework, Gunicorn',
      description: 'Thin DRF views and serializers for auth, organizations, content, delivery and monitoring. Business rules live in the services layer, not in the views.',
      responsibilities: ['Request routing and serialization', 'JWT cookie auth', 'Membership checks on org-scoped routes', 'Throttling'],
      dependencies: ['auth', 'tenancy', 'content_services', 'delivery_api', 'postgres'],
      runtime: 'Gunicorn + Django in a Docker container',
      deployment: 'Render (Docker); entrypoint.sh applies migrations then starts Gunicorn',
      status: 'active',
    },

    // Layer 4 — Domains
    {
      id: 'auth',
      title: 'Auth',
      category: 'auth',
      technology: 'JWT in httpOnly cookies',
      description: 'Signup, login, refresh and logout. A 15-minute access cookie and a 7-day refresh cookie scoped to the refresh endpoint only.',
      responsibilities: ['Issue and refresh tokens', 'httpOnly, SameSite=Lax, Secure cookies', 'Rate-limited login and signup'],
      dependencies: ['django_api', 'postgres'],
      status: 'active',
    },
    {
      id: 'tenancy',
      title: 'Tenancy',
      category: 'backend',
      technology: 'OrganizationMembership checks',
      description: 'Every organization-scoped route checks the caller belongs to the organization: a non-member gets 403, a missing organization 404.',
      responsibilities: ['Membership checks', 'Per-organization isolation'],
      dependencies: ['django_api', 'postgres'],
      status: 'active',
    },
    {
      id: 'content_services',
      title: 'Content Services',
      category: 'backend',
      technology: 'Python (content/services/)',
      description: 'The business rules: generating a JSON Schema from a content type\'s fields, publishing immutable versions, and validating entries against the version they are pinned to.',
      responsibilities: ['schema_generation', 'versioning', 'entry_validation (all field errors at once)'],
      dependencies: ['django_api', 'postgres'],
      status: 'active',
    },
    {
      id: 'delivery_api',
      title: 'Delivery API',
      category: 'gateway',
      technology: 'DRF, API-key authentication',
      description: 'Read-only content delivery for outside apps. Keys are random, stored only as SHA-256 hashes, revocable, and throttled per key.',
      responsibilities: ['Bearer API-key auth', 'Per-key rate limiting', 'Read-only entry access by content-type slug'],
      dependencies: ['django_api', 'postgres'],
      status: 'active',
    },

    // Layer 5 — Data & delivery infrastructure
    {
      id: 'postgres',
      title: 'PostgreSQL',
      category: 'database',
      technology: 'PostgreSQL (Supabase), JSONB',
      description: 'Relational store for users, organizations, memberships, content types, fields and versions; entries are JSONB. Database-level unique constraints back the tenancy-sensitive tables.',
      responsibilities: ['JSONB entry storage', 'Unique constraints', 'Composite index on entry lists'],
      runtime: 'Managed Postgres (Supabase), Session pooler',
      deployment: 'External managed database; same region as the backend',
      status: 'active',
    },
    {
      id: 'ci',
      title: 'GitHub Actions CI',
      category: 'infrastructure',
      technology: 'GitHub Actions, pytest, postgres:16',
      description: 'On every push and pull request: the backend suite runs against a postgres:16 service container, and the frontend is type-checked and built.',
      responsibilities: ['pytest against Postgres', 'Frontend type-check and build'],
      dependencies: ['django_api'],
      status: 'active',
    },
  ],
  edges: [
    { from: 'browser', to: 'vercel_proxy', label: '/api/*' },
    { from: 'external_app', to: 'vercel_proxy', label: 'Bearer key' },
    { from: 'vercel_proxy', to: 'django_api', label: 'Forward' },

    { from: 'ci', to: 'django_api', label: 'pytest' },

    { from: 'django_api', to: 'auth' },
    { from: 'django_api', to: 'tenancy' },
    { from: 'django_api', to: 'content_services' },
    { from: 'django_api', to: 'delivery_api' },

    { from: 'auth', to: 'postgres', label: 'Users' },
    { from: 'tenancy', to: 'postgres' },
    { from: 'content_services', to: 'postgres', label: 'JSONB' },
    { from: 'delivery_api', to: 'postgres', label: 'Read' },
  ],
};

registerArchitecture(latticeArchitecture);
