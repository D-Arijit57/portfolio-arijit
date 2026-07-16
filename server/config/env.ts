import 'dotenv/config';

export interface AppConfig {
  readonly port: number;
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly corsOrigin: string;
}

function readEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config: AppConfig = {
  port: Number(readEnv('PORT', '4000')),
  nodeEnv: readEnv('NODE_ENV', 'development') as AppConfig['nodeEnv'],
  corsOrigin: readEnv('CORS_ORIGIN', 'http://localhost:3001'),
};
