import { Router, IRouter } from 'express';
import { rateLimit } from 'express-rate-limit';
import { csvUpload } from '../middleware/csvUpload.middleware';
import { uploadCsv, importCsv } from '../controllers/csv.controller';

export const csvRouter: IRouter = Router();

/**
 * @route   POST /api/csv/upload
 * @desc    Upload a .csv file and receive parsed headers + rows as JSON
 * @access  Public
 * @body    multipart/form-data — field name: "file"
 */
csvRouter.post('/upload', csvUpload.single('file'), uploadCsv);

/**
 * Rate limiting for the AI extraction endpoint to prevent abuse.
 * Limits to 5 requests per minute per IP.
 */
const importLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    message: 'Too many import requests from this IP, please try again after a minute',
  },
});

/**
 * @route   POST /api/csv/import
 * @desc    Process parsed CSV data through AI extraction
 * @access  Public
 * @body    application/json — { headers: string[], rows: Record<string, string>[] }
 */
csvRouter.post('/import', importLimiter, importCsv);

/**
 * @route   POST /api/csv/import/retry
 * @desc    Retry AI extraction specifically for failed rows
 * @access  Public
 * @body    application/json — { headers: string[], rows: Record<string, string>[] }
 */
csvRouter.post('/import/retry', importLimiter, importCsv);
