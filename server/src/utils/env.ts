import 'dotenv/config';

interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  /** Required for AI extraction. Loaded lazily — missing key is caught at service call time. */
  OPENROUTER_API_KEY: string | undefined;
  /** Number of CSV rows per AI batch request (default: 20). */
  BATCH_SIZE: number;
  /** Maximum number of concurrent AI batch requests (default: 3). */
  MAX_CONCURRENCY: number;
  /** Permitted client origin for CORS. */
  CLIENT_URL: string;
}

/**
 * Validated environment configuration.
 * OPENROUTER_API_KEY is optional here — the AI service validates it at call time
 * so the rest of the server still starts without it.
 */
export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as EnvConfig['NODE_ENV'],
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE ?? '20', 10),
  MAX_CONCURRENCY: parseInt(process.env.MAX_CONCURRENCY ?? '3', 10),
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:3000',
};

