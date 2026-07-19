import 'dotenv/config';

export interface AppConfig {
  readonly port: number;
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly corsOrigin: string;
  readonly githubUsername?: string;
  readonly githubToken?: string;
}

function readEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Genuinely optional, unlike the required config above: an unconfigured
// GitHubProvider must degrade to an error status (VFS_DESIGN.md §11.4), not
// crash backend boot the way a missing required var does.
function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === '' ? undefined : value;
}

export const config: AppConfig = {
  port: Number(readEnv('PORT', '4000')),
  nodeEnv: readEnv('NODE_ENV', 'development') as AppConfig['nodeEnv'],
  corsOrigin: readEnv('CORS_ORIGIN', 'http://localhost:3001'),
  githubUsername: readOptionalEnv('GITHUB_USERNAME'),
  githubToken: readOptionalEnv('GITHUB_TOKEN'),
};
