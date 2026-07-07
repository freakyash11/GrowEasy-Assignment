import { z } from 'zod';

// ── Zod schema ────────────────────────────────────────────────────────────────

/**
 * Validates the shape of a successful CSV parse response.
 * Used both server-side (before sending) and can be imported
 * by the client to validate the API response.
 */
export const CsvUploadResponseSchema = z.object({
  headers: z.array(z.string()).min(1, 'CSV must have at least one header'),
  rows: z.array(z.record(z.string(), z.string())),
  rowCount: z.number().int().nonnegative(),
});

export const CsvImportRequestSchema = z.object({
  headers: z.array(z.string()).min(1, 'Missing headers array'),
  rows: z.array(z.record(z.string(), z.string())).min(1, 'Rows cannot be empty'),
});

// ── Derived TypeScript types ──────────────────────────────────────────────────

export type CsvUploadResponse = z.infer<typeof CsvUploadResponseSchema>;

/**
 * Internal representation of a parsed CSV before Zod validation.
 */
export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}
