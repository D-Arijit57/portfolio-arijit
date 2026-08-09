import 'dotenv/config';

export interface AppConfig {
  readonly port: number;
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly corsOrigin: string;
  readonly githubUsername?: string;
  readonly githubToken?: string;
  readonly leetcodeUsername?: string;
  readonly resendApiKey?: string;
  readonly feedbackToEmail?: string;
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
  corsOrigin: readEnv('CORS_ORIGIN', 'http://localhost:3000'),
  githubUsername: readOptionalEnv('GITHUB_USERNAME'),
  githubToken: readOptionalEnv('GITHUB_TOKEN'),
  leetcodeUsername: readOptionalEnv('LEETCODE_USERNAME'),
  // Genuinely optional, same reasoning as githubToken above: contact.sh's
  // Review must degrade to a 503 (feedbackService.ts), never crash backend
  // boot, when unconfigured — the Handoff stays fully functional either way.
  resendApiKey: readOptionalEnv('RESEND_API_KEY'),
  feedbackToEmail: readOptionalEnv('FEEDBACK_TO_EMAIL'),
};
