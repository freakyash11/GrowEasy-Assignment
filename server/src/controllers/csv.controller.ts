import { Request, Response, NextFunction } from 'express';
import { parseCsvBuffer } from '../services/csvParser.service';
import { CsvUploadResponseSchema } from '../types/csv';
import { BadRequestError } from '../types/errors';

/**
 * POST /api/csv/upload
 *
 * Expects a multipart/form-data request with a single field named "file".
 * Returns the parsed CSV as JSON: { headers, rows, rowCount }.
 */
export const uploadCsv = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // Multer attaches the file to req.file; guard against missing upload
    if (!req.file) {
      throw new BadRequestError(
        'No file provided. Send a .csv file in the "file" field of a multipart/form-data request.',
      );
    }

    const parsed = parseCsvBuffer(req.file.buffer, req.file.originalname);

    // Validate the response shape with Zod before sending
    const validated = CsvUploadResponseSchema.parse(parsed);

    res.status(200).json({
      success: true,
      data: validated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/csv/import
 *
 * Expects a JSON body: { headers, rows }.
 * Calls the AI extraction service and logs the time taken.
 */
import { extractCrmRecords } from '../services/aiExtractionService';
import { CsvImportRequestSchema } from '../types/csv';
import { logger } from '../utils/logger';

export const importCsv = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const start = Date.now();
    
    // Validate request body
    const body = CsvImportRequestSchema.parse(req.body);
    
    // Extract CRM records via AI
    const result = await extractCrmRecords(body.rows, body.headers);
    
    const duration = Date.now() - start;
    logger.info(`AI Extraction completed in ${duration}ms for ${body.rows.length} rows`);
    
    res.status(200).json({
      success: result.success,
      skipped: result.skipped,
      failed: result.failed,
      totalImported: result.success.length,
      totalSkipped: result.skipped.length,
      totalFailed: result.failed.length,
      totalProcessed: body.rows.length,
    });
  } catch (err) {
    next(err);
  }
};
