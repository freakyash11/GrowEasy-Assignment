import { Request, Response } from 'express';
import { getHealthStatus } from '../services/health.service';

/**
 * GET /api/health
 * Returns server health status, uptime, and environment.
 */
export const getHealth = (_req: Request, res: Response): void => {
  const data = getHealthStatus();
  res.status(200).json({
    success: true,
    data,
  });
};
