import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { BadRequestError } from '../types/errors';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Rejects any file that isn't text/csv or application/vnd.ms-excel (.csv).
 * The error is thrown synchronously so multer passes it to next(err).
 */
function csvFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  const allowedMimeTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    // curl.exe and some browsers send octet-stream for .csv; fall back to extension check
    'application/octet-stream',
  ];

  const hasCsvExtension = file.originalname.toLowerCase().endsWith('.csv');
  const isAllowedMime = allowedMimeTypes.includes(file.mimetype);

  if (isAllowedMime && hasCsvExtension) {
    cb(null, true);
  } else if (!hasCsvExtension) {
    cb(
      new BadRequestError(
        `Only .csv files are accepted. Received file: "${file.originalname}"`,
      ),
    );
  } else {
    cb(
      new BadRequestError(
        `Invalid file type "${file.mimetype}". Only .csv files are accepted.`,
      ),
    );
  }
}

/**
 * Multer instance configured for:
 *  - Memory storage (no disk writes)
 *  - 10 MB size limit
 *  - CSV MIME type filter
 */
export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: csvFileFilter,
});
