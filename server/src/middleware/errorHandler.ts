import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../types/errors';

/**
 * Global Express error handler.
 * Handles:
 *  - AppError  — operational errors (400/401/403/404, etc.)
 *  - MulterError — file upload failures (size limit, unexpected field, etc.)
 *  - ZodError  — response shape validation failures
 *  - Error     — unexpected / unhandled errors (500)
 *
 * Must be registered AFTER all routes and other middleware.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const isDev = process.env.NODE_ENV === 'development';

  // ── Operational / known errors ──────────────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(isDev && { details: { stack: err.stack } }),
    });
    return;
  }

  // ── Multer errors ───────────────────────────────────────────────────────────
  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File is too large. Maximum allowed size is 10 MB.',
      LIMIT_UNEXPECTED_FILE:
        'Unexpected field name. Use "file" as the multipart field name.',
      LIMIT_FILE_COUNT: 'Too many files uploaded. Only one file is allowed.',
      LIMIT_FIELD_COUNT: 'Too many fields in the form.',
      LIMIT_PART_COUNT: 'Too many parts in the multipart request.',
      LIMIT_FIELD_VALUE: 'Field value is too long.',
      LIMIT_FIELD_KEY: 'Field name is too long.',
    };

    res.status(400).json({
      error: messages[err.code] ?? `Upload error: ${err.message}`,
      ...(isDev && { details: { multerCode: err.code } }),
    });
    return;
  }

  // ── Zod validation errors ───────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(422).json({
      error: 'Response validation failed.',
      details: {
        errors: err.flatten().fieldErrors,
        ...(isDev && { stack: err.stack }),
      },
    });
    return;
  }

  // ── Unhandled / unexpected errors ───────────────────────────────────────────
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(isDev && { details: { stack: err.stack } }),
  });
};
