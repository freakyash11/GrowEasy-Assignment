// server/src/scripts/testExtraction.ts
import fs from "fs";
import { parse } from "csv-parse/sync";

// Force a known-good model for the test script to avoid openrouter/auto routing to a non-JSON-capable model
process.env.OPENROUTER_MODEL = 'google/gemini-2.5-flash-lite';

import { extractCrmRecords } from "../services/aiExtractionService";

void (async () => {
  const csvContent = fs.readFileSync("./sample-data/manual_spreadsheet.csv", "utf-8");
  const rows = parse(csvContent, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const headers = Object.keys(rows[0] ?? {});

  const result = await extractCrmRecords(rows, headers);
  fs.writeFileSync("./test-output.json", JSON.stringify(result, null, 2));
  console.log(`✅ Success: ${result.success.length}, ⏭ Skipped: ${result.skipped.length}`);
  console.log("Output written to test-output.json");
})();