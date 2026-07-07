import { z } from 'zod';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const CrmStatusSchema = z.enum([
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
  '',
]);

export const DataSourceSchema = z.enum([
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
  '',
]);

export type CrmStatus = z.infer<typeof CrmStatusSchema>;
export type DataSource = z.infer<typeof DataSourceSchema>;

// ── CRM Record ────────────────────────────────────────────────────────────────

/**
 * A successfully extracted and validated CRM record.
 * All fields are optional — the AI maps what it can confidently identify.
 */
export const CrmRecordSchema = z.object({
  created_at: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  country_code: z.string().optional(),
  mobile_without_country_code: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  lead_owner: z.string().optional(),
  crm_status: CrmStatusSchema.optional(),
  crm_note: z.string().optional(),
  data_source: DataSourceSchema.optional(),
  possession_time: z.string().optional(),
  description: z.string().optional(),
});

export type CrmRecord = z.infer<typeof CrmRecordSchema>;

// ── Skipped Record ────────────────────────────────────────────────────────────

/**
 * A row that the AI determined could not be mapped to a valid CRM record,
 * or that failed post-extraction Zod validation.
 */
export const SkippedRecordSchema = z.object({
  skipped: z.literal(true),
  reason: z.string(),
  rawRow: z.record(z.string(), z.string()),
});

export type SkippedRecord = z.infer<typeof SkippedRecordSchema>;

// ── Failed Record ─────────────────────────────────────────────────────────────

/**
 * A batch that failed completely due to model errors/timeouts.
 */
export interface FailedRecord {
  row: Record<string, string>;
  error: string;
}

// ── Extraction result ─────────────────────────────────────────────────────────

export interface ExtractionResult {
  success: CrmRecord[];
  skipped: SkippedRecord[];
  failed: FailedRecord[];
}

// ── Internal: AI response envelope ───────────────────────────────────────────

/**
 * The model returns a top-level object with a "records" array.
 * Each element is either a CrmRecord or a SkippedRecord.
 */
export const AiResponseEnvelopeSchema = z.object({
  records: z.array(z.union([CrmRecordSchema, SkippedRecordSchema])),
});
