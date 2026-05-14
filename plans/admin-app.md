# Koyta-Sathi — Admin App

**Audience:** Wysbryx engineering. **Status:** Working spec. **Last updated:** 2026-05-09.

---

## What this is

A lightweight Wysbryx-internal CRUD over both pilot apps. One person — Krishna or whoever's on call — should be able to manage the cohort, inspect a participant's state, and pull data without touching the AWS console.

- **URL:** `admin.wysbryxapp.com` (and `dev.admin.wysbryxapp.com` for the `dev` stage).
- **Architecture:** **the same SPA bundle as the user apps**, mounting `<AdminShell />` when `window.location.hostname` matches an admin subdomain. See `architecture.md` "Bootstrap" for the mechanism.
- **Users:** Wysbryx team + Aditi. Anyone in `users` table with `custom:role = "admin"`.
- **Devices:** desktop-grade. No PWA manifest, no mobile-optimization. We're not pretending this is a field app.
- **Built alongside the budget app**, no separate milestone. Aditi has admin role and uses this URL to pull her data export.

---

## Hard scope

### What it does
1. **List participants** — `users` table, all columns visible.
2. **Invite a new participant** — calls `POST /admin/users` → Cognito `AdminCreateUser` with `MessageAction=SUPPRESS` → server writes `{ login, tempPassword, realName, village, createdAt }` to AWS Secrets Manager at `kothi/{stage}/credentials/participant-{NN}` → admin UI immediately offers "Generate credential slip PDF" (one-click, renders in browser, downloads, never persisted server-side).
   - Admin-role users (Wysbryx team, Aditi) take the same endpoint *without* `MessageAction=SUPPRESS` so Cognito sends them a normal welcome email via SES — they have real email addresses and can self-onboard.
3. **Re-issue temp password** — `POST /admin/users/:id/reset-password` updates Cognito + the Secrets Manager entry. UI re-offers the credential-slip PDF.
4. **Generate credential slip** — `GET /admin/users/:id/credential-slip` reads from Secrets Manager and returns a single-page PDF (or returns the data + the SPA renders the PDF). Available any time, idempotent.
5. **Disable / re-enable a participant** — `AdminDisableUser` / `AdminEnableUser`.
6. **Hard-delete a participant** — `DELETE /admin/users/:id` → Cognito disabled + Dynamo rows deleted (across all 6 tables) + S3 prefix emptied + Secrets Manager entry deleted.
7. **View one participant's state** — `GET /admin/users/:id` returns their `users` row + `budget_state` blob + `tracker_onboarding` blob + last 30 `daily_records` + slip metadata. Renders as collapsible JSON sections + a small dashboard summary.
8. **Trigger a data export** — `POST /admin/export` → wait → download the signed-URL ZIP. See `data-export.md`.
9. **View aggregate stats + funnel** — counters and engagement funnel from the `events` table. See "Reports" below.

### What it explicitly does NOT do
- ❌ No edit-in-place of participant data. (The participant's apps are the only legitimate write path. If we let admins edit `daily_records`, we corrupt the research data.)
- ❌ No bulk operations beyond the seed script. (If we need to do something to all 20 users at once, write a one-shot Lambda + admin endpoint, not a bulk-action UI.)
- ❌ No real-time view / WebSocket. Refresh the page.
- ❌ No charts/graphs beyond the cohort overview + the funnel chart. Aditi's tools (R, Python) handle deeper analysis on the export.
- ❌ No audit log UI in v1. CloudWatch covers it.
- ❌ No theming. Tailwind defaults. This is internal.
- ❌ No credentials on local disk, ever. PDF renders in-browser, downloads, gets shredded. (This is a deliberate departure from "CSV in `~/Downloads/`" — see `architecture.md` "Auth" section.)

---

## Stack

Inherits everything from `architecture.md`:

- Same Vite + React 19 + TS + Tailwind v4 + Wouter as the user apps.
- Same `packages/shared` design tokens, API client, Amplify wrapper, events client.
- Lives in `apps/web/src/admin/` and `apps/web/src/shells/AdminShell.tsx`.
- **No PWA manifest** for the admin subdomain (the CloudFront Function that rewrites manifest paths returns 404 for admin → no install prompt).

The whole admin shell is ~5-8 components and ~6 routes. Should fit alongside the budget app build.

---

## Routes

Inside `<AdminShell />`, Wouter routes:

| Route | Component | Notes |
|---|---|---|
| `/login` | `AdminLogin` | Standard Amplify email + password. NEW_PASSWORD_REQUIRED handled. After login, role check: if `custom:role !== "admin"`, render "You don't have access" + logout. |
| `/` | `Overview` | Counters + recent activity + the funnel chart (see Reports). |
| `/participants` | `ParticipantList` | Table: name, village, login alias, status, budget-completed?, last-seen. Click row → `/participants/:id`. |
| `/participants/new` | `InviteParticipant` | Form: first/last/village/role. (No email field for participant role — alias auto-generated. Email field appears only when role=admin.) Submit → `POST /admin/users` → returns `{ userId, login }`. UI immediately calls credential-slip endpoint, renders PDF in iframe, offers download. |
| `/participants/:id` | `ParticipantDetail` | All-state view + actions (reset password → re-fetch credential slip, disable, delete). |
| `/reports` | `Reports` | Funnel chart + cohort-overview table + repayment-progress table. |
| `/export` | `Export` | One button. Trigger → poll → show download link. |

That's it. Seven routes.

---

## Reports (engagement funnel + cohort overview)

This is what makes the admin app worth Aditi's time during the pilot. Without it, she's flying blind for 60 days.

### Cohort overview
- Counters: cohort size, # who logged in this week, # who logged a daily record today, # slips uploaded total.
- Per-participant table: name, village, completed budget wizard?, days logged this week, last-seen-at, debt remaining.
- Sortable by any column. No filters in v1.
- Computed by `GET /admin/reports/cohort-overview` — a Lambda route that scans `events`, `daily_records`, `budget_state` and aggregates in-memory. ~50 lines of TS. See `data-export.md` "Reports beyond the standard export" for the pattern.

### Funnel chart
- Horizontal-bar chart, no library — just `<div>`s with width-percentages. We don't need d3 for 10 bars.
- Bars come from `GET /admin/reports/funnel`: per-event-type count and percentage of cohort.
- Standard funnel order (matches the event taxonomy in `architecture.md`):
  1. `app_opened`
  2. `login_succeeded`
  3. `wizard_started`
  4. `wizard_step_completed:N` (one bar per N)
  5. `wizard_completed`
  6. `pdf_generated`
  7. `daily_record_logged`
  8. `slip_uploaded`
- Refreshes every 30s (poll). No realtime. No WebSocket.

### Repayment progress
- Per-participant: total advance, total wages logged, % repaid. Bar chart.
- Computed from `daily_records` + `tracker_onboarding`.

---

## Auth & access control

- Cognito User Pool is shared with the user shells. Same `VITE_COGNITO_USER_POOL_ID` / `VITE_COGNITO_CLIENT_ID`.
- After login, the frontend reads `custom:role` from the JWT. If it's not `"admin"`, render "You don't have access" + logout button. Don't redirect to the user URLs — we don't want a worker accidentally landing in the wrong shell.
- Backend: every `/admin/*` route has `requireRole("admin")` Hono middleware. The user shells never call these.
- **Wysbryx team members** are seeded into Cognito with `role = "admin"` via the same `infra/pilot-cohort.json` seed (separate section in the JSON for admin entries).
- **Aditi** is `role = "admin"`. She uses the admin app to pull her data export and watch the funnel.

---

## UI guidelines

- **Tailwind default palette.** Slate grays, indigo accents, white surfaces. No custom design tokens. We're not selling this to anyone.
- **Tables and forms, not cards.** This is a desk tool, not a phone app.
- **Confirmation dialogs** on destructive actions (disable, delete, reset password). Type the participant's name to confirm — pattern stolen from GitHub.
- **One toast notification system** (`sonner` or similar). Errors loud, successes muted.
- **Loading states are spinners, not skeletons.** Speed-of-build matters more than feel.
- **The credential-slip PDF** opens in an iframe modal with a "Download" button. The PDF blob lives in browser memory only — never written to a tmp file, never persisted. Closing the modal discards it.

---

## Build sequence

Indicative working order, not deadlines (per `architecture.md` "Schedule philosophy"):

| Step | Milestone |
|---|---|
| 1 | Budget app auth + Dynamo persistence shipped → admin login + participants list works for free (same `packages/shared`, same API). |
| 2 | Invite + reset-password + credential-slip PDF + disable + delete actions wired. |
| 3 | Participant-detail state view + export page. |
| 4 | Funnel + cohort-overview reports. |
| 5 | Ships alongside budget app on the same `prod` deploy. |

If something slips, admin app gets cut to its bare minimum: list + invite + credential-slip + delete + export. Reports become v1.1.

---

## Open questions (none are blockers)

1. **Should disabled participants still show in the list, or hide by default?** Default: show with a "disabled" badge. Add a "hide disabled" toggle later if it gets noisy.
2. **Should the Aditi-facing experience be different from the Wysbryx-facing one?** No — we're not building two admin apps. If she wants something specific, log a v2.
3. **Do we need an "activity log" tab showing who did what when?** Not in v1. CloudWatch covers it.
4. **Should the funnel auto-refresh while open, or require manual refresh?** Default: 30s poll. Cheap; keeps the dashboard "live" without WebSocket complexity.
