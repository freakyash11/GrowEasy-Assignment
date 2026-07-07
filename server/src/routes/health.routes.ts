import { Router, IRouter } from 'express';
import { getHealth } from '../controllers/health.controller';

export const healthRouter: IRouter = Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
healthRouter.get('/', getHealth);
