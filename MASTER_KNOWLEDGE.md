# Koyta-Sathi — Master Knowledge Document

**Purpose:** Pre-build reference. Everything an engineer needs before writing a single line of code.
**Last compiled:** 2026-05-14 from `/SDP` and `/plans` source documents.
**Source of truth priority:** `architecture.md` > per-app spec > flow document > SDP notes.

---

## 1. Project Context

A **Harvard / SOPPECOM / Bhowmick research pilot** for ~20 sugarcane *koyta* cutters in rural Maharashtra. The researcher is **Aditi Bhowmick** (Harvard PhD, under Prof. Eliana La Ferrara), partnered with SOPPECOM.

The engineering client is **Wysbryx** (Praveen on delivery, Krishna on architecture, Madhukar primary dev, Ayush assisting, Chinmaya on coordination).

### What We Are Building

Two user-facing apps + one admin app sharing one codebase:

| App | URL | Purpose |
|---|---|---|
| **Budget App** | `budget.wysbryxapp.com` | Used once per season. Financial literacy + advance planning + PDF budget. |
| **Tracker App** | `tracker.wysbryxapp.com` | Used daily. Wage logging + debt tracking + slip photos. |
| **Admin App** | `admin.wysbryxapp.com` | Internal only. Cohort management, data export, engagement funnel. |

### Commercial Context

- SOW total: **$5,998 USD**
- Budget app milestone: **$1,500 USD** (target: ~2026-05-26 for Aditi UAT)
- Tracker app milestone: **$1,500 USD** (target: ~2026-06-30)
- Renegotiated July payment: **$1,000 USD** tied to tracker UAT sign-off
- Pilot lifespan: ~60 days; all data deleted by **April 2027**

### Hard Constraints (non-negotiable)

- Web app, responsive, mobile-first. **No native Android.** (Praveen/Aditi confirmed 2026-05-06)
- **No offline-first / service-worker / IndexedDB.** (Praveen killed this 2026-05-04)
- **No self-signup.** Admin-created users only. ~20 participants get printed credential slips.
- **English + Marathi.** Default locale is Marathi (`mr`). English is the toggle.
- **Data deletion by April 2027.** Build the deletion job from day one.
- **Never deploy locally.** CI/CD only via GitHub Actions. This is the cardinal rule from a prior project lesson.

---

## 2. Architecture — The Big Picture

### One SPA, Three Shells, Three Subdomains

Architecturally it is **one Vite build** deployed to **one CloudFront distribution**. At boot, `main.tsx` reads `window.location.hostname` and mounts one of three shells. For the user, it feels like two completely separate apps.

```ts
// apps/web/src/main.tsx
const SHELL_BY_HOST: Record<string, () => JSX.Element> = {
  "budget.wysbryxapp.com":      BudgetShell,
  "dev.budget.wysbryxapp.com":  BudgetShell,
  "tracker.wysbryxapp.com":     TrackerShell,
  "dev.tracker.wysbryxapp.com": TrackerShell,
  "admin.wysbryxapp.com":       AdminShell,
  "dev.admin.wysbryxapp.com":   AdminShell,
  "localhost":                  BudgetShell, // dev default; ?shell=tracker overrides
};
const Shell = SHELL_BY_HOST[window.location.hostname] ?? BudgetShell;
createRoot(document.getElementById("root")!).render(<Shell />);
```

**Why one SPA:** one `pnpm install`, one `vite build`, one set of deps, one place to upgrade React, shared code with zero import friction. Bundle ~250KB gz. Irrelevant tree-shaking at this size.

**Why three subdomains:** two distinct mental contexts for the user, two PWA icons on the home screen, admin at a URL participants would never type.

### Environments / Stages

| Stage | Branch | URL prefix | Deploys via |
|---|---|---|---|
| `dev` | `main` | `dev.*.wysbryxapp.com` | Auto on push (no gate) |
| `prod` | `production` | `*.wysbryxapp.com` | Manual approval gate (Krishna) |

> **Never refer to a "dev branch" or "prod branch."** The branches are `main` and `production`. The stages are `dev` and `prod`. Different names, deliberate.

---

## 3. Tech Stack

### Frontend

| Concern | Choice | Notes |
|---|---|---|
| Build tool | **Vite** | Fast HMR |
| Framework | **React 19 + TypeScript** | |
| Styling | **Tailwind v4** | Cream/olive palette (budget), indigo/slate (tracker), defaults (admin) |
| Routing | **Wouter** (~1KB) | Lightweight, hooks-based. 6-15 screens per shell. |
| PWA | **vite-plugin-pwa** | Budget + Tracker installable. Admin not. Different manifest per subdomain. |
| Auth frontend | **AWS Amplify v6** | Token storage + silent refresh. Pattern lifted from `gebberit/geberit`. |
| State | **Zustand** | With hydration guard (Geberit pattern). |
| Forms | **react-hook-form + zod** | Wizard steps. |
| Animations | **motion** (formerly framer-motion) | Already in the prototype. |
| i18n | **react-i18next** | `en` + `mr`. Default locale: `mr`. |
| PDF | **@react-pdf/renderer** | Client-side, **lazy-loaded**. Real text, Devanagari support. |
| Fonts (UI) | **Noto Sans Devanagari** | WOFF2 subsetted (~80KB), `font-display: swap`. |
| Fonts (PDF) | **Noto Sans Devanagari Regular TTF** | Full TTF (~250KB). `@react-pdf` doesn't accept WOFF2. |
| Events | Custom fire-and-forget queue | localStorage-backed retry. ~80 lines. No Mixpanel/Segment. |
| Errors | **Sentry (free tier)** | Client-only. User ID = hashed `participant_id`, never PII. |

### Backend

| Concern | Choice | Notes |
|---|---|---|
| Runtime | **Node 22.x** on AWS Lambda | Single Lambda for all endpoints. Always-warm at 20 users. |
| Framework | **Hono** | Router + middleware on a single Lambda. |
| Auth backend | `jose` + Cognito JWKS | Hand-rolled `requireAuth` middleware. No API Gateway authorizer. |
| Database | **DynamoDB** | Table-per-entity, `PAY_PER_REQUEST`, no GSIs, PITR off. |
| Object storage | **AWS S3** | Slip photos only. `BlockPublicAccess: all`, SSE-S3, pre-signed URLs. |
| Secrets | **AWS Secrets Manager** | Participant credentials live here, never on disk. |
| Auth provider | **AWS Cognito User Pool** | Admin-created only. `custom:role` attribute. |

### Infrastructure & Tooling

| Concern | Choice |
|---|---|
| IaC | **SST v3 (Ion)** — `sst.config.ts`, stages locked to `["dev","prod"]` |
| CI/CD | **GitHub Actions + AWS OIDC** — never long-lived IAM keys |
| Linting/Format | **Biome v2** (replaces ESLint + Prettier + import sort) + `eslint-plugin-react-hooks` (exhaustive-deps only) |
| Testing | **Vitest** (unit), Playwright (e2e, when first written) |
| Package manager | **pnpm** with workspaces, `packageManager` pinned in `package.json` |
| Region | **`ap-south-1` (Mumbai)** for all resources except ACM certs (`us-east-1` for CloudFront) |
| Hosting | S3 + **single CloudFront distribution** (3 alternate domain names per stage) |
| DNS | Route53 in parent `wysbryxone` payer account. ALIAS records → CloudFront. |

---

## 4. Monorepo Folder Structure

```
kothi/                                  ← parent monorepo root
├── sst.config.ts                       ← SST v3 config; ALLOWED_STAGES = ["dev","prod"], region ap-south-1
├── package.json                        ← pnpm workspaces, packageManager pinned
├── pnpm-workspace.yaml
├── tsconfig.base.json                  ← strict mode, base for all packages
├── biome.json                          ← lint + format + import sort config
│
├── .github/
│   └── workflows/
│       ├── ci.yml                      ← Biome + tsc + vitest on every PR
│       ├── deploy-dev.yml              ← push to main → sst deploy --stage dev (+ Pulumi-strip!)
│       └── deploy-prod.yml             ← push to production → env gate → sst deploy --stage prod
│
├── docs/                               ← specs, plans, runbooks (the /plans folder)
├── _client-artifacts/                  ← GITIGNORED — mockups, SOW, Slack context
│
├── packages/
│   ├── shared/                         ← shared design system, i18n, auth, types, API/events clients
│   │   └── src/
│   │       ├── auth/
│   │       │   ├── amplify-config.ts
│   │       │   └── useAuth.ts          ← Zustand store w/ hydration guard
│   │       ├── events/
│   │       │   ├── client.ts           ← fire-and-forget queue, localStorage retry
│   │       │   └── types.ts            ← event taxonomy (do not add outside taxonomy)
│   │       ├── i18n/
│   │       │   ├── en.json
│   │       │   └── mr.json             ← Marathi is the default, en is the toggle
│   │       ├── types/
│   │       │   ├── budget.ts           ← TypeScript shape of budget_state blob
│   │       │   └── tracker.ts          ← TypeScript shape of tracker_onboarding blob
│   │       ├── data/
│   │       │   └── rates.ts            ← RATE_PER_TON constants + RatesVersion records
│   │       └── public/
│   │           └── fonts/
│   │               ├── NotoSansDevanagari-VariableFont_wdth,wght.woff2   ← UI font
│   │               └── NotoSansDevanagari-Regular.ttf                    ← PDF font
│   │
│   └── api/                            ← the single Lambda: Hono app
│       └── src/
│           ├── index.ts                ← Hono app + Lambda handler export
│           ├── middleware/
│           │   ├── auth.ts             ← requireAuth, requireRole (jose + Cognito JWKS)
│           │   └── error.ts            ← consistent error → JSON
│           ├── routes/
│           │   ├── me.ts               ← GET /me
│           │   ├── budget.ts           ← GET/PUT /budget-state
│           │   ├── tracker.ts          ← GET/PUT /tracker-onboarding
│           │   ├── daily-records.ts    ← GET/POST /daily-records
│           │   ├── slips.ts            ← GET /slips, POST /slips/upload-url
│           │   ├── events.ts           ← POST /events (batched)
│           │   └── admin.ts            ← /admin/* (requireRole("admin"))
│           └── lib/
│               ├── dynamo.ts           ← DocumentClient wrapper
│               ├── s3.ts               ← pre-signed URL helper
│               ├── secrets.ts          ← Secrets Manager wrapper
│               └── reports.ts          ← scanAll<T>() + aggregation helpers
│
├── apps/
│   └── web/                            ← the single Vite SPA
│       ├── vite.config.ts
│       ├── public/
│       │   ├── manifest.budget.webmanifest
│       │   ├── manifest.tracker.webmanifest
│       │   └── (no manifest for admin)
│       └── src/
│           ├── main.tsx                ← bootstrap: hostname → shell mount
│           ├── shells/
│           │   ├── BudgetShell.tsx
│           │   ├── TrackerShell.tsx
│           │   └── AdminShell.tsx
│           ├── budget/                 ← Budget app screens
│           ├── tracker/                ← Tracker app screens
│           └── admin/                  ← Admin app screens
│
├── infra/
│   ├── auth.ts                         ← Cognito User Pool + admin seed → Secrets Manager
│   ├── data.ts                         ← 6 DynamoDB tables + S3 bucket
│   ├── api.ts                          ← API Gateway HTTP API + Lambda + IAM grants
│   └── web.ts                          ← StaticSite + 3 alt domain names + CloudFront Fn + ACM + DNS
│
└── scripts/
    ├── seed-dev.ts                     ← one-time: create test Cognito users + Secrets Manager entries
    └── import-translations.ts          ← ingest Aditi's XLSX Marathi column into mr.json
```

---

## 5. DynamoDB Data Model

**6 tables.** Stage-prefixed by SST: `kothi-{stage}-{tablename}`. All money in **paise** (₹ × 100), integers only. No floats anywhere in the money chain.

### Table 1: `users` (shared across all shells)

```
PK: userId (string) = Cognito sub claim
---
firstName            string
lastName             string
village              string
email                string         (auto-generated alias: participant-NN@wysbryxapp.com)
language             enum('en','mr')   default 'mr'
consentAcceptedAt    ISO8601 | null
isAdmin              bool
createdAt            ISO8601
lastSeenAt           ISO8601        (updated on every authenticated request via /me)
```

### Table 2: `budget_state` (one item per user — JSON blob)

```
PK: userId (string)
---
recall2024:
  pendingStartPaise        int
  advanceTakenPaise        int
  monthsWorked             int
  arrearsRemainingPaise    int
recall2025: { same shape }
quiz:
  selectedOptionIds        string[]
  scoreCorrect             int
  scoreTotal               int    (= 5)
  attemptedAt              ISO8601
prioritization:
  completedAt              ISO8601?
  expertTipShownAt         ISO8601?
planning:
  plannedAdvancePaise      int
  revisedAt                ISO8601?
priorityCategories:
  [ { position, label, amountPaise, classification: 'must'|'wait'|'unclassified' } ]
priorityAdvancePaise       int    (= sum of must-have amounts)
budgetPdf:
  generatedAt              ISO8601?
  s3Key                    string?   (only if uploaded for WhatsApp share)
installments:
  [ { id: ULID, amountPaise, purpose, occurredOn: 'YYYY-MM-DD', loggedAt: ISO8601 } ]
updatedAt                  ISO8601
```

### Table 3: `tracker_onboarding` (one item per user — JSON blob)

```
PK: userId (string)
---
startDate                    'YYYY-MM-DD'
targetFactory: { name, village, taluka, district }
mukadam: { name, phoneE164 }
migrationDistanceDays        int
koytaType                    enum('full','half')
advanceTakenThisYearPaise    int
outstandingLastYearPaise     int
totalAdvancePaise            int    (= above two summed)
toli:
  fullKoytaMen               int
  fullKoytaWomen             int
  halfKoytaMen               int
  halfKoytaWomen             int
  boysHelping                int    (tracked, NOT in wage calc)
  girlsHelping               int    (tracked, NOT in wage calc)
  weightedKoytaCount         decimal  (= fullM + fullW + 0.5*(halfM + halfW))
vehicle:
  type                       enum('truck','tractor','bullock_cart','chakda')
  count                      int
  tonsPerVehicle             decimal(5,2)
ratesVersionId               string
updatedAt                    ISO8601
```

### Table 4: `daily_records` (one item per user per day)

```
PK: userId (string)
SK: occurredOn ('YYYY-MM-DD')
---
dayType                  enum('working_day','in_transit','phad_reached','at_phad_no_work','journey_started')
factoryName              string
village                  string
district                 string
startTime                'HH:MM'?   (working_day only)
endTime                  'HH:MM'?
vehiclesFilled           int?       (working_day only)
perDayToliOverride       JSON?      (same shape as toli; overrides onboarding for this day only)
ratesVersionId           string     (snapshot at write-time for reproducibility)
wagesEarnedToliPaise     int        (computed at write-time, stored)
wagesEarnedKoytaPaise    int        (computed at write-time, stored)
loggedAt                 ISO8601
```

> **Key rule:** wages computed at write-time and stored. A mid-pilot rate change does NOT retroactively alter historical days.

### Table 5: `slips` (one item per slip — metadata only)

```
PK: userId (string)
SK: slipId (ULID — sorts chronologically)
---
s3Key              string     ('slips/{userId}/{slipId}.jpg')
capturedAt         ISO8601
voucherDate        'YYYY-MM-DD'?
factoryName        string?
voucherAmountPaise int?
```

Photos are in S3 (`kothi-{stage}-slips`). Access via short-lived pre-signed URLs minted after JWT validation.

### Table 6: `events` (engagement tracking)

```
PK: userId (string)
SK: eventId (ULID — sorts chronologically)
---
type        string    (from the event taxonomy)
payload     map       (type-specific small payload)
occurredAt  ISO8601   (client clock)
app         enum('budget','tracker','admin')
```

---

## 6. API Endpoints (Single Lambda, Hono Router)

### Public
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |

### Authenticated (participant+)
| Method | Path | Purpose |
|---|---|---|
| GET | `/me` | Profile. Also upserts `users` row on first call. |
| GET | `/budget-state` | Fetch wizard JSON blob |
| PUT | `/budget-state` | Upsert wizard JSON blob |
| GET | `/tracker-onboarding` | Fetch tracker onboarding blob |
| PUT | `/tracker-onboarding` | Upsert tracker onboarding blob |
| GET | `/daily-records` | List user's records + dashboard aggregates |
| POST | `/daily-records` | Upsert daily record (idempotent on userId + occurredOn) |
| POST | `/slips/upload-url` | Pre-signed S3 PUT URL (5-min TTL) |
| GET | `/slips` | List user's slips with 1-hour display URLs |
| POST | `/events` | Batch ingest engagement events (fire-and-forget) |

### Admin only (`requireRole("admin")`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/users` | List all participants |
| POST | `/admin/users` | Invite new user (Cognito AdminCreateUser + Secrets Manager) |
| GET | `/admin/users/:userId` | Full state view |
| GET | `/admin/users/:userId/credential-slip` | PDF credential slip (reads Secrets Manager) |
| POST | `/admin/users/:userId/reset-password` | Re-issue temp password |
| DELETE | `/admin/users/:userId` | Hard-delete (Cognito + Dynamo + S3 + Secrets) |
| GET | `/admin/reports/cohort-overview` | Counters + per-participant summary |
| GET | `/admin/reports/funnel` | Engagement funnel from events table |
| GET | `/admin/reports/repayment-progress` | Per-user wages vs advance |
| GET | `/admin/reports/daily-activity` | Per-day record counts |
| POST | `/admin/export` | CSV ZIP → signed URL (rate-limited 1/5min) |

---

## 7. Auth System

**AWS Cognito User Pool** per stage: `koyta-pilot-{stage}`.

- Username = email. **Self-signup OFF.** Admin-create only.
- Participants get an auto-generated alias (`participant-NN@wysbryxapp.com`) with `MessageAction=SUPPRESS` (no email delivered — they get a printed credential slip).
- Admin users (Wysbryx team + Aditi) get normal Cognito email via SES.
- Custom attribute: `custom:role` ∈ `{ "participant", "admin" }`.
- Password policy: 8+ chars, mixed case, numbers. MFA off. Hosted UI off.
- **NEW_PASSWORD_REQUIRED** challenge must be handled gracefully on first login.

**Participant credentials flow:**
1. Seed script calls `AdminCreateUser` with `MessageAction=SUPPRESS`.
2. Writes `{ login, tempPassword, realName, village, createdAt }` to Secrets Manager at `kothi/{stage}/credentials/participant-{NN}`.
3. Nothing on local disk.
4. Admin app generates a credential-slip PDF from Secrets Manager → printed → handed to worker → shredded after pilot.

**Frontend (Amplify v6 in `packages/shared/src/auth/`):**
- `fetchAuthSession()` for silent refresh.
- Zustand store with hydration guard (Geberit pattern).
- Logout-on-tab-close via `visibilitychange` event (prevents shared-phone session bleed).
- API client auto-attaches `Authorization: Bearer <idToken>`.

**Backend Hono middleware (`packages/api/src/middleware/auth.ts`):**
- Extract Bearer → `jose` `jwtVerify` against Cognito JWKS (cached in-memory).
- Attach `{ userId, email, role }` to context. Reject 401 on failure.
- `requireRole("admin")` composed on top → 403 if `role !== "admin"`.

---

## 8. Budget App — Screen-by-Screen Requirements

**17 screens / steps.** Order follows the prototype (training first, then recall, then planning).

| # | Screen | Key Requirement |
|---|---|---|
| 1 | Welcome / Disclaimer | Research framing + 2 consent items. Language toggle in header on every screen. Single CTA: "I Understand & Agree." Fires `wizard_started` event. |
| 2 | Onboarding — Profile | First Name + Last Name (separate fields) + Village (dropdown, pending real list from Aditi). Continue disabled until all 3 filled. |
| 3 | Past Season Recall 2024-25 | 4 inputs: Advance pending at start, Total advance taken, Months worked, Arrears remaining. All in ₹, stored as paise. |
| 4 | Past Season Recall 2025-26 | Same shape as Screen 3. |
| 5 | Geeta Tai's Story (1/2) | Story text from prototype + TTS via browser SpeechSynthesis. |
| 6 | Geeta Tai's Story (2/2) | "Steps to Make a Budget" numbered list. |
| 7 | Budget Quiz | Multi-select, 7 options (5 correct). **Scoring: +1 per correctly selected, no penalty.** Show score as `correctly_selected / 5`. After submit: color-code each option correct/incorrect. |
| 8 | Gauri's Story | Story text + key lesson + TTS. |
| 9 | Jagdish's Story | Story text + key lesson + TTS. |
| 10 | Advance Plan 2026 | Single input: Planned Advance (₹). Live compute: repayment estimate + "including arrears" estimate. Labeled as **"BROAD estimate based on last two years' data."** Formula below. |
| 11 | Priority Plan Intro | Title + "Start Plan" CTA. **No "Skip" option** (Aditi delta #6). |
| 12 | Priority Plan Stage 1 | Up to 10 expense categories. Each row: label + amount. Live total. Continue when ≥1 added. |
| 13 | Priority Plan Stage 2 | Must Have / Can Wait toggle per category. **Expert tip shown inline while doing this** (no separate score screen). On complete: show Priority Advance Amount = sum(must-have amounts). |
| 14 | Budget PDF | Auto-generated on completing Stage 2. Contents: header (name, village, season), past-season recap, planned advance + repayment estimate, full priority list with labels/amounts. Download + WhatsApp share (S3 upload → wa.me link). |
| 15 | "Ready to Track" | Static transition screen. CTA: "Go to Ledger." |
| 16 | Dashboard — Advance Ledger | Total Debt So Far vs Planned Limit. Progress bar. Warning >90% usage. Stat cards. Installments list (newest first). "+ Add New" FAB. Re-export PDF button. |
| 17 | Add Installment | Amount (₹). Purpose chips + free text. Date (defaults today, **any past date allowed**, no future). Save → list updates. |

### Advance Plan Formula

```
avg_advance_per_month = mean(
  recall2024.advanceTaken / max(1, recall2024.monthsWorked),
  recall2025.advanceTaken / max(1, recall2025.monthsWorked)
)
estimated_months           = ceil(plannedAdvance / (avg_advance_per_month || 10_000))
estimated_months_w_arrears = ceil((plannedAdvance + arrears) / (avg_advance_per_month || 10_000))
```

Falls back to ₹10,000/month if past data is zero/missing. Display both values. Label clearly as a broad estimate.

### PDF Implementation

- `@react-pdf/renderer` — client-side, lazy-loaded via `React.lazy`.
- Noto Sans Devanagari Regular TTF registered lazily on first PDF open (`Font.register`, `cache: "force-cache"`).
- **No `html2canvas`, no `jspdf` screenshot hack.** Real selectable text, real Marathi support.
- For WhatsApp share: upload blob to S3 via same pre-signed URL flow as tracker slips, then share signed URL via `wa.me` link.

---

## 9. Tracker App — Screen-by-Screen Requirements

**Daily-use app.** Works on shared auth/user record from the budget app.

### Onboarding (B1–B5)

| Screen | Key Requirement |
|---|---|
| B1 Profile | Skipped if budget app onboarding already completed. |
| B2 Migration & Koyta Details | Koyta type (Full/Half), Advance this year (₹), Outstanding last year (₹), Migration distance (days), Target factory (optional). Auto-shows total advance. |
| B3 Toli Composition | 6 inputs: Full Koytas M/W, Half Koytas M/W, Boys/Girls helping. Show computed weighted koyta count live. |
| B4 Vehicle Details | Type chips (Truck/Tractor/Bullock Cart/Chakda). Default tons-per-vehicle pre-filled. Show per-ton rate (read-only, from rate table). |
| B5 All Set! | Big "Total Advance: ₹X" card. CTA → Dashboard. |

### Main App (bottom-tab nav)

| Tab | Key Requirement |
|---|---|
| C1 Home / Dashboard | 3 stacked cards: Total Debt Remaining (red), Total Wages Earned (green), Repayment Progress (bar). 2×2 grid: Efficiency (tons/day avg), Toli Size, This Week's Wages, Days Worked This Week. FAB → Add Entry. |
| C2 Ledger | Daily records newest-first. Each row: date, village, day type icon, vehicles, wages (green). Tap → expand with full numbers + edit/delete. Top-right: Download PDF. |
| C3 Slips | Grid of slip thumbnails. Upload CTA. Info banner. Tap → fullscreen view + "Verify against ledger" action. |
| C4 Toli (Profile) | Name, village. Toli summary. Loan summary. Edit locked ("contact research coordinator"). Buttons: Switch language, Download Ledger PDF, Logout, Delete my data. |

### Wage Calculation (verbatim from SOPPECOM slide 13 — do not change without Aditi approval)

```
# SOPPECOM 2024 rates (paise per ton):
RATE_PER_TON = {
  BullockCart: 31_820,
  Tractor:     36_601,
  Chakda:      36_601,    # same as Tractor until SOPPECOM confirms separate rate
  Truck:       40_841,
}

tons_filled        = vehicles_filled * tons_per_vehicle
toli_earnings      = tons_filled * RATE_PER_TON[vehicle_type]          # paise
koyta_units        = fullM + fullW + 0.5 * (halfM + halfW)
koyta_wages        = toli_earnings / max(koyta_units, 1)                # paise

# Cumulative:
total_wages_earned = sum(koyta_wages_per_day for all working_day entries)
debt_remaining     = total_advance - total_wages_earned
```

**Important:** Boys/Girls helping tracked but do NOT enter the wage calc. Store computed wages at write-time, not on read.

### Add Daily Entry

- Date: defaults today, rolling 30-day picker, **no future dates**.
- Day status: {Harvesting, In Transit, Reached Phad, No Work, Journey Started}.
- If Harvesting: start/end time, vehicles filled (+/- stepper), optional per-day toli override (collapses by default).
- Live wage preview as user types.
- Form state cached in `sessionStorage` — cleared on successful POST. Show "no connection" banner on network failure; do NOT lose the user's input.

### Slip Upload

- `<input type="file" accept="image/*" capture="environment">` — simplest cross-browser.
- Client-side compress via `browser-image-compression`: target ~150KB, max edge 1600px, JPEG.
- Upload to S3 via pre-signed PUT URL.
- Optional metadata after upload: factory name, slip date, voucher amount.

### Season Ledger PDF

- `@react-pdf/renderer`, client-side, lazy-loaded. Same font approach as budget PDF.
- Contents: cover (name, village, factory, season, total advance, debt remaining), summary stats, day-by-day table (150+ rows, `@react-pdf` paginates natively), slips appendix (metadata only — no thumbnails).

---

## 10. Admin App

**URL:** `admin.wysbryxapp.com` (desk-grade, not mobile-optimized, no PWA manifest).

### Routes (7)

| Route | Component |
|---|---|
| `/login` | Standard login. Role check post-login: non-admin sees "You don't have access" + logout. |
| `/` | Overview: counters + recent activity + funnel chart |
| `/participants` | Table: name, village, alias, status, budget-completed?, last-seen. Click → detail. |
| `/participants/new` | Invite form. On submit: `POST /admin/users` → immediately offers credential-slip PDF download. |
| `/participants/:id` | Full state view (JSON sections) + actions (reset password, disable, delete). |
| `/reports` | Funnel chart + cohort-overview table + repayment-progress table. Funnel polls every 30s. |
| `/export` | One button → `POST /admin/export` → signed ZIP download. |

### Key Admin Rules

- **No edit-in-place of participant data.** The participant's apps are the only write path (research integrity).
- **Credential slip PDF** renders in-browser, never persisted server-side. Closing the modal discards it.
- **Destructive actions** (disable, delete, reset password) require typing the participant's name to confirm (GitHub pattern).
- Funnel chart: just `<div>`s with width-percentages. No chart library needed for 10 bars.

---

## 11. Event Tracking Taxonomy

Defined once in `packages/shared/src/events/types.ts`. **Anything not in this table doesn't get tracked.**

| Event type | Payload | Emitted from |
|---|---|---|
| `app_opened` | `{ subdomain }` | bootstrap (main.tsx) |
| `login_succeeded` | `{}` | auth wrapper |
| `wizard_started` | `{ wizard: "budget" }` | budget disclaimer accept |
| `wizard_step_completed` | `{ wizard, step, stepName }` | each wizard step `onNext` |
| `wizard_completed` | `{ wizard }` | last wizard step |
| `pdf_generated` | `{ kind: "budget" \| "ledger" }` | PDF route |
| `pdf_downloaded` | `{ kind }` | PDF download button |
| `daily_record_logged` | `{ dayType }` | tracker save |
| `slip_uploaded` | `{}` | slip upload success |
| `admin_action` | `{ action, targetUserId }` | admin app |
| `installment_logged` | `{ purpose }` | budget add installment save |
| `tracker_onboarding_started` | `{}` | tracker disclaimer accept |
| `tracker_onboarding_completed` | `{}` | B5 "All Set!" screen |

The events client is fire-and-forget with localStorage-backed retry queue. UI never blocks on `track()`.

---

## 12. i18n & Marathi Readiness

- **Default locale: `mr` (Marathi).** English is the toggle, not the default.
- Every user-facing string goes through `t("key.path")`. Zero hardcoded English in components.
- Catalog format: nested JSON, namespaced per shell (`budget.welcome.title`, `tracker.dashboard.empty`).
- Marathi font (Noto Sans Devanagari) is wired from commit 1, not bolted on at week 3.
- SPA uses WOFF2 subsetted (~80KB), `font-display: swap`.
- PDFs use full Regular TTF (~250KB), fetched lazily, `Font.register`'d once per session.
- A `pnpm tsx scripts/import-translations.ts` script ingests Aditi's Marathi column from XLSX. Validates no missing keys.
- If Aditi's translations are late: ship English-only with toggle showing "Marathi coming soon." Do not block the timeline.

---

## 13. Data Export (Researcher Output)

The entire research point of the project. Admin-only. One endpoint → CSV ZIP → signed S3 URL.

### Tables Exported (8 CSVs + manifest.json in ZIP)

1. `users.csv` — profile, `participant_id` (hashed sub, not email)
2. `budget_state.csv` — flattened wizard blob, one row per user
3. `priority_categories.csv` — long-format (one row per category per user)
4. `installments.csv` — one row per installment
5. `tracker_onboarding.csv` — toli/vehicle/advance, one row per user
6. `daily_records.csv` — one row per working day per user
7. `slips.csv` — metadata only (photos in S3, separate request)
8. `events.csv` — full engagement event log

**Pseudonymisation:** `participant_id` = `SHA256(userId + EXPORT_SALT)` truncated to 16 hex. Salt in SST Config.Secret. Aditi receives a separate out-of-band mapping file (never via the API).

**Slip photos:** not in the ZIP. Separate `scripts/dump-slips.ts` script, manual handoff from Krishna to Aditi.

---

## 14. Privacy & Compliance

- Region pinned to `ap-south-1`. Indian PII never leaves Mumbai.
- S3: `BlockPublicAccess: all`, SSE-S3, ACL disabled.
- CloudWatch: 7-day retention. **No PII in logs.**
- Sentry: user ID = hashed `participant_id`. Never email/name.
- Cognito JWT in Amplify secure storage, explicit logout-on-tab-close.
- "Delete my data" in profile → hard-deletes Dynamo rows + S3 prefix + disables Cognito user.
- **Data deletion deadline: April 2027.** End-of-pilot teardown is `sst remove --stage prod` (via GitHub `workflow_dispatch`).

---

## 15. CI/CD & Deployment Rules

### Golden Rule

> **Never run `sst deploy` (or `sst remove`) locally. Ever.**
>
> Stages locked to `["dev", "prod"]` in `sst.config.ts` — you literally can't create `--stage krishna`.

### Deploy Flow

```
Push to main       → Biome + tsc + vitest → sst deploy --stage dev  (automatic, ~90s)
PR main→production → Biome + tsc + vitest → sst deploy --stage prod  (Krishna must approve)
```

### Critical CI Step (do not remove)

Every CI workflow that calls SST must include:
```yaml
- run: sudo rm -f /usr/local/bin/pulumi*
```
Without this, the GitHub runner's pre-installed Pulumi version conflicts with SST's bundled one → cryptic state-lock failures.

### Naming Convention

| Entity | Name |
|---|---|
| AWS account | `koyta` |
| IAM role | `kothi-github-deploy` |
| SST resource prefixes | `kothi-{stage}-*` |
| Secrets Manager paths | `kothi/{stage}/credentials/participant-NN` |
| GitHub branches | `main` (→ dev stage), `production` (→ prod stage) |

---

## 16. Open Questions (Must Resolve Before Ship)

### Budget App
1. **Village list** — Aditi to send finalized list. Placeholder: "Beed, Latur, Osmanabad, Solapur."
2. **Quiz options** — Aditi may revise 7 quiz options. Confirm before May 22.
3. **Priority categories** — Current sample categories are temporary. New list from Aditi pending.
4. **Pre-registered cohort** — Get 20 names + villages from SOPPECOM by May 20 to seed `infra/pilot-cohort.json`.

### Tracker App
5. **Rate confirmation** — Confirm 4 RATE_PER_TON values for 2026-27 season with Aditi/SOPPECOM.
6. **Chakda rate** — Prototype defaults to Tractor rate. Get real number if available.
7. **Per-day toli override UX** — Confirm model: override per-day vs rolling toli that user updates when composition changes.
8. **Edit/delete of past daily entries** — Freely allowed, or locked after N days? Default spec: freely editable.
9. **Slip retention** — Are photos part of April 2027 wipe or kept longer? Confirm with Aditi.

---

## 17. What NOT to Build (Explicitly Out of Scope)

- Offline-first / service-worker / IndexedDB sync (Praveen killed this)
- Native Android (email 2026-05-06)
- Gemini-based TTS — use browser SpeechSynthesis (free, works for static instructional copy)
- `jspdf + html2canvas` PDF (prototype pattern) — use `@react-pdf/renderer`
- Authentication via Google / Facebook / SMS / phone OTP
- Push notifications
- Live GPS / location auto-fill
- OCR of wage slips
- Mukaddam-facing dashboard
- PR previews (v2)
- Offline-first IndexedDB sync (v2)
- Native Android Capacitor wrap (v2 if pilot data justifies it)
- DuckDB-WASM reporting (v2 if reports get complex)
- MFA (v2)

---

## 18. Key Decisions & Gotchas

1. **All money in paise (₹ × 100), integers only.** No IEEE floats anywhere in the money chain.
2. **Wage values computed at write-time and stored.** Not recomputed on read. Mid-pilot rate change does NOT retroactively alter historical records.
3. **`budget_state` and `tracker_onboarding` are deliberate JSON blobs.** Schema changes = bump a TypeScript interface, ship. No 6-table-join heroics for 20 users.
4. **Timestamps are UTC ISO8601. Date fields are `YYYY-MM-DD` strings.** No timezone, no conversion. Display in `Asia/Kolkata`.
5. **`(userId, occurredOn)` composite key on daily_records is the idempotency key.** Re-submitting a day overwrites cleanly.
6. **Amplify v6 sessions are per-origin.** Sessions are NOT shared across subdomains. Each PWA installation is its own session. Deliberate.
7. **No API Gateway JWT authorizer.** The Hono `requireAuth` middleware does everything. Simpler IAM, one code path.
8. **CloudFront Function (~10 lines) rewrites `/manifest.webmanifest` requests** per `Host` header to the subdomain-specific file. Same `index.html` across subdomains.
9. **`_client-artifacts/` is gitignored and never committed.** Mockups, SOW, Slack context stay local.
10. **The prototype's `App.tsx` (1391 lines, in-memory state) is a content reference only.** Mine it for story text, quiz options, expert tips, category labels. Do NOT use it as an architectural reference.
