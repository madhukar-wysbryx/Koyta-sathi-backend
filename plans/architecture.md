# Koyta-Sathi — Architecture

**Audience:** Wysbryx engineering. **Status:** Source of truth. Anywhere this contradicts a spec, this wins. **Last updated:** 2026-05-09.

---

## What we're building

Two user-facing experiences + one admin experience for a 60-day Harvard / SOPPECOM / Bhowmick research pilot with ~20 sugarcane-cutter users in Maharashtra. Same brand ("Koyta-Sathi"), same auth, same design system.

**Architecturally: one SPA. Three subdomains. The bundle picks which experience to mount based on `window.location.hostname` at boot.**

- `budget.wysbryxapp.com` — once-per-season budgeting + financial-literacy. Mounts the **Budget** shell.
- `tracker.wysbryxapp.com` — daily wage/work logging + slip photos. Mounts the **Tracker** shell.
- `admin.wysbryxapp.com` — Wysbryx-internal CRUD over both apps. Mounts the **Admin** shell. Gated on `role=admin`.

**For the user, this is two separate apps** with two URLs, two installable PWAs, separate-feeling sessions. **For us, it's one Vite build, one CloudFront distribution, one place to ship a fix.** Best of both worlds.

Pilot lifespan: ~60 days. Two stages: `dev` (Krishna + team's playground; can break) and `prod` (Aditi-grade; once the pilot goes live, prod *is* live). No separate staging — the prod stage doubles as Aditi's preview environment until SOPPECOM training begins.

Detailed flows live in `project-requirements-budget-app.md`, `project-requirements-tracker-app.md`, `admin-app.md`. This doc is the architectural skeleton.

---

## Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React 19 + TS + Tailwind v4 | Fast HMR. **One SPA** at `apps/web` mounting one of three shells based on subdomain. |
| Routing | **Wouter** (~1KB) inside each shell | Each shell has 6-15 screens. Lightweight, hooks-based. |
| Subdomain → shell | `packages/shared/src/bootstrap.ts` reads `window.location.hostname` and renders `<BudgetShell />`, `<TrackerShell />`, or `<AdminShell />`. | Sub-millisecond decision, no route flicker, no client-side redirects. |
| PWA | `vite-plugin-pwa` per shell (different `manifest.webmanifest` per subdomain) | Budget + Tracker installable. Admin not installable. |
| Auth | **AWS Cognito User Pool, admin-created users only.** AWS Amplify v6 on the frontend. | Lift-and-adapt from `gebberit/geberit`. Same User Pool serves all three subdomains; session is shared. |
| Backend | **Single Lambda + Hono router**, Node 22.x | One always-warm Lambda. Hand-rolled JWT verify middleware (`jose` + Cognito JWKS). |
| API gateway | API Gateway HTTP API, `$default` → the single Lambda | No JWT authorizer at gateway; Hono middleware does the verification. |
| Data | **DynamoDB**, table-per-entity, `PAY_PER_REQUEST` | 6 tables (5 domain + 1 events), lowercase pragmatic names. No GSIs. PITR off. `removalPolicy: "destroy"`. |
| Object storage | S3 | Slip photos. `BlockPublicAccess: all`, SSE-S3, pre-signed URLs. |
| Credentials store | **AWS Secrets Manager** | Participant login credentials (auto-generated alias + temp password) live here, not on disk. |
| Region | **`ap-south-1` (Mumbai)** | Data residency for Indian PII. Pinned in `sst.config.ts`. |
| Hosting | S3 + **single CloudFront distribution** with three alternate domain names | One bundle, one distro. Three ACM certs in `us-east-1` (or one wildcard). |
| IaC | **SST v3 (Ion)**, **stages locked to `["dev", "prod"]`** | Single `sst.config.ts`. Throws on any other stage. State per-stage in S3 (SST manages this). |
| Envs | `dev`, `prod` | Mapped to git branches. Merge → CI deploys. Manual approval gate on `prod`. |
| CI/CD | GitHub Actions + AWS OIDC | **Never deploy locally** (Handmade lesson). Pulumi cleanup. Concurrency group per stage. |
| Linting / formatting | **Biome v2** (replaces ESLint + Prettier + import sort) | One binary, one config, ~10x faster. Narrow exception: `eslint-plugin-react-hooks` runs the exhaustive-deps rule alongside (Biome doesn't yet match parity here). |
| Testing | **Vitest** for unit, Playwright when an e2e is first written | Vite-native, same config as the SPA. |
| i18n | `react-i18next` | en + mr. Marathi rendered in-app post-login. See "Marathi readiness" below. |
| PDF | `@react-pdf/renderer` client-side, **lazy-loaded** | Devanagari TTF cached separately, registered on first PDF open. |
| Errors | Sentry free tier, client-only | CloudWatch retention = 7 days. No PII in logs. |

---

## Repo layout

```
kothi/                                  # parent monorepo
├── sst.config.ts                       # SST v3 root config; ALLOWED_STAGES = ["dev","prod"]
├── package.json                        # pnpm workspaces, packageManager pinned
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── biome.json                          # one config for lint + format + import sort
├── .github/workflows/
│   ├── deploy-dev.yml                  # OIDC, on push to `main`
│   ├── deploy-prod.yml                 # OIDC, on push to `production`, env-gated
│   └── ci.yml                          # Biome + tsc + vitest on every PR
├── docs/                               # specs, plans, runbooks (this folder)
├── _client-artifacts/                  # archived client inputs (mockups, prototypes, SOW)
├── packages/
│   ├── shared/                         # design system, i18n, Amplify wrapper, types, API client, events client
│   └── api/                            # the single Lambda: Hono app + handlers + Dynamo helpers
├── apps/
│   └── web/                            # the single Vite SPA, mounts a shell per subdomain
│       ├── src/
│       │   ├── main.tsx                # bootstrap → reads hostname → renders the right shell
│       │   ├── shells/
│       │   │   ├── BudgetShell.tsx
│       │   │   ├── TrackerShell.tsx
│       │   │   └── AdminShell.tsx
│       │   ├── budget/                 # budget screens + flow
│       │   ├── tracker/                # tracker screens + flow
│       │   └── admin/                  # admin screens
│       ├── public/
│       │   ├── manifest.budget.webmanifest
│       │   ├── manifest.tracker.webmanifest
│       │   └── (admin has no manifest — not installable)
│       └── vite.config.ts
└── infra/
    ├── auth.ts                         # Cognito User Pool + admin seed → Secrets Manager
    ├── data.ts                         # 6 Dynamo tables + S3 bucket + Secrets store
    ├── api.ts                          # API Gateway + the single Lambda + role grants
    └── web.ts                          # one StaticSite + 3 alternate domain names + DNS + ACM
```

**Why one SPA and not three:**
- One `pnpm install`, one `vite build`, one set of dependencies, one place to upgrade React.
- Shared code is *actually* shared (zero `packages/shared` import boundary friction).
- For the user it still feels like two apps because each subdomain has its own URL, its own PWA manifest (so installing `budget.wysbryxapp.com` to home screen creates a "Budget" icon, separately from "Tracker"), its own visual identity.
- The bundle includes all three shells but tree-shaking is irrelevant at our size — total bundle ~250KB gz, served from edge cache.

**Why three subdomains:**
- The user knows two URLs, sees two PWA icons, has two distinct mental contexts.
- Admin lives at a separate URL that participants would never think to type.
- Subdomain identity makes Sentry / CloudWatch grouping clean (we tag every event with the subdomain at boot).

---

## Bootstrap (the hostname → shell magic)

`apps/web/src/main.tsx`:

```ts
import { createRoot } from "react-dom/client";
import { BudgetShell } from "./shells/BudgetShell";
import { TrackerShell } from "./shells/TrackerShell";
import { AdminShell } from "./shells/AdminShell";

const SHELL_BY_HOST: Record<string, () => JSX.Element> = {
  "budget.wysbryxapp.com":      BudgetShell,
  "dev.budget.wysbryxapp.com":  BudgetShell,
  "tracker.wysbryxapp.com":     TrackerShell,
  "dev.tracker.wysbryxapp.com": TrackerShell,
  "admin.wysbryxapp.com":       AdminShell,
  "dev.admin.wysbryxapp.com":   AdminShell,
  "localhost":                  BudgetShell, // dev override via env
};

const Shell = SHELL_BY_HOST[window.location.hostname] ?? BudgetShell;
createRoot(document.getElementById("root")!).render(<Shell />);
```

That's it. Sub-millisecond, no flicker, no race.

---

## Auth — Cognito + Amplify v6 + Hono middleware

**Lifted from `gebberit/geberit`.** That implementation is "properly done" per Krishna; copy the pattern wholesale and adapt to our user shape.

### User Pool config (in `infra/auth.ts`)
- One User Pool per stage: `koyta-pilot-{stage}`.
- Username = email. Email auto-verified at admin-create time.
- Password policy: 8+ chars, mixed case, numbers (matches Geberit). No symbols.
- **Self-signup OFF.** Admin-create only via `AdminCreateUserCommand`.
- **No email delivered to participants.** Most pilot workers don't have personal email. Cognito uses `MessageAction=SUPPRESS` — credentials reach the worker via the facilitator's printed slip, not an inbox.
- **Email delivery via SES** (FROM `noreply@wysbryxapp.com`) is wired anyway for admin-role users (Wysbryx team + Aditi who DO have email). SES production access already lifted on `wysbryxapp.com`.
- Custom attribute: `custom:role` ∈ `{ "participant", "admin" }`.
- MFA off. Hosted UI off. Lambda triggers: none.

### How participant credentials are stored — Secrets Manager, not disk

This is the change we're making to avoid the "credentials CSV in `~/Downloads/`" footgun.

- For each participant, the seed script generates `participant-NN@wysbryxapp.com` (auto-generated alias under our domain) + a temp password.
- The script calls `AdminCreateUser` with `MessageAction=SUPPRESS` (Cognito creates the user, no email sent).
- The script then writes a secret to **AWS Secrets Manager** at the path `kothi/{stage}/credentials/participant-{NN}` with payload `{ login, tempPassword, realName, village, createdAt }`.
- **Nothing touches local disk.** Krishna never has a CSV to remember to delete.
- The admin app has a "Generate credential slip" action per participant: it calls `GET /admin/users/:id/credential-slip`, the Lambda reads from Secrets Manager, renders a single-row PDF in-Lambda (or returns the data and the SPA renders the PDF), and streams it to the browser. The PDF is downloaded once and never persisted server-side.
- The facilitator prints the slips, hands them out at SOPPECOM training, shreds them when the pilot ends.

### Frontend (in `packages/shared/src/auth/`)
- **AWS Amplify v6**, configured with the User Pool ID + Client ID injected via `import.meta.env`.
- Token storage: Amplify's secure internal storage. Silent token refresh via `fetchAuthSession()`.
- **NEW_PASSWORD_REQUIRED challenge** handled gracefully on first login.
- Zustand store with hydration guard (Geberit pattern).
- API client wraps `fetch`, attaches `Authorization: Bearer <idToken>` from `fetchAuthSession()` automatically.
- Same Cognito session works across all three subdomains because Amplify storage is partitioned per origin — but the worker only ever logs in once per app per device, and we choose to NOT share session across subdomains (each PWA installation is its own session, no cross-subdomain leak).

### Backend (in `packages/api/src/middleware/auth.ts`)
- Hono `requireAuth` middleware: extract Bearer token → verify against Cognito JWKS using `jose` → attach `{ userId, email, role }` to context. Reject 401.
- `requireRole("admin")` middleware composed on top.
- Public routes (just `/health`) skip the middleware.

### What we explicitly chose NOT to do
- **No self-signup.**
- **No SMS / phone OTP.**
- **No MFA in v1.**
- **No Lambda triggers** on Cognito.
- **No credentials on local disk.**

---

## Data — DynamoDB, table-per-entity, lowercase names

6 tables. No single-table-design heroics. Lowercase + snake_case to match the Lambda code style. Stage-prefixed by SST: `kothi-dev-users`, `kothi-prod-users`, etc.

| Table | PK | SK | Contents |
|---|---|---|---|
| `users` | `userId` | — | profile, language pref, role, cohort metadata |
| `budget_state` | `userId` | — | one item: full wizard state as a typed JSON blob |
| `tracker_onboarding` | `userId` | — | one item: toli, vehicle, advance |
| `daily_records` | `userId` | `occurredOn` (YYYY-MM-DD) | one item per worker per day |
| `slips` | `userId` | `slipId` (ULID) | metadata; image in S3 |
| `events` | `userId` | `eventId` (ULID) | engagement events (see "Events" below) |

**Conventions:**
- All money in **paise** (₹ × 100), integers only.
- Timestamps `ISO 8601` strings; dates `YYYY-MM-DD`.
- `userId` = Cognito `sub` claim. Upsert on first authenticated request.
- `budget_state` and `tracker_onboarding` are JSON blobs in a single item. **Deliberate.** Schema changes = rev a TypeScript interface, ship.
- `daily_records` and `events` are normalized because we aggregate them.

### What we explicitly chose NOT to do
- No GSIs, no PITR, no TTL, no DynamoDB Streams.

See `data-export.md` for export procedure and reporting patterns.

---

## Events — engagement tracking, Redis-bitarray-light

For a research pilot, the engagement funnel is one of the most valuable signals. We need it from day 1. We don't need Mixpanel.

### The events table

```
events
PK: userId (string)
SK: eventId (ULID, sorts chronologically)
attrs:
  type        string    -- e.g. "wizard_step_completed", "daily_record_logged"
  payload     map       -- type-specific small payload, e.g. { step: 4 }
  occurredAt  ISO8601
  app         enum      -- "budget" | "tracker" | "admin"
```

### The events client (`packages/shared/src/events/client.ts`)

The frontend never blocks on event tracking. The client is a fire-and-forget queue:

```ts
class EventsClient {
  private queue: Event[] = [];
  
  track(type: string, payload?: object) {
    const event = { type, payload, occurredAt: new Date().toISOString(), app: getApp() };
    this.queue.push(event);
    this.persist(); // sync write to localStorage queue
    this.scheduleFlush();
  }
  
  private async flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0);
    try {
      await fetch("/api/events", { method: "POST", body: JSON.stringify({ events: batch }) });
      this.persist(); // queue is now empty, persist again
    } catch {
      this.queue.unshift(...batch); // network failure → re-queue
      this.persist();
    }
  }
  
  // Flush on: 30s timer, page unload (sendBeacon), explicit sync.
}
```

**Properties:**
- **Lossy-tolerant:** localStorage queue survives reload + tab close + offline-then-online. Worst case: a worker's phone runs out of battery mid-session and loses the last 30 seconds of unflushed events. Acceptable.
- **Cheap:** one HTTP request per 30s of activity, batching all events. ~20 users × ~100 events/day = ~2000 events/day total. Trivial.
- **No external SDK.** ~80 lines of code. No Mixpanel, no Segment, no PostHog, no Amplitude. Just a Map and a `setInterval`.
- **Same scan-and-aggregate reporting pattern** as everything else (see `data-export.md`).

### Standard event taxonomy (defined upfront, prevent drift)

Defined once in `packages/shared/src/events/types.ts`, imported everywhere:

| Event type | Payload | Emitted from |
|---|---|---|
| `app_opened` | `{ subdomain }` | bootstrap |
| `login_succeeded` | `{}` | auth wrapper |
| `wizard_started` | `{ wizard: "budget" }` | budget welcome screen |
| `wizard_step_completed` | `{ wizard, step, stepName }` | each wizard step `onNext` |
| `wizard_completed` | `{ wizard }` | wizard last step |
| `pdf_generated` | `{ kind: "budget" \| "ledger" }` | PDF route |
| `pdf_downloaded` | `{ kind }` | PDF download button |
| `daily_record_logged` | `{ dayType }` | tracker save |
| `slip_uploaded` | `{}` | slip upload success |
| `admin_action` | `{ action, targetUserId }` | admin app |

**Anything not in the taxonomy doesn't get tracked.** Resist the urge to track every click.

### Reporting

`/admin/reports/funnel` route in the Lambda scans `events`, aggregates per-stage per-event, returns:

```json
{
  "cohort_size": 20,
  "stages": {
    "app_opened":            { "count": 18, "pct": 90 },
    "wizard_started":        { "count": 17, "pct": 85 },
    "wizard_step_completed:1": { "count": 17, "pct": 85 },
    "wizard_step_completed:2": { "count": 16, "pct": 80 },
    ...
    "wizard_completed":      { "count": 14, "pct": 70 },
    "daily_record_logged":   { "count": 12, "pct": 60 }
  }
}
```

Admin app renders this as a simple horizontal-bar funnel. Aditi reloads it daily.

---

## Backend — single Lambda, Hono router

**One Lambda for all endpoints.** Mounted via Hono.

```
packages/api/src/
├── index.ts                # Hono app + handler export
├── middleware/
│   ├── auth.ts             # requireAuth, requireRole
│   └── error.ts            # consistent error → JSON
├── routes/
│   ├── me.ts               # GET /me
│   ├── budget.ts           # GET/PUT /budget-state
│   ├── tracker.ts          # GET/PUT /tracker-onboarding
│   ├── daily-records.ts    # GET/POST /daily-records
│   ├── slips.ts            # GET /slips, POST /slips/upload-url
│   ├── events.ts           # POST /events (batched)
│   └── admin.ts            # /admin/* (requireRole("admin"))
└── lib/
    ├── dynamo.ts           # DocumentClient wrapper
    ├── s3.ts               # signer wrapper
    ├── secrets.ts          # Secrets Manager wrapper
    └── reports.ts          # scanAll<T>() + small aggregation helpers
```

### Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | liveness |
| GET | `/me` | participant+ | profile + language pref |
| GET | `/budget-state` | participant+ | fetch wizard JSON blob |
| PUT | `/budget-state` | participant+ | upsert wizard JSON blob |
| GET | `/tracker-onboarding` | participant+ | fetch onboarding blob |
| PUT | `/tracker-onboarding` | participant+ | upsert onboarding blob |
| GET | `/daily-records` | participant+ | list user's records + dashboard aggregates |
| POST | `/daily-records` | participant+ | upsert daily record (idempotent on `userId + occurredOn`) |
| POST | `/slips/upload-url` | participant+ | pre-signed S3 PUT URL |
| GET | `/slips` | participant+ | list user's slips with display URLs |
| POST | `/events` | participant+ | batch ingest engagement events |
| GET | `/admin/users` | admin | list all users |
| POST | `/admin/users` | admin | invite a new user (creates Cognito user + writes credentials to Secrets Manager) |
| GET | `/admin/users/:userId` | admin | one user's full state |
| GET | `/admin/users/:userId/credential-slip` | admin | render credential-slip PDF (reads Secrets Manager) |
| POST | `/admin/users/:userId/reset-password` | admin | re-issue temp password (writes to Secrets Manager) |
| DELETE | `/admin/users/:userId` | admin | hard-delete from Cognito + Dynamo + S3 + Secrets |
| GET | `/admin/reports/cohort-overview` | admin | counters + summary |
| GET | `/admin/reports/funnel` | admin | engagement funnel |
| GET | `/admin/reports/repayment-progress` | admin | per-user wages-vs-advance |
| POST | `/admin/export` | admin | CSV ZIP, signed URL. Throttled 1/5min. |

### Why a single Lambda
- **Always-warm:** at 20 users, the Lambda stays warm. Zero cold starts in practice.
- **One bundle, one deploy.** Faster iteration.
- **Shared connection pool** to Dynamo within an execution context.
- **Simpler IAM:** one role with grants for Cognito + Dynamo + S3 + Secrets.

### When to split
The export route does a full table scan. At our scale that's <5s. If the dataset grows past ~200k rows or the export route timeout becomes a live-traffic-degrading concern, split the export off into a second Lambda invoked async via `lambda:InvokeAsync`. Same single-binary deploy, two function exports. Until then, don't split.

---

## Hosting — single CloudFront distribution

- **One S3 bucket** per stage (`kothi-{stage}-web`).
- **One CloudFront distribution** per stage with **three "alternate domain names"** (CNAMEs): `budget.`, `tracker.`, `admin.`.
- **One wildcard ACM cert `*.wysbryxapp.com` in `us-east-1`** (decided at bootstrap — covers all three subdomains across both stages).
- **Three Route53 A-records** all pointing at the same CloudFront distribution.
- **CloudFront cache policy:** hashed assets long-cached (`max-age=31536000, immutable`); `index.html`, `sw.js`, `manifest.*.webmanifest` `no-cache`.
- **SPA fallback:** CloudFront `errorPage: "index.html"` for 403/404. Wouter handles the rest.
- **Different `manifest.webmanifest` per subdomain** is served via CloudFront request-routing: a CloudFront Function inspects `Host` header and rewrites the manifest path to `/manifest.budget.webmanifest`, `/manifest.tracker.webmanifest`, etc. ~10 lines of CloudFront Function. The `index.html` referencing `<link rel="manifest" href="/manifest.webmanifest">` is the same across subdomains; CloudFront handles the rewrite.

This is the actual cost difference vs three distros: **one** CloudFront Function, **one** invalidation per deploy, **one** distribution to monitor.

---

## CI/CD — never deploy locally

The Handmade project paid the tuition. We're applying the lessons.

- **Stages locked to `["dev", "prod"]`** in `sst.config.ts`. Any other stage throws at config-eval.
- **No personal/developer stages.** Local work uses `pnpm dev` (Vite) + `pnpm dev:api` (Hono in `sst dev` mode against the `dev` stage's resources). Nobody runs `sst deploy` from their machine.
- **Branches → stages:** `main` branch deploys to `dev` stage. `production` branch deploys to `prod` stage. `main` is the GitHub default; `production` is the protected release branch. **Never refer to a "dev branch" or "prod branch" — those names don't exist.**
- **Two-stage flow:**
  - Push to `main` → CI runs Biome + tsc + vitest → if green, `sst deploy --stage dev`. **No human gate.** This is the team's playground.
  - Open PR `main` → `production`, merge to `production` → CI runs the same checks → **manual approval gate** (GitHub Environment "production", required reviewer Krishna) → `sst deploy --stage prod`.
- **Concurrency group per stage:** prevents overlapping deploys triggering Pulumi state lock contention.
- **CI strips system Pulumi** (`sudo rm -f /usr/local/bin/pulumi*`) to avoid version-mismatch lock failures.
- **Force-push protection** on `prod` and `main`.
- **State location:** SST manages it in S3 per-stage automatically.
- **Smooth code flow (no manual diffing):** `main` → `production` is always a fast-forward merge via PR. Never cherry-pick. Never hotfix `production` directly. If `production` is ever ahead of `main`, the next merge is a "merge production into main to resync" before resuming feature work.
- **No PR previews in v1.** Aditi gets `prod` as her preview environment until pilot goes live; after that, `prod` IS live and `dev` becomes the playground for post-launch fixes.

Deploy procedure documented in `deploy.md`.

---

## Marathi readiness (first-class concern, not a checkbox)

Marathi rendering is wired from the first commit, not bolted on at week 3.

### Font loading
- **Noto Sans Devanagari** (Google Fonts open-source) is the canonical font for Marathi rendering in both the SPA UI and PDFs.
- **SPA:** loaded via `@font-face` from `/fonts/NotoSansDevanagari-VariableFont_wdth,wght.woff2` (subsetted to Devanagari + Latin codepoints, ~80KB), with `font-display: swap` so the page renders in fallback first and the font swaps in when ready. Brief flicker is preferable to blocking first paint.
- **PDFs:** loaded as full TTF (`@react-pdf/renderer` doesn't accept woff2 and doesn't subset), ~250KB, registered lazily on first PDF open.
- The font directory is in `packages/shared/public/fonts/` and copied into both the Vite build and the Lambda bundle.

### i18n catalog
- `react-i18next` with two catalogs: `packages/shared/src/i18n/en.json`, `packages/shared/src/i18n/mr.json`.
- **Default locale:** `mr` (Marathi). English is the toggle, not the default — these are Marathi-speaking users.
- Every user-facing string in the SPA flows through `t("key.path")`. No hardcoded English in components.
- Catalog format: nested JSON, namespaced per shell (`budget.welcome.title`, `tracker.dashboard.empty`). Keys are stable; values change.

### What we do, what Aditi does
- **We do:** scaffold the catalog with English strings, deliver an XLSX template (or Google Sheet) with one row per key, send to Aditi.
- **Aditi does:** fills the Marathi column. Returns it. We re-import into `mr.json` via a small `pnpm tsx scripts/import-translations.ts` script. The script validates that no keys are missing and warns on extra keys.
- **Fallback if Aditi delays:** translate offline using ChatGPT and Google Translate, paste into `mr.json`. Aditi corrects in-place during UAT. Don't block the timeline on Marathi delivery.

### Verifying it actually works
- Vitest snapshot test renders a key Marathi string and asserts the bytes are present.
- Manual smoke test on every PR: switch language toggle in dev, eyeball at least one Marathi screen.

---

## Compliance posture (summary)

- Region pinned to `ap-south-1`. Data does not leave Mumbai.
- S3: `BlockPublicAccess: all`, SSE-S3, ACL disabled.
- CloudWatch: 7-day retention. No PII in logs.
- Sentry: users keyed by hashed `participant_id`, never email/phone/name.
- Aditi has IRB approval. Engineering ships sane defaults.

Full posture in `compliance.md`.

---

## Local dev

- `pnpm dev` runs Vite for `apps/web`. Hostname switching for shells works via `localhost` override (mounts BudgetShell by default; `?shell=tracker` in URL forces a shell at dev time).
- `pnpm dev:api` runs `sst dev --stage dev` — Hono in local Lambda emulation against the real `dev` Cognito + Dynamo + S3 + Secrets in AWS.
- `.env.local` carries `VITE_API_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`. SST writes these for you when `sst dev` is running.

**Never run `sst deploy` locally.**

---

## Pinned versions and why

- **Node:** 22.x for Lambda runtime. AWS deprecates older versions on a rolling basis.
- **SST:** pinned exact in `package.json`. Don't `npm update` mid-pilot.
- **React + Tailwind:** what the prototypes use (React 19, Tailwind v4).
- **pnpm:** pinned in `package.json` `packageManager` field.
- **Biome:** pinned exact.

---

## Schedule philosophy

The SOW dates (May 26 budget, June 30 tracker) are **tentative**. The real binding constraint is the SOPPECOM training schedule, which Aditi controls and we don't yet know. Build at a sustainable pace, ship to `prod` as soon as each milestone is genuinely ready, let Aditi pull the trigger on going live.

The milestone trails in the per-app specs are **indicative working sequence**, not contractual countdowns. Any spec that says "delivered by 2026-05-26" should be read as "ready for Aditi UAT by roughly that point if no surprises."

---

## Decisions deferred to v2

If the pilot extends (real possibility per Krishna):

- PR previews per branch.
- Offline-first / IndexedDB sync.
- OCR of slip photos.
- Cohort dashboard for Aditi (she gets CSVs in v1; admin app gives basic view + funnel).
- MFA.
- Per-route Lambda split if a single endpoint starts dominating the warm Lambda's runtime.
- **Native Android wrap via Capacitor.** v1 ships responsive web; if real-world pilot data shows network or install-friction issues, wrap the existing Vite build into an APK (~1-2 weeks of work, no rewrite).
- Three-stage flow (`dev` → `staging` → `prod`) if the cohort grows past pilot scope.
