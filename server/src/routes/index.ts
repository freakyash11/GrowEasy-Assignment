import { Router, IRouter } from 'express';
import { healthRouter } from './health.routes';
import { csvRouter } from './csv.routes';

export const apiRouter: IRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/csv', csvRouter);

// Add more route groups here as the app grows:
// apiRouter.use('/users', usersRouter);
