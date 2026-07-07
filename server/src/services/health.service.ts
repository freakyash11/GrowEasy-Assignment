import { env } from '../utils/env';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  timestamp: string;
  environment: string;
  version: string;
}

/**
 * Returns the current health status of the server.
 */
export const getHealthStatus = (): HealthStatus => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  environment: env.NODE_ENV,
  version: process.env.npm_package_version ?? '1.0.0',
});
