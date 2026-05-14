# Koyta-Sathi — Financial Tracking App: Project Requirements

**Audience:** Wysbryx engineering (Madhukar primary, Ayush assisting, Krishna on architecture, Praveen/Chinmaya on delivery).
**Status:** Working spec. Source of truth for build. Supersedes the pptx mockup wherever the two disagree.
**Last updated:** 2026-05-08
**Owner:** Wysbryx Engineering

---

## 1. Context (read this first or you will build the wrong thing)

The Tracking App is the **second of two apps** for the Harvard / SOPPECOM / Bhowmick research pilot. While the **Budgeting App** (separate spec) is used *once* before the season to plan, this app is used **every day during the cutting season** to log work, track wages, and reconcile against the advance taken from the *mukaddam* (labour contractor).

End users: ~20 sugarcane *koyta* cutters in Maharashtra (treatment group). Same cohort as the budgeting app — **same login, same user record.**

What this app actually does:
1. Onboard the worker with their **toli** (work-gang) composition, vehicle type, and total advance owed.
2. Let them log a **daily entry**: date, day status (harvesting / in transit / reached *phad* / no work), location, vehicles filled.
3. Auto-compute **wages earned that day** from vehicles filled × per-ton rate ÷ weighted koyta count.
4. Auto-compute **debt remaining** = total advance − cumulative wages.
5. Let them photograph **wage slips** (factory vouchers issued every ~15 days) for verification.
6. Provide a **downloadable PDF ledger** at season end (Aditi's "to add" item).

This is the *operationally heavier* of the two apps — daily use, photo capture, and arithmetic that workers will visibly check against the mukaddam's number. Get the math right.

### Hard constraints
- **Web app, responsive, mobile-first.** No native. Camera works fine via `<input type="file" capture="environment">` and `getUserMedia`.
- **English + Marathi.** Same i18n system as the budget app.
- **Same auth and same user record as the budget app.** A worker who completed onboarding in the budget app should land in the tracker fully recognized — no re-onboarding of name/village/phone. Tracker-specific onboarding (toli, vehicle, advance) is layered on top.
- **April 2027 data deletion.** Same lifecycle as the budget app.

### Schedule
The SOW lists **2026-06-30** for tracker-app testing readiness, but the real binding constraint is the SOPPECOM training schedule (which Aditi controls and we don't yet know). Treat the SOW date as **indicative**, not contractual. The tracker is built second, after the budget app is in Aditi's hands. The milestone trail in §12 is an indicative working sequence.

### Commercial context
SOW total = **5,998 USD**. Tracker-app testing milestone = **1,500 USD**. The renegotiated July payment of $1,000 is also tied to UAT sign-off (Aditi confirmed via email 2026-05-06). Schedule is flexible — quality wins over date.

---

## 2. The reference materials

| Artifact | Location | How to treat it |
|---|---|---|
| `mockup_tracking_app.pptx` (14 slides) | `_client-artifacts/` | **Visual reference** for the tracker UI: indigo accent, slate body, rounded cards, bottom-tab nav. Less polished than the budget mockup; treat the layout as illustrative. A `mockup_tracking_app.pdf` (libreoffice conversion) is alongside for easier viewing. |
| `tracker_app_code/` (vibe-coded prototype) | `_client-artifacts/` | Aditi's Google AI Studio prototype. **Better organised than the budget prototype** (10 component files, real types, localStorage persistence, AppContext). Mine it for: data shapes, screen breakdown, the wage formula. Do NOT inherit its persistence model (localStorage doesn't survive a phone reset and gives the research team nothing). |
| Slide 13 — **Wage Calculation Algorithm** | embedded in pptx | **Authoritative formula.** Reproduced below in §6.4. Per slide caption: "we can modify as needed" — confirm with Aditi before changing. |
| Slide 14 — **Features to be added** | embedded in pptx | Two extras Aditi flagged: per-day toli composition, downloadable PDF ledger. Both baked into this spec. |
| `wysbryz_sow.docx` | `_client-artifacts/` | Contractual milestones and payment schedule. |

---

## 3. Users, languages, accessibility

Identical to the budget app. See `project-requirements-budget-app.md` §3. The tracker has additional ergonomic demands because it's used **outdoors, in sunlight, by a tired worker at end of day**:

- High-contrast palette (the prototype's slate-on-cream may struggle in direct sunlight — visual-audit required).
- Number-pad inputs for all numeric fields (`inputmode="numeric"`).
- Large +/- steppers for "vehicles filled" — already a strength in the prototype, keep it.
- Date picker should default to **today** and *not* require typing.
- One-handed use: bottom navigation, FAB for the add-entry action — both already present in the prototype.

---

## 4. Tech stack

**See `architecture.md` for the source of truth.** Inherits from the budget app: same pnpm-workspace monorepo, same Vite + React + Tailwind v4 + PWA, same Wouter, same Cognito (admin-created users, AWS Amplify v6 frontend), same DynamoDB, same single-Lambda Hono backend on Node 22, same SST v3 IaC, same `ap-south-1` region, same CI/CD (GitHub Actions + AWS OIDC), same Sentry.

Tracker-specific additions:

- **Object storage for slip photos:** **AWS S3 in `ap-south-1`**, bucket per stage (`kothi-dev-slips`, `kothi-prod-slips`). `BlockPublicAccess: all`, SSE-S3, ACL disabled. Photos accessed via short-lived pre-signed URLs minted by the Lambda's `slips` route after `requireAuth` middleware validation (5-min upload, 1-hour download).
- **Image client-side compression** before upload via `browser-image-compression` — workers on patchy 4G. Target ~150 KB per slip, max edge 1600 px, JPEG.
- **PDF ledger:** **`@react-pdf/renderer` client-side, lazy-loaded**, same approach as the budget app PDF. Devanagari TTF cached separately, registered on first PDF open.

**One SPA, three shells.** The tracker is `<TrackerShell />` mounted by the bootstrap when hostname is `tracker.wysbryxapp.com` (or `dev.tracker.*`). Shared code in `packages/shared`; the single Hono Lambda in `packages/api`. One Cognito User Pool, one `users` table — same user record across budget, tracker, and admin shells.

### Prototype-derived warnings for the build

- The prototype (`_client-artifacts/tracker_app_code/`) uses `localStorage` via `AppContext.tsx` for state persistence. **In production, `localStorage` is a non-authoritative cache only** — the source of truth lives in DynamoDB via authenticated API calls. Use `localStorage` for offline-resilience-during-typing (e.g. holding form state if the network drops mid-save), nothing more.
- The prototype's componentization is good — lift the component shapes (`Dashboard.tsx`, `RecordEntry.tsx`, `RecordsList.tsx`, `SlipsView.tsx`, `ProfileView.tsx`, `Onboarding/SetupFlow.tsx`) as a starting layout.
- The prototype's wage formula matches §6.4 exactly. Lift the constants (`HARVESTING_RATES`, `DEFAULT_VEHICLE_CAPACITIES`) verbatim, but **store all money values as paise integers** (the prototype uses floats — don't).

---

## 5. Information architecture & flow

```
A. Welcome / Disclaimer            (skipped if user already onboarded via budget app)
B. Onboarding wizard
   B1. Profile          (skipped if already set)
   B2. Migration & Koyta details   (TRACKER-SPECIFIC)
   B3. Toli composition            (TRACKER-SPECIFIC)
   B4. Vehicle details             (TRACKER-SPECIFIC)
   B5. "All Set!" summary
C. Main app — bottom-tab nav
   C1. Home (Dashboard)
   C2. Ledger (Daily records list)
   C3. Slips (Wage slip photos)
   C4. Toli (Profile + toli + advance summary)
D. Modal: Add Daily Entry          (FAB on Home / Ledger)
E. Modal: Capture Wage Slip        (Slips tab → Upload)
F. Action: Download Season Ledger PDF   (from Profile or Home)
```

---

## 6. Screen-by-screen requirements

### 6.1 Welcome / Disclaimer
Same content shape as the budget app's welcome. **Show only if the user hasn't completed budget-app onboarding.** Otherwise, skip straight to §6.2 with a "Welcome back, *FirstName*" toast.

### 6.2 Onboarding — Profile (B1)
Same fields as the budget app: first name, last name, village (dropdown). The login alias (`participant-NN@wysbryxapp.com`) was set at admin-create time and the worker never re-encounters it. Skipped entirely if already in DB.

### 6.3 Onboarding — Migration & Koyta details (B2)
- **Type of Koyta:** Full / Half (toggle).
- **Advance taken this year (₹):** numeric input.
- **Outstanding from last year (₹):** numeric input.
- **Migration distance (days):** numeric input (default 1).
- **Target factory (optional now, can be set on first daily entry):** name, village, taluka, district.
- Total advance auto-computed and shown: `advance_this_year + outstanding_last_year`.

### 6.4 Onboarding — Toli composition (B3)
Six numeric inputs:
- Full Koytas (M)
- Full Koytas (W)
- Half Koytas (M)
- Half Koytas (W)
- Boys helping
- Girls helping

Display the computed **weighted koyta count** live (`fullM + fullW + 0.5*(halfM + halfW)`) so the worker can see what number their wages will be divided by — transparency matters here.

### 6.5 Onboarding — Vehicle details (B4)
- **Vehicle type:** chips for {Truck, Tractor, Bullock Cart, Chakda}.
- **Default tons-per-vehicle** is pre-filled per type (10, 3, 1, 2) — user can override.
- **Per-ton rate** is read-only here, derived from `vehicle_type` + the rate table (§6.4 rates), but display it so the worker sees what rate their wages are computed at.

### 6.6 Onboarding — "All Set!" (B5)
Big "Total Advance: ₹X" card. CTA: "Go to Ledger" → §6.7.

### 6.7 Home / Dashboard
Three cards stacked:
1. **Total Debt Remaining** (₹) — large, in warning red. Subtitle: "−₹X from last season" (the outstanding-last-year figure).
2. **Total Wages Earned** (₹) — green. Subtitle: "Tracked across N working days."
3. **Repayment Progress** — progress bar with `% repaid = wages_earned / total_advance`.

Below: 2×2 grid:
- **Efficiency:** tons/day average.
- **Toli Size:** total cutters (raw count, not weighted).
- **This Week's Wages:** sum of last 7 days' Koyta wages.
- **Days Worked This Week:** count of working_day entries last 7 days.

Floating "+" button → §6.10 (Add Daily Entry).

### 6.8 Ledger
Daily records list, newest first. Each row:
- Date (e.g. "Apr 30")
- Village / location
- Day type icon (truck for working, calendar for non-working)
- Vehicles filled (if working day)
- Wages earned that day (Koyta share, ₹) — green

Tap row → expand to show start/end times, factory name, full numbers, edit/delete actions.

Empty state: "No records yet — tap + to log your work."

Top-right: "Download PDF" button → §6.13.

### 6.9 Slips
- Header: "Wage Slips" + "Upload" CTA.
- Info banner: "Vouchers arrive every ~15 days. Take photos to verify your daily records."
- Grid (or list) of uploaded slips: thumbnail, factory name, date.
- Tap slip → full-screen view, with `Verify against ledger` action that highlights the date range the slip likely covers.

### 6.10 Add Daily Entry (modal/screen)
- **Date** — defaults to today; can pick past dates (rolling 30-day max in the picker, but allow override). Future dates blocked.
- **Factory & Location** — defaults to last entry's values; editable inline.
- **Day Status** — chips: {Harvesting, In Transit, Reached Phad, No Work, Journey Started}.
- If status == Harvesting:
  - **Start time** (default 07:00)
  - **End time** (default 18:00)
  - **Vehicles filled** — large +/- stepper (already great in the prototype).
  - **Per-day toli composition override** (Aditi delta — slide 14 #1): collapsed by default, expandable. Lets the worker say "today, only 6 of our 10 koytas worked." When provided, this overrides the onboarding toli for *that day only* in the wage division. Default = onboarding toli.
- Live preview: "Estimated wages today: ₹X" computed as the user types — see §6.4 formula.
- Save → closes modal, dashboard + ledger update.

### 6.11 Capture Wage Slip
- **Camera capture preferred:** `<input type="file" accept="image/*" capture="environment">` is the simplest cross-browser approach. `getUserMedia` for in-app preview if device supports it.
- Client-side compress to ~150 KB max, JPEG, max edge 1600 px.
- Upload to S3 via pre-signed URL; store metadata on a `slips` row.
- Optional fields after upload: factory name, slip date, voucher amount (worker can add later).

### 6.12 Toli (Profile)
- User name + village.
- Toli summary: total cutters, koyta type, full/half breakdown.
- Loan summary: advance taken, arrears, total initial debt.
- "To edit these details, contact the research coordinator" footer (per prototype).
- Buttons: **Switch language**, **Download Season Ledger PDF**, **Logout**, **Delete my data**.

### 6.13 Season Ledger PDF (Aditi delta — slide 14 #2)
- One-tap export.
- Contents:
  - Cover: user first+last name, village, factory, season, total advance, current debt remaining.
  - Summary stats: days worked, total wages, total tons, % repaid.
  - Day-by-day table: date, day type, vehicles, tons, toli wages, koyta wages.
  - Slips appendix: list of uploaded slip dates (no thumbnails — slip photos stay private and are exported separately to Aditi if needed; see `data-export.md`).

**Implementation:**
- **`@react-pdf/renderer`, client-side, lazy-loaded.** Same approach as the budget app PDF (§7.14 there).
- **Devanagari font:** Noto Sans Devanagari Regular fetched from `/fonts/NotoSansDevanagari-Regular.ttf` with `cache: "force-cache"` and `Font.register`'d on first PDF open. Re-uses the same font asset as the budget app (single `/fonts` directory in `packages/shared`).
- **No server-side PDF.** Lambda font-loading + `@react-pdf` cold-start would be a footgun; client-side at 20 users is free.
- For a long season (~150 working days), the day-by-day table will paginate. `@react-pdf` handles this natively.

---

### Event tracking inside the tracker flow

Per `architecture.md` "Events" section, the SPA fires `events.track(type, payload)` at every meaningful interaction. For the tracker shell:

| Where | `events.track(...)` call |
|---|---|
| Tracker shell mounts | `app_opened`, `{ subdomain: "tracker" }` (fired in bootstrap) |
| Welcome / disclaimer accepted | `tracker_onboarding_started` |
| Onboarding step `onNext` | `wizard_step_completed`, `{ wizard: "tracker_onboarding", step: N, stepName }` |
| "All Set!" final onboarding screen reached | `tracker_onboarding_completed` |
| Daily-record save | `daily_record_logged`, `{ dayType }` |
| Slip uploaded successfully | `slip_uploaded` |
| Season-ledger PDF generated | `pdf_generated`, `{ kind: "ledger" }` |
| Season-ledger PDF download button | `pdf_downloaded`, `{ kind: "ledger" }` |

The events client is fire-and-forget with a localStorage-backed retry queue. UI never blocks on `track()`.

---

## 6.4 Wage Calculation Algorithm (verbatim from pptx slide 13, with our notes)

This is **the** formula. Don't refactor it without Aditi's say-so.

```
# Inputs
vehicle_type           # Truck | Tractor | BullockCart | Chakda
tons_per_vehicle       # set during onboarding, can be overridden per day
vehicles_filled        # from the day's entry
toli                   # full_m, full_w, half_m, half_w (from onboarding,
                       # or per-day override if user provided one)

# Step 1 — Per-ton rate (₹), from SOPPECOM 2024 rates
RATE_PER_TON = {
  BullockCart: 318.20,
  Tractor:     366.01,   # also used for Chakda unless we get a separate number
  Chakda:      366.01,
  Truck:       408.41,
}

# Step 2 — Total Toli earnings for the day
tons_filled        = vehicles_filled * tons_per_vehicle
toli_earnings      = tons_filled * RATE_PER_TON[vehicle_type]

# Step 3 — Weighted koyta count
koyta_units = full_m + full_w + 0.5 * (half_m + half_w)

# Step 4 — Per-koyta wages
koyta_wages = toli_earnings / max(koyta_units, 1)

# Step 5 — Debt remaining (cumulative across all working days)
total_wages_earned   = sum(koyta_wages_per_day for each working day)
debt_remaining_koyta = total_advance - total_wages_earned
```

**Notes for Madhukar:**
- All money values stored as integers in **paise** (₹ × 100). Don't trust IEEE floats with debt math.
- The `0.5` weighting for half-koytas is per Aditi/SOPPECOM; do not "round up" or "round down" — store the exact computed value.
- "Boys helping" and "Girls helping" are tracked but **do not** enter the wage calc. They're informational for the research team.
- Surface the raw inputs and the computed numbers on the ledger row tap-expand so the worker can audit.

---

## 7. Data model (DynamoDB)

Three tables relevant to this app, plus the shared `users` table from the budget app. All keyed on `userId` = Cognito `sub`.

### `tracker_onboarding` (one item per user)

The full onboarding state as a JSON blob — toli, vehicle, advance — stored as a single Dynamo item. Same rationale as `budget_state`: at this scale, a blob beats a 3-table join.

```
PK: userId (string)
attrs (typed JSON, schema in packages/shared/src/types/tracker.ts):
  startDate                     'YYYY-MM-DD'
  targetFactory:
    name                        string
    village                     string
    taluka                      string
    district                    string
  mukadam:
    name                        string
    phoneE164                   string
  migrationDistanceDays         int
  koytaType                     enum('full','half')
  advanceTakenThisYearPaise     int
  outstandingLastYearPaise      int
  totalAdvancePaise             int        -- computed; sum of above two
  toli:
    fullKoytaMen                int
    fullKoytaWomen              int
    halfKoytaMen                int
    halfKoytaWomen              int
    boysHelping                 int
    girlsHelping                int
    weightedKoytaCount          decimal    -- computed: full + 0.5*half
  vehicle:
    type                        enum('truck','tractor','bullock_cart','chakda')
    count                       int
    tonsPerVehicle              decimal(5,2)
  ratesVersionId                string     -- references the rates table version active at onboarding
  updatedAt                     ISO8601
```

### `daily_records` (one item per user per day)

Normalized because we query and aggregate it (dashboard math, exports).

```
PK: userId (string)
SK: occurredOn ('YYYY-MM-DD')
attrs:
  dayType                       enum('working_day','in_transit','phad_reached',
                                     'at_phad_no_work','journey_started')
  factoryName                   string
  village                       string
  district                      string
  startTime                     'HH:MM'    optional, only when working_day
  endTime                       'HH:MM'    optional
  vehiclesFilled                int        optional, only when working_day
  perDayToliOverride            JSON       optional; same shape as toli above
  ratesVersionId                string     -- snapshot at write-time
  wagesEarnedToliPaise          int        -- computed at write-time
  wagesEarnedKoytaPaise         int        -- computed at write-time
  loggedAt                      ISO8601
```

The composite key `(userId, occurredOn)` enforces "one record per worker per day." Re-submitting a day overwrites cleanly — no accidental duplicates.

### `slips` (one item per slip)

Metadata only; the JPEG lives in S3.

```
PK: userId (string)
SK: slipId (ULID)              -- sorts chronologically as a side effect
attrs:
  s3Key                         string     -- e.g. 'slips/{userId}/{slipId}.jpg'
  capturedAt                    ISO8601
  voucherDate                   'YYYY-MM-DD' optional, user-provided later
  factoryName                   string     optional
  voucherAmountPaise            int        optional
```

S3 access via short-lived pre-signed URLs minted by the `GET /slips` Lambda after Cognito JWT validation.

### Conventions

- All money values in **paise** (integers). No floats anywhere in the wage-math chain.
- Wage values **computed at write-time** and stored, not recomputed on every dashboard read. This means a mid-season rate change does NOT retroactively change historical days — a feature, not a bug.
- `ratesVersionId` snapshotted on every `DailyRecord` write so the rate used is reproducible from the row alone.
- `PAY_PER_REQUEST` billing, PITR off, `removalPolicy: "destroy"`, no GSIs, no streams. Same defaults as the budget app's tables.

The export Lambda (see `data-export.md`) emits `tracker_onboarding.csv`, `daily_records.csv`, and `slips.csv` from these tables.

---

## 8. Researcher data export

Same admin route as the budget app. Tracker adds CSVs for `tracker_onboarding`, `toli_composition`, `vehicles`, `daily_records`, `slips` (metadata only — slip blobs delivered as a separate ZIP via signed URL).

Same pseudonymisation: `participant_id` hash in exports; email-to-id mapping out-of-band.

---

## 9. Privacy & data lifecycle

Same as the budget app. The slip photos are the only new sensitive asset:
- Stored in private S3 bucket (no public URL).
- Signed, time-limited URLs for in-app display.
- Wiped along with all other user data by **2027-04-30**.

---

## 10. Operational concerns specific to the tracker

Worth calling out because they don't apply to the budget app:

- **Rate-table versioning.** A `RatesVersion` record (effective_from date + the rate table snapshot) lives in `packages/shared/src/data/rates.ts` and is referenced by `ratesVersionId` on every `DailyRecord` write. If SOPPECOM updates rates mid-pilot, ship a new version with a future `effectiveFrom` date; historical days keep their original `ratesVersionId` and recompute identically.
- **Time zone.** All `ISO8601` timestamps are stored as UTC; client displays in `Asia/Kolkata`. Date fields (`occurredOn`, `voucherDate`) are calendar dates as `'YYYY-MM-DD'` strings — no timezone, no time-component, never converted to/from UTC.
- **Idempotency.** The `(userId, occurredOn)` composite key on `daily_records` means a re-submitted day overwrites cleanly. Don't accidentally append duplicate rows if retry logic is added later.
- **Daily entry while offline:** v1 = no offline support (per Praveen's call on Slack), but **the Add Daily Entry form should hold its state if the network drops mid-save** so the worker doesn't lose 30 seconds of typing. `react-hook-form` form state cached in `sessionStorage`, cleared on successful POST. Show a clear "no connection — try again" banner.
- **End-of-season ledger PDF:** ~150 working days. `@react-pdf/renderer` paginates natively. Generated client-side, lazy-loaded — see §6.13. PDF blob can optionally be uploaded to S3 (same pre-signed URL flow as slips) so the user can re-download or share via WhatsApp later.
- **Localstorage as cache only.** The prototype's `AppContext.tsx` uses `localStorage` as the source of truth — that's a prototype shortcut. In production: source of truth is DynamoDB via API; `localStorage` is a non-authoritative cache for instant first-paint. On every app open, fire a background fetch and reconcile.

---

## 11. Non-requirements

- ❌ Live GPS / location auto-fill. Workers type/select.
- ❌ OCR of wage slips. Photo capture only; manual reconciliation by the research team.
- ❌ Multiple toli accounts on one phone. One phone = one user.
- ❌ Mukaddam-side dashboard. Out of scope.
- ❌ Native Android.

---

## 12. Milestones — indicative working sequence

Treat as a working order, not a schedule. The SOW dates are tentative; SOPPECOM training schedule is the real constraint.

| Step | Milestone | Owner |
|---|---|---|
| 0 | Budget app delivered to Aditi. Krishna pivots to tracker. The tracker shell already exists in the SPA from the static-prototype step — it just gets wired to real data now. | Krishna |
| 1 | Onboarding wizard (B1–B5) complete and wired to DynamoDB. | Krishna |
| 2 | Add Daily Entry + wage formula + ledger persistence + dashboard math. `events.track()` at every save and PDF action. | Krishna |
| 3 | Slips capture + S3 upload + display via pre-signed URLs. | Krishna |
| 4 | Season-ledger PDF (lazy-loaded), Marathi strings, accessibility pass. | Krishna |
| 5 | Internal QA + Aditi UAT begins on `prod`. | Krishna delivers; Chinmaya coordinates UAT |
| 6 | **Tracker shell ready for Aditi UAT.** | Krishna |
| Post-UAT | Madhukar takes over for fine-tuning based on UAT feedback. | Madhukar |
| End of pilot | `sst remove --stage prod`. Final data export to Aditi via `data-export.md` procedure. | Krishna |

The tighter scope vs the budget app is deliberate — most infra (Cognito, DynamoDB, i18n, design system, hosting, deploy pipeline, events client, single SPA shell) is paid for once during the budget-app build.

---

## 13. Open questions (block before ship)

1. **Rate confirmation:** Aditi noted "we can modify as needed" on slide 13. Confirm the four `RATE_PER_TON` values are what SOPPECOM wants for the 2026-27 season. If they've published 2025 or 2026 rates, use those.
2. **Chakda rate:** prototype defaults Chakda to the Tractor rate. Get the real number from SOPPECOM if there is one.
3. **Per-day toli override UX:** confirm with Aditi that this is the right model (override per day) vs a "rolling toli composition that the user updates when it changes."
4. **Voucher amount field on slips:** is this voluntary user input, or does the research team want it mandatory once a slip is uploaded? Affects validation strictness.
5. **Edit/delete of past daily entries:** allowed freely, or locked after a certain age (e.g. 7 days) to keep the research data clean? Default in this spec: freely editable, with an audit trail.
6. **Slip retention vs. deletion:** are slip photos part of the April 2027 wipe, or do researchers want to keep them longer (with consent)? Confirm with Aditi.

---

## 14. Out of scope, but worth noting for v2

- Full offline-first with conflict resolution (legitimate ask if the pilot expands to areas with worse connectivity).
- OCR of wage slips → auto-fill voucher amount.
- Mukaddam-facing portal so the contractor can publish official daily numbers and the worker can reconcile.
- Native Android wrap (Capacitor) post-pilot.
- Charts/trends view (weekly wages, repayment trajectory).
