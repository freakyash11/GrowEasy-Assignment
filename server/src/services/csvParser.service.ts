import { parse } from 'csv-parse/sync';
import { AppError, BadRequestError } from '../types/errors';
import type { ParsedCsv } from '../types/csv';

/**
 * Parses a CSV buffer into headers, rows, and rowCount.
 *
 * Throws:
 *  - BadRequestError (400) for empty files, malformed CSV
 *  - AppError (400)  for CSVs with no data rows
 *
 * @param buffer - Raw file buffer from multer memory storage
 * @param originalname - Original filename (used in error messages)
 */
export function parseCsvBuffer(
  buffer: Buffer,
  originalname: string,
): ParsedCsv {
  const content = buffer.toString('utf-8').trim();

  if (!content) {
    throw new BadRequestError('The uploaded CSV file is empty.');
  }

  let records: string[][];

  try {
    records = parse(content, {
      trim: true,
      skip_empty_lines: true,
      relax_column_count: false,
    }) as string[][];
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new BadRequestError(
      `Malformed CSV — could not parse "${originalname}": ${detail}`,
    );
  }

  if (records.length === 0) {
    throw new BadRequestError('The CSV file contains no parseable rows.');
  }

  // First row is the header
  const [headerRow, ...dataRows] = records;
  const headers = headerRow.map((h) => h.trim());

  if (headers.length === 0) {
    throw new AppError('CSV header row is empty.', 400);
  }

  // Map each data row to a { header: value } object
  const rows: Record<string, string>[] = dataRows.map((row, rowIndex) => {
    if (row.length !== headers.length) {
      throw new BadRequestError(
        `Row ${rowIndex + 2} has ${row.length} column(s) but the header has ${headers.length}. ` +
          `All rows must have the same number of columns.`,
      );
    }

    return Object.fromEntries(
      headers.map((header, colIndex) => [header, row[colIndex] ?? '']),
    );
  });

  return {
    headers,
    rows,
    rowCount: rows.length,
  };
}
