import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { apiRouter } from './routes';
import { env } from './utils/env';

const app: Application = express();

// ── Core middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ── Error handling (must be last) ────────────────────────────────────────────
app.use(errorHandler);

export default app;
