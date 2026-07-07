# GrowEasy AI CSV Importer

An AI-powered CRM CSV importer that intelligently maps arbitrary, unstructured lead exports to a strict, fixed CRM schema.

## Live Demo
- **Frontend URL:** [Placeholder: Add deployed frontend URL]
- **Backend URL:** [Placeholder: Add deployed backend URL]

## Screenshots
### Homepage
![Homepage Dashboard](placeholder_homepage.png)
### Upload Step
![Upload CSV View](placeholder_upload.png)
### Preview Data Step
![Data Preview View](placeholder_preview.png)
### Results & Skipped Rows
![Import Results View](placeholder_results.png)

## Features
- **Drag & Drop Upload:** Secure, typed CSV parsing with `react-dropzone` and strict size limits.
- **Data Preview Table:** Virtualization-friendly, sticky-header table for inspecting parsed CSV data seamlessly via `@tanstack/react-table`.
- **AI-Powered Field Mapping:** Uses OpenRouter / OpenAI SDK to map highly unstructured CSV columns to strict CRM enum values, names, and contact details.
- **Batch Processing & Retry:** Sequentially processes data in batches (configurable) to handle large exports while respecting AI rate limits. Includes a dedicated endpoint to manually retry just the failed batches.
- **Deterministic Skip Logic:** A strict post-processing safety layer verifies AI extraction outputs and re-classifies hallucinations (e.g. valid statuses with missing contact info) to Skipped rows.
- **Global Dark Mode:** Full Tailwind class-based dark mode toggle utilizing a session-bound in-memory React context.
- **Progress Indicators:** Estimated progress tracking and interactive status cycling during long-running AI extractions.

## Tech Stack
| Tier | Technology | Purpose |
|------|------------|---------|
| **Frontend** | Next.js (App Router) | Core React framework and routing |
| | TypeScript | End-to-end type safety |
| | Tailwind CSS | Utility-first styling & Dark Mode (`class`) |
| | `@tanstack/react-table` | Headless, accessible data grid |
| | `react-dropzone` | Drag-and-drop file upload interface |
| **Backend** | Node.js / Express | Robust API routing & middleware |
| | TypeScript | Strict types shared with client schemas |
| | `csv-parse` & `multer` | Fast, robust in-memory CSV parsing |
| | Zod | Runtime validation for API boundaries |
| | `openai` (OpenRouter) | LLM inference client for data extraction |

## Architecture Overview
The application handles imports via a stateless, step-based pipeline:

1. **Upload:** Client reads the CSV via dropzone and uploads it to `/api/csv/upload`.
2. **Parse & Preview:** Backend parses the CSV in-memory via `csv-parse` and returns raw JSON arrays (no AI yet). The Client renders this in a preview table.
3. **Confirm & Extract:** The user confirms the preview, and the Client sends the raw headers & rows to `/api/csv/import`. 
4. **AI Batch Processing:** The server chunks the rows into batches (e.g., 20/batch) and queries the LLM concurrently via OpenRouter with exponential backoff.
5. **Deterministic Validation:** The server runs a strict Regex safety check on the AI's output against the raw source row to catch missed contact info and correct false positives.
6. **Structured Results:** Returns a unified `success`, `skipped`, and `failed` payload which the Client renders in tabbed DataTables.

```text
[ Client (Next.js) ]                             [ Server (Express) ]                             [ AI (OpenRouter) ]
       |                                                  |                                                |
       |--- 1. POST /api/csv/upload (multipart CSV) ----->|                                                |
       |                                                  |--- 2. Parse CSV (multer + csv-parse)           |
       |<-- 3. Return JSON { headers, rows } -------------|                                                |
       |                                                  |                                                |
  (Preview Table)                                         |                                                |
       |                                                  |                                                |
       |--- 4. POST /api/csv/import (JSON rows) --------->|                                                |
       |                                                  |--- 5. Chunk into batches                       |
       |                                                  |--- 6. POST completion (Prompt + JSON) -------->|
       |                                                  |<-- 7. Return extracted JSON -------------------|
       |                                                  |--- 8. Run deterministic safety checks          |
       |<-- 9. Return { success, skipped, failed } -------|                                                |
       |                                                  |                                                |
  (Results Tab)                                           |                                                |
```

## Project Structure
```text
GrowEasy Assignment/
├── client/                     # Next.js Frontend
│   ├── app/                    # App router (pages, layouts, ThemeProvider)
│   ├── components/             # Reusable UI (CsvUpload, DataTable, Header)
│   ├── lib/                    # Utilities (tailwind-merge, clsx)
│   ├── types/                  # Shared domain types
│   ├── tailwind.config.js      # Styling configuration
│   └── .env.example            # Client env placeholders
└── server/                     # Node.js / Express Backend
    ├── sample-data/            # Test CSV exports (Google Ads, Facebook, etc.)
    ├── src/
    │   ├── controllers/        # Express route handlers
    │   ├── middleware/         # Rate limiting, Error boundaries, Multer config
    │   ├── routes/             # API routing
    │   ├── scripts/            # Standalone test/debug scripts (testExtraction.ts)
    │   ├── services/           # Core logic (aiExtractionService.ts)
    │   └── utils/              # Env validation, prompt definitions, logger
    └── .env.example            # Server env placeholders
```

## Setup Instructions

**Prerequisites:** Node.js (v18+) and `pnpm` must be installed.

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "GrowEasy Assignment"
   ```

2. **Setup the Server**
   ```bash
   cd server
   pnpm install
   cp .env.example .env
   ```
   **Configure server environment variables (`server/.env`):**
   - `PORT`: (default: 5000)
   - `OPENROUTER_API_KEY`: Get a free key at [OpenRouter](https://openrouter.ai/keys)
   - `BATCH_SIZE`: Number of rows per prompt (default: 20)
   - `MAX_CONCURRENCY`: Parallel LLM requests (default: 3)
   - `CLIENT_URL`: (default: http://localhost:3000) for CORS

3. **Setup the Client**
   ```bash
   cd ../client
   pnpm install
   cp .env.example .env
   ```
   **Configure client environment variables (`client/.env`):**
   - `NEXT_PUBLIC_API_URL`: Points to the backend (default: http://localhost:5000)

4. **Run the Development Servers**
   Open two terminals:
   
   **Terminal 1 (Server):**
   ```bash
   cd server
   pnpm dev
   ```
   *Verify the server is running by hitting `http://localhost:5000/api/health`.*

   **Terminal 2 (Client):**
   ```bash
   cd client
   pnpm dev
   ```
   *Access the frontend at `http://localhost:3000`.*

## API Documentation

### `GET /api/health`
- **Purpose:** Simple health check.
- **Response:** `{ "status": "ok", "timestamp": "..." }`
- **Example:**
  ```bash
  curl http://localhost:5000/api/health
  ```

### `POST /api/csv/upload`
- **Purpose:** Parses a multipart/form-data CSV file into raw JSON rows.
- **Request:** `multipart/form-data` containing a `file` field (.csv only, max 5MB).
- **Response:**
  ```json
  {
    "headers": ["Name", "Email", "Phone Number", "Lead Source"],
    "rows": [
      { "Name": "John Doe", "Email": "john@example.com", "Phone Number": "555-0100", "Lead Source": "FB" }
    ]
  }
  ```
- **Example:**
  ```bash
  curl -F "file=@./server/sample-data/basic_leads.csv" http://localhost:5000/api/csv/upload
  ```

### `POST /api/csv/import`
- **Purpose:** Kicks off AI-powered extraction matching arbitrary headers/values to the CRM schema.
- **Request:** `application/json` containing `headers` (string[]) and `rows` (Record<string, string>[]).
- **Response:**
  ```json
  {
    "success": [{ "first_name": "John", "last_name": "Doe", "email": "john@example.com", "phone": "555-0100", "data_source": "", "crm_status": "NEW" }],
    "skipped": [],
    "failed": [],
    "totalImported": 1,
    "totalSkipped": 0,
    "totalFailed": 0,
    "totalProcessed": 1
  }
  ```

### `POST /api/csv/import/retry`
- **Purpose:** Specifically retries rows that failed entirely due to network/LLM timeouts.
- **Request:** Same payload shape as `/api/csv/import`, but only passing the failed subsets.
- **Response:** Same shape as `/api/csv/import`.

## AI Prompt Engineering Notes
- **Batching Strategy:** Instead of passing 500 rows to the LLM at once (which guarantees lost context and token limit exhaustion) or 1 row at a time (which is agonizingly slow), we utilize a batched approach (20 rows per chunk) pushed through `p-limit` concurrency arrays.
- **Enum Rules:** The prompt is heavily instructed to return `""` (blank) for the `data_source` field unless the string *strictly* maps to a predefined literal (like `varah_swamy`). We explicitly forbid the LLM from "guessing" mapping for standard enums to maintain data integrity.
- **Multi-Contact Merging:** If a lead provides "Phone 1" and "Phone 2", the primary is extracted into `phone`/`email`, while the secondary fields are gracefully serialized into the `remarks` column.
- **Deterministic Safety Layer:** Because LLMs occasionally hallucinate a "success" record for a row with zero contact information, the `aiExtractionService` runs a post-processing Regex validation over the *original* raw row to verify the presence of an email/phone. If none exists, the backend deterministically re-classifies the row as `skipped`.

## Known Limitations / Trade-offs
- **Stateless by Design:** There is no persistent database. Uploads and extracted objects exist only in API memory and the client's React state. Refreshing the browser drops all data.
- **AI Determinism:** Even with `temperature=0` and aggressive prompt engineering, LLMs can be unpredictable on hyper-malformed edge cases.
- **Processing Time:** Processing large exports (500+ rows) requires multiple concurrent API requests. It may take 30-60 seconds depending on OpenRouter's upstream latency.

## Testing
The repository contains a `server/sample-data` folder filled with heavily fractured exports simulating real-world ad platforms (Facebook, Google Ads, missing headers, embedded commas, conflicting timezones).
You can quickly test the AI extraction rules against these datasets without booting the frontend by running the standalone Node script:
```bash
cd server
pnpm tsx src/scripts/testExtraction.ts sample-data/large_test.csv
```

## Deployment
- **Frontend:** [Placeholder: Deployed on Vercel]
- **Backend:** [Placeholder: Deployed on Render/Railway]

## License
MIT License.
