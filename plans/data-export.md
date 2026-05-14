# Koyta-Sathi — Data Export Procedure

**Audience:** Wysbryx engineering (and Aditi when forwarded). **Last updated:** 2026-05-09.

---

## TL;DR

The whole research point of this pilot is that Aditi exports the data and analyzes it. One admin-only API endpoint, one CSV-per-table dump to S3, one signed download URL. That's it.

```
POST /admin/export
Authorization: Bearer <Cognito JWT with custom:role = "admin">

→ 200 OK
{
  "exportId": "01HXPN...",
  "exportedAt": "2026-08-31T10:24:00Z",
  "downloadUrl": "https://s3.ap-south-1.amazonaws.com/.../export-01HXPN....zip?X-Amz-...",
  "expiresAt": "2026-09-01T10:24:00Z"
}
```

Trigger this from the admin app at `admin.wysbryxapp.com` (one button: "Export all data") or via curl with an admin JWT.

The `downloadUrl` returns a ZIP containing one CSV per table + a `manifest.json` listing what's inside. URL valid for 24h.

---

## Architecture

- One route on the single Lambda: `packages/api/src/routes/admin.ts` → `POST /admin/export`.
- Authorized via Hono `requireRole("admin")` middleware. Aditi's user record carries `custom:role = "admin"`; participants do not.
- Rate-limited 1 request per 5 minutes per principal (in-memory token bucket in the warm Lambda).
- Handler scans each Dynamo table (5 — small at this scale, full scan = pennies and seconds), formats as CSV, writes to a private S3 prefix, returns a signed URL.
- ZIP packaging done in-Lambda using `archiver` (stream-to-S3, no temp files).
- Slip photos are NOT in the export ZIP. They're in the `kothi-prod-slips` bucket; Aditi gets a separate signed-prefix-listing if she asks.

---

## CSV column shapes

Stable column ordering. **Adding columns: append to the end, never insert.** Aditi's analysis pipeline depends on column position.

### `users.csv`

| Column | Type | Notes |
|---|---|---|
| `participant_id` | string | hash of Cognito `sub`. Same identifier across all CSVs. |
| `first_name` | string | |
| `last_name` | string | |
| `village` | string | from village dropdown |
| `language_pref` | enum | `en` or `mr` |
| `created_at` | ISO8601 | when admin-created in Cognito |
| `last_seen_at` | ISO8601 | last successful API auth, or empty |

### `budget_state.csv`

One row per user. The wizard JSON blob is flattened into columns. Empty cell = user hasn't reached that step.

| Column | Type | Notes |
|---|---|---|
| `participant_id` | string | |
| `consent_accepted_at` | ISO8601 | |
| `recall_2024_pending_start_paise` | int | |
| `recall_2024_advance_taken_paise` | int | |
| `recall_2024_months_worked` | int | |
| `recall_2024_arrears_remaining_paise` | int | |
| `recall_2025_pending_start_paise` | int | |
| `recall_2025_advance_taken_paise` | int | |
| `recall_2025_months_worked` | int | |
| `recall_2025_arrears_remaining_paise` | int | |
| `quiz_score_correct` | int | 0-5 |
| `quiz_selected_options` | string | semicolon-joined list of option ids |
| `quiz_attempted_at` | ISO8601 | |
| `prioritization_completed_at` | ISO8601 | |
| `planned_advance_paise` | int | |
| `priority_categories_count` | int | how many categories the user listed |
| `priority_advance_paise` | int | sum of must-have amounts |
| `budget_pdf_generated_at` | ISO8601 | |

### `priority_categories.csv`

Long-format: one row per (user, category). Easier for Aditi to pivot than nested.

| Column | Type | Notes |
|---|---|---|
| `participant_id` | string | |
| `position` | int | 1-10, order user added them |
| `label` | string | user-typed category name |
| `amount_paise` | int | |
| `classification` | enum | `must`, `wait`, `unclassified` |

### `installments.csv`

| Column | Type | Notes |
|---|---|---|
| `participant_id` | string | |
| `amount_paise` | int | |
| `purpose` | string | one of {Food, Seeds, Health, Travel, Debt, Other} OR free text |
| `occurred_on` | YYYY-MM-DD | user-chosen, can be in the past |
| `logged_at` | ISO8601 | system-set |

### `tracker_onboarding.csv`

One row per user.

| Column | Type | Notes |
|---|---|---|
| `participant_id` | string | |
| `start_date` | YYYY-MM-DD | |
| `target_factory_name` | string | |
| `target_factory_village` | string | |
| `target_factory_taluka` | string | |
| `target_factory_district` | string | |
| `mukadam_name` | string | |
| `mukadam_phone_e164` | string | redacted in export — emit only last 4 digits |
| `migration_distance_days` | int | |
| `koyta_type` | enum | `full` or `half` |
| `advance_taken_this_year_paise` | int | |
| `outstanding_last_year_paise` | int | |
| `total_advance_paise` | int | |
| `full_koyta_men` | int | |
| `full_koyta_women` | int | |
| `half_koyta_men` | int | |
| `half_koyta_women` | int | |
| `boys_helping` | int | |
| `girls_helping` | int | |
| `vehicle_type` | enum | `truck`, `tractor`, `bullock_cart`, `chakda` |
| `tons_per_vehicle` | decimal | |

### `daily_records.csv`

| Column | Type | Notes |
|---|---|---|
| `participant_id` | string | |
| `occurred_on` | YYYY-MM-DD | |
| `day_type` | enum | `working_day`, `in_transit`, `phad_reached`, `at_phad_no_work`, `journey_started` |
| `factory_name` | string | |
| `village` | string | |
| `district` | string | |
| `start_time` | HH:MM | empty if not working day |
| `end_time` | HH:MM | empty if not working day |
| `vehicles_filled` | int | empty if not working day |
| `per_day_toli_override_json` | string | JSON or empty; the override blob if user provided one |
| `wages_earned_toli_paise` | int | computed at write-time |
| `wages_earned_koyta_paise` | int | computed at write-time |
| `logged_at` | ISO8601 | |

### `slips.csv`

Metadata only. Photos stay in S3 and require a separate signed-listing if Aditi wants them.

| Column | Type | Notes |
|---|---|---|
| `participant_id` | string | |
| `slip_id` | string | ULID |
| `s3_key` | string | path within `kothi-prod-slips`; usable to construct a signed URL |
| `captured_at` | ISO8601 | |
| `voucher_date` | YYYY-MM-DD | user-provided, or empty |
| `factory_name` | string | user-provided, or empty |
| `voucher_amount_paise` | int | user-provided, or empty |

### `events.csv`

Engagement events. One row per event. See `architecture.md` "Events" section for the taxonomy.

| Column | Type | Notes |
|---|---|---|
| `participant_id` | string | |
| `event_id` | string | ULID |
| `type` | string | one of the standard taxonomy values, e.g. `wizard_step_completed` |
| `payload_json` | string | small JSON blob, type-specific (e.g. `{"step":4}`) |
| `app` | enum | `budget`, `tracker`, `admin` |
| `occurred_at` | ISO8601 | client clock (worker's phone) |
| `received_at` | ISO8601 | server clock when the batch flushed |

---

## Manifest

Each export ZIP includes a `manifest.json`:

```
{
  "exportId": "01HXPN...",
  "exportedAt": "2026-08-31T10:24:00Z",
  "exportedBy": "aditibhowmick@g.harvard.edu",
  "stage": "prod",
  "schemaVersion": 1,
  "files": [
    { "name": "users.csv", "rows": 20 },
    { "name": "budget_state.csv", "rows": 20 },
    { "name": "priority_categories.csv", "rows": 137 },
    { "name": "installments.csv", "rows": 412 },
    { "name": "tracker_onboarding.csv", "rows": 20 },
    { "name": "daily_records.csv", "rows": 1840 },
    { "name": "slips.csv", "rows": 88 },
    { "name": "events.csv", "rows": 6420 }
  ]
}
```

**`schemaVersion` matters.** If we ever change a CSV's columns mid-pilot (we shouldn't, but if we do), bump this and tell Aditi.

---

## Pseudonymisation

`participant_id` = `SHA256(userId + EXPORT_SALT)` truncated to 16 hex chars. The salt is in SST `Config.Secret`, not in the repo.

Aditi gets a **separate participant-id-mapping file** delivered out-of-band (email, not the export endpoint) listing `participant_id ↔ first_name + last_name + village + login_alias`. The login alias is the auto-generated `participant-NN@wysbryxapp.com`; Aditi cross-references against the facilitator's printed credential sheet to map to real workers when she needs to. The export ZIP itself stays pseudonymised.

The mapping file is generated by a separate one-shot Lambda invoked manually by Krishna at pilot end. Not part of the regular export.

---

## Slip-photo download (separate flow)

If Aditi wants the slip photos:

1. She emails Krishna asking for the slip-photo bundle.
2. Krishna runs `pnpm tsx scripts/dump-slips.ts --stage prod`.
3. The script generates a signed URL per slip, packages a `slip-urls.csv` (`slip_id, signed_url, expires_at`) plus a manifest, ZIPs it, uploads to S3, returns a signed download URL.
4. Krishna emails the URL to Aditi. URL valid 7 days.
5. Aditi downloads the manifest + uses any HTTP client to fetch each slip via its signed URL.

Why this flow: slip photos are biometric PII; we don't want them in the regular export ZIP that anyone with admin access can pull. Manual handoff = explicit auditable step.

---

## How Aditi runs an export

1. She logs in to `admin.wysbryxapp.com` via her Cognito credentials (her user has `custom:role = "admin"`).
2. The admin app's "Export" page renders a single button: "Export all data."
3. Click → frontend calls `POST /admin/export` with her JWT → gets back the signed URL → starts the download.
4. She unzips locally, opens CSVs in her tool of choice (R, Stata, Python).

If the rate limit kicks in (she clicked twice within 5 min): friendly error message. The previous export's signed URL is still valid; she can re-download from her browser history.

---

## How Krishna verifies the export works

Before pilot starts:

1. Seed `dev` with 3 fake users via the admin-create endpoint.
2. Have each fake user complete the budget wizard, log a few daily records, upload one slip.
3. Run the export. Download the ZIP. Open every CSV. Confirm column ordering, types, and no PII in places it shouldn't be.
4. Pipe one CSV through R / pandas / Excel and confirm it parses cleanly (no quote-escaping issues, no header drift).
5. If anything is off: fix in `packages/api/src/handlers/admin-export.ts` and re-test. Don't fix in client code — the column format is the contract.

---

## Reports beyond the standard export

The CSV export above is the **rough cohort dump** Aditi takes home for her own analysis. For ad-hoc reports — both for Aditi during the pilot and for Wysbryx admins — we want a simple in-Lambda reporting story that doesn't require us to spin up a SQL warehouse for 20 users.

### The take

**SQL is not magic. Reports are just `iterate → group → aggregate → format`.** For 20 users × 60 days × ~30 records/day = ~36,000 items total, *full table scans cost pennies and complete in single-digit seconds*. Anything we'd write in SQL we can write in 30 lines of TypeScript. So:

### What we use

- **`@aws-sdk/lib-dynamodb` `paginateScan`** — handles pagination automatically. Stream items, accumulate, done.
- **Plain TypeScript** for the `group → aggregate` step. `Map<string, number>` for counters; `array.reduce` for sums. No library.
- **`papaparse`** (~50KB) when we need to emit CSV; the same library Aditi's R/pandas tooling reads cleanly.
- **`@react-pdf/renderer`** (already in the project) when a report needs to be a PDF — e.g. the season-end summary per worker.
- **DuckDB-WASM** if and only if a report turns out to be too gnarly to express imperatively — it can read the export ZIP's CSVs and run real SQL in the browser, server-free. Reserved for v2; we won't need it in v1.

### Pattern (drop-in template for any report Lambda route)

```ts
// packages/api/src/lib/reports.ts
import { paginateScan } from "@aws-sdk/lib-dynamodb";
import { ddb } from "./dynamo";

export async function scanAll<T>(table: string): Promise<T[]> {
  const out: T[] = [];
  for await (const page of paginateScan({ client: ddb }, { TableName: table })) {
    out.push(...((page.Items ?? []) as T[]));
  }
  return out;
}

// Example: report — for each user, count working-day records and sum koyta wages.
export async function repaymentByUser() {
  const records = await scanAll<DailyRecord>("kothi-prod-daily_records");
  const summary = new Map<string, { workingDays: number; wagesPaise: number }>();
  for (const r of records) {
    if (r.dayType !== "working_day") continue;
    const cur = summary.get(r.userId) ?? { workingDays: 0, wagesPaise: 0 };
    cur.workingDays += 1;
    cur.wagesPaise += r.wagesEarnedKoytaPaise ?? 0;
    summary.set(r.userId, cur);
  }
  return [...summary.entries()].map(([userId, s]) => ({ userId, ...s }));
}
```

That's the entire pattern. Every report we'll need fits this shape.

### Routes

Add to `apps/api/src/routes/admin.ts`:

| Method | Path | Returns |
|---|---|---|
| `GET /admin/reports/cohort-overview` | participants × {budget completion %, days logged, slips uploaded, debt remaining} | JSON |
| `GET /admin/reports/funnel` | engagement funnel: per-event-type counts and percentages of cohort. Computed from `events` table. | JSON |
| `GET /admin/reports/repayment-progress` | per-user wages-vs-advance over time | JSON |
| `GET /admin/reports/daily-activity` | per-day count of records logged across the cohort | JSON |
| `GET /admin/reports/season-summary/:userId.pdf` | one worker's season summary as a PDF | PDF |

The admin app has a "Reports" tab listing these; Aditi (admin role) sees them too.

### Why not a real warehouse / Athena / Redshift / etc.

- **Athena over the export S3 bucket** is technically free-ish, but adds query syntax, schema management, and an extra IAM surface. For 36k rows total we're paying ceremony for nothing.
- **Redshift** is a five-figure-a-year commitment for a 60-day pilot. Absurd.
- **Aurora Serverless** would be the "least bad" SQL option but requires us to ETL Dynamo → Aurora, which is the kind of operational debt we explicitly came here to avoid.
- **DynamoDB → S3 export → DuckDB-WASM in the admin app** is the v2 escape hatch if reports get genuinely complex. DuckDB reads CSVs from a fetch URL and runs real SQL with zero backend. We don't need this in v1.

### What this means for the pilot

We **don't write reports speculatively**. We wait for Aditi or Praveen to ask "can I see X?", then write a 30-line route, deploy it, ship. By the time the pilot ends, we'll have ~5 report routes total. Each one ~1 hour of work.

---

## Open questions for Aditi (not engineering blockers)

These can be resolved in a 10-minute call before May 26.

1. **`participant_id` format:** is 16-hex-char OK, or does her pipeline want something specific (e.g. zero-padded integer, UUID)?
2. **Long vs wide format for `priority_categories.csv`:** we picked long. Confirm this matches her pipeline.
3. **`mukadam_phone_e164` redaction:** OK to redact to last 4 digits, or does she need the full number for follow-up?
4. **Column for `consent text version` in `users.csv`:** if we ever update the consent wording mid-pilot, do we need to track which version each user accepted? Probably yes — flag this to discuss.
5. **Frequency:** does she want to pull weekly during the pilot, or only at the end? Affects nothing operationally; just useful to know.
