import OpenAI from 'openai';
import { env } from '../utils/env';
import { createConcurrencyLimiter, withRetry } from '../utils/concurrency';
import {
  CrmRecordSchema,
  SkippedRecordSchema,
  AiResponseEnvelopeSchema,
  type CrmRecord,
  type SkippedRecord,
  type ExtractionResult,
} from '../types/crm';
import { AppError } from '../types/errors';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasValidContactInfo(rawRow: Record<string, string>): boolean {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  // Matches a sequence of 7-15 digits, optionally separated by spaces, dashes, or plus
  const phoneRegex = /(?:\+?(?:\d[\s-]*){7,15})/;

  for (const val of Object.values(rawRow)) {
    if (!val) continue;
    if (emailRegex.test(val)) return true;
    if (phoneRegex.test(val)) return true;
  }
  return false;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * openrouter/auto — OpenRouter's intelligent router that picks the best
 * available model for each request. Override via OPENROUTER_MODEL env var
 * if you want to pin to a specific model (e.g. "google/gemini-2.5-flash-lite").
 */
const MODEL = process.env.OPENROUTER_MODEL ?? 'openrouter/auto';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

// ── Lazy OpenAI client (created on first use) ─────────────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;

  if (!env.OPENROUTER_API_KEY) {
    throw new AppError(
      'OPENROUTER_API_KEY is not set. Add it to your .env file to use AI extraction.',
      503,
    );
  }

  _client = new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      'HTTP-Referer': 'https://groweasy.app',
      'X-Title': 'GrowEasy CRM',
    },
  });

  return _client;
}

// ── Prompt builders ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a data extraction AI that maps arbitrary CSV rows to a fixed CRM schema for a real-estate leads platform called GrowEasy.

## CRM Schema Fields
Map each CSV row to an object with these exact keys (all optional — omit or use empty string if not confidently mappable):
- created_at        : timestamp the lead was captured (ISO string parseable by new Date() in JS)
- name              : full name of the lead
- email             : primary email address
- country_code      : phone country code, digits only, no "+" (e.g. "91" for India)
- mobile_without_country_code : phone number without country code, digits only
- company           : company or employer name
- city              : city of the lead
- state             : state / province
- country           : country name
- lead_owner        : assigned sales owner or agent name (if present)
- crm_status        : one of: GOOD_LEAD_FOLLOW_UP | DID_NOT_CONNECT | BAD_LEAD | SALE_DONE | "" — see CRM_STATUS rule below
- crm_note          : catch-all for extra info — overflow emails, extra phones, remarks, ambiguous columns
- data_source       : one of: leads_on_demand | meridian_tower | eden_park | varah_swamy | sarjapur_plots | "" — see DATA_SOURCE rule below
- possession_time   : expected possession/handover date or timeframe (as a string)
- description       : any remaining descriptive text about the lead's interest or requirements

## Rules
1. CRM_NOTE CONSTRUCTION: Build crm_note by combining ALL applicable pieces below, in this order, separated by " | ":
   - 1st: The original remarks/notes text from the source row, lightly cleaned but not summarized away. NEVER drop this even if other pieces also apply.
   - 2nd: Any additional email addresses beyond the first, prefixed "Extra email: ".
   - 3rd: Any additional phone numbers beyond the first, prefixed "Extra phone: ".
   - 4th: Any other useful info that doesn't fit a structured field.
   Example: if a row has remarks "Site visit done; wants payment plan details" AND a secondary phone number "9766554400", the correct crm_note is: "Site visit done; wants payment plan details | Extra phone: 9766554400". NOT just "Extra phone: 9766554400" — the original remarks must never be silently dropped.
2. PHONE PARSING: Strip leading "+" and country code digits from mobile numbers. Common country codes: 91 (India), 1 (US/CA), 44 (UK). Store only the local number.
3. SKIP RULE: If a row has neither an email nor a mobile number, output a skip object instead of a CRM record.
4. CASING: Normalise names to Title Case. Keep emails lowercase. Keep phone digits only.
5. CRM_STATUS RULE — read carefully, this is a common failure point:
   - GOOD_LEAD_FOLLOW_UP is NOT a default for "lead seems engaged" or "lead has preferences/interest." It requires an explicit statement that a follow-up is happening or was requested — not just general interest, property preferences, or visit notes.
   - Only set crm_status when the text contains clear outcome/action language:
     * GOOD_LEAD_FOLLOW_UP: explicit follow-up requested/scheduled (e.g. "call back after 6pm", "wants payment plan details", "second visit scheduled")
     * DID_NOT_CONNECT: explicit failed contact attempt (e.g. "was busy", "no response", "unreachable")
     * BAD_LEAD: explicit disinterest/rejection (e.g. "not interested", "not a fit")
     * SALE_DONE: explicit deal closure (e.g. "deal closed", "booking confirmed")
   - If the note only describes buyer preferences, visit details, or general interest with no clear action/outcome stated, leave crm_status as "" — this is the correct default, not a fallback of last resort.
   - WRONG: note = "First-time buyer; interested in subsidy scheme" → crm_status = "GOOD_LEAD_FOLLOW_UP" (interest alone is not a status signal — reject this pattern)
   - RIGHT: note = "First-time buyer; interested in subsidy scheme" → crm_status = "" (no explicit action/outcome stated)
   - RIGHT: note = "Second visit scheduled; comparing with competitor" → crm_status = "GOOD_LEAD_FOLLOW_UP" (explicit scheduled follow-up — this one IS a valid signal)
6. BLANK COLUMNS: Ignore columns with empty headers ("").
7. DATES: Normalise any date-like value in \`created_at\` to ISO 8601 format. If the year is ambiguous, assume the current century.
8. DATA_SOURCE RULE — read carefully, this is a common failure point:
   - The allowed values are: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots.
   - These are five specific, equally-weighted internal codes. None of them is a "general" or "default" category — leads_on_demand is NOT a catch-all for leads you're unsure about, it refers to a specific named source just like the other four.
   - Only output one of these five values if the row's campaign_name, project name, or source column contains a clear, literal textual match (exact or near-exact) to one of these five terms.
   - If the row's source/campaign information does not literally reference one of these five terms, output an empty string ("") for data_source — even if the row clearly has SOME marketing campaign or lead source mentioned. A named campaign like "Summer Home Loan 2024" or "Mumbai Property Fair Q2" does NOT match any of the five allowed values and must result in a blank data_source, full stop.
   - WRONG: campaign_name = "Summer Home Loan 2024" → data_source = "leads_on_demand" (this is a fabricated match — reject this pattern)
   - RIGHT: campaign_name = "Summer Home Loan 2024" → data_source = "" (no literal match exists, so leave blank; the campaign name itself still goes into crm_note)

## Output Format
Respond ONLY with a valid JSON object — no markdown fences, no preamble, no explanation.
Use exactly this top-level shape:
{
  "records": [ ... ]
}

Each element in "records" is EITHER:
- A CRM record object (with the fields listed above), OR
- A skip object: { "skipped": true, "reason": "<short explanation>", "rawRow": { ...original row... } }

One output element per input row, in the same order.`;

function buildUserMessage(
  headers: string[],
  rows: Record<string, string>[],
): string {
  return `CSV Headers: ${JSON.stringify(headers)}

Rows to extract (${rows.length} total):
${JSON.stringify(rows, null, 2)}`;
}

// ── Batch processor ───────────────────────────────────────────────────────────

/**
 * Sends a single batch of rows to the AI and returns extracted records.
 * Validates each record with Zod — invalid records are moved to `skipped`.
 */
async function processBatch(
  client: OpenAI,
  headers: string[],
  rows: Record<string, string>[],
  batchIndex: number,
  stats: { correctedCount: number },
): Promise<ExtractionResult> {
  let rawText = '';
  try {
    rawText = await withRetry(
      async () => {
        const response = await client.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserMessage(headers, rows) },
          ],
          temperature: 0.1, // Low temperature for deterministic extraction
          max_tokens: 4000, // Prevent response cutoff
        });

        const contentText = response.choices[0]?.message?.content;
        if (!contentText) {
          throw new Error('Empty response from AI model');
        }

        let cleanText = contentText.trim();
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
        }
        
        return cleanText;
      },
      MAX_RETRIES,
      RETRY_BASE_DELAY_MS,
    );
  } catch (err: any) {
    console.error(`[AI] Batch ${batchIndex}: Failed after retries: ${err.message}`);
    return {
      success: [],
      skipped: [],
      failed: rows.map((rawRow) => ({
        row: rawRow,
        error: err.message || 'AI request failed after retries',
      })),
    };
  }

  // ── Parse envelope ────────────────────────────────────────────────────────
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error(`[AI] Batch ${batchIndex}: Failed to parse JSON response`);
    console.error('Raw response was:', rawText);
    // Treat entire batch as skipped
    return {
      success: [],
      skipped: rows.map((rawRow) => ({
        skipped: true as const,
        reason: 'ai_response_parse_failed',
        rawRow,
      })),
      failed: [],
    };
  }

  const envelope = AiResponseEnvelopeSchema.safeParse(parsed);
  if (!envelope.success) {
    console.error(
      `[AI] Batch ${batchIndex}: Response envelope validation failed`,
      envelope.error.flatten(),
    );
    return {
      success: [],
      skipped: rows.map((rawRow) => ({
        skipped: true as const,
        reason: 'ai_response_envelope_invalid',
        rawRow,
      })),
      failed: [],
    };
  }

  // ── Classify each record ──────────────────────────────────────────────────
  const success: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  for (let i = 0; i < envelope.data.records.length; i++) {
    const record = envelope.data.records[i];
    const rawRow = rows[i] ?? {};
    const hasContact = hasValidContactInfo(rawRow);

    // Check if it's a skip object
    const skipParsed = SkippedRecordSchema.safeParse(record);
    if (skipParsed.success) {
      if (hasContact) {
        console.warn(`[AI] Batch ${batchIndex}, record ${i}: AI skipped a row with valid contact info. Reason given: "${skipParsed.data.reason}".`, rawRow);
      }
      skipped.push(skipParsed.data);
      continue;
    }

    // Try to validate as a CRM record
    const crmParsed = CrmRecordSchema.safeParse(record);
    if (crmParsed.success) {
      if (!hasContact) {
        // Safety net triggered!
        skipped.push({
          skipped: true,
          reason: 'missing_contact_info_corrected',
          rawRow,
        });
        stats.correctedCount++;
      } else {
        success.push(crmParsed.data);
      }
    } else {
      console.warn(
        `[AI] Batch ${batchIndex}, record ${i}: Zod validation failed — moving to skipped`,
        crmParsed.error.flatten().fieldErrors,
      );
      skipped.push({
        skipped: true,
        reason: `validation_failed: ${JSON.stringify(crmParsed.error.flatten().fieldErrors)}`,
        rawRow,
      });
    }
  }

  return { success, skipped, failed: [] };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Extracts CRM records from arbitrary CSV rows using the AI model.
 *
 * - Splits rows into batches of BATCH_SIZE (default 20, configurable via env)
 * - Runs at most MAX_CONCURRENCY (default 3) batches concurrently
 * - Retries each batch up to MAX_RETRIES times on transient failures
 * - Validates each record with Zod; validation failures go to `skipped`
 *
 * @param rows    - Parsed CSV rows as key-value objects (from csvParser.service)
 * @param headers - The original CSV header row
 * @returns       - { success: CrmRecord[], skipped: SkippedRecord[] }
 */
export async function extractCrmRecords(
  rows: Record<string, string>[],
  headers: string[],
): Promise<ExtractionResult> {
  if (rows.length === 0) {
    return { success: [], skipped: [], failed: [] };
  }

  const client = getClient();
  const batchSize = env.BATCH_SIZE;
  const maxConcurrency = env.MAX_CONCURRENCY;

  // ── Chunk rows into batches ───────────────────────────────────────────────
  const batches: Array<Record<string, string>[]> = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  console.log(
    `[AI] Extracting ${rows.length} rows in ${batches.length} batch(es) ` +
      `(size=${batchSize}, concurrency=${maxConcurrency})`,
  );

  // ── Run batches with limited concurrency ──────────────────────────────────
  const limit = createConcurrencyLimiter(maxConcurrency);
  const stats = { correctedCount: 0 };

  const batchResults = await Promise.all(
    batches.map((batch, idx) =>
      limit(() => {
        console.log(
          `[AI] Starting batch ${idx + 1}/${batches.length} (${batch.length} rows)`,
        );
        return processBatch(client, headers, batch, idx + 1, stats);
      }),
    ),
  );

  // ── Aggregate across all batches ──────────────────────────────────────────
  const result: ExtractionResult = { success: [], skipped: [], failed: [] };

  for (const batchResult of batchResults) {
    result.success.push(...batchResult.success);
    result.skipped.push(...batchResult.skipped);
    result.failed.push(...batchResult.failed);
  }

  console.log(
    `[AI] Extraction complete — ${result.success.length} extracted, ${result.skipped.length} skipped, ${result.failed.length} failed`,
  );
  console.log(`[AI] AI safety check: ${stats.correctedCount} records reclassified from success->skipped`);

  return result;
}
