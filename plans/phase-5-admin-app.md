# Phase 5 — Admin App

**Spec refs:** [admin-app.md](../admin-app.md) — scope, 7 routes, reports, UI guidelines. [data-export.md](../data-export.md) — 8 CSV column shapes (stable, append-only), ZIP structure, pseudonymisation.

## What

Seven Wouter routes in `<AdminShell />`, the full participant lifecycle (invite → credential-slip → reset-password → disable → hard-delete cascade), a `POST /admin/export` route streaming a ZIP of 8 CSVs via `archiver`, and 3 report routes powering cohort overview + engagement funnel + repayment progress. Built alongside the budget app; ships in the same `dev`-then-`prod` deploy. After this phase, Krishna can manage the cohort and Aditi can pull her data export from `admin.wysbryxapp.com` without touching the AWS console.

## Preconditions

- Phase 3 complete: all DynamoDB tables exist; `events` client writing events.
- Phase 4 at least started: `tracker_onboarding` and `daily_records` tables exist (the export scans them).
- Lambda IAM role grants for Secrets Manager (`GetSecretValue`, `PutSecretValue` on `kothi/{stage}/*`) and Cognito admin APIs added in `infra/auth.ts`.

## Steps (ordered)

1. **Secrets Manager wrapper in `packages/api/src/lib/secrets.ts`.** `getSecret(path)` / `putSecret(path, payload)` using `@aws-sdk/client-secrets-manager`. Add IAM grants to the Lambda role in `infra/auth.ts`.

2. **Admin routes in `packages/api/src/routes/admin.ts`.** All behind `requireRole("admin")`:
   - `GET /admin/users` — scan `users` table.
   - `POST /admin/users` — auto-generate `participant-NN@wysbryxapp.com` alias; `AdminCreateUser` with `MessageAction=SUPPRESS` for `role=participant` (no SUPPRESS for `role=admin` — SES delivers welcome email); write `{ login, tempPassword, realName, village, createdAt }` to Secrets Manager at `kothi/{stage}/credentials/participant-{NN}`.
   - `GET /admin/users/:userId` — user row + both state blobs + last 30 `daily_records` + slip metadata.
   - `GET /admin/users/:userId/credential-slip` — read Secrets Manager; return `{ login, tempPassword, firstName, lastName, village }`. Frontend renders the PDF.
   - `POST /admin/users/:userId/reset-password` — `AdminSetUserPassword` (temp=true); update Secrets Manager entry.
   - `POST /admin/users/:userId/disable`, `enable` — `AdminDisableUser` / `AdminEnableUser`.
   - `DELETE /admin/users/:userId` — hard-delete cascade: Cognito (`AdminDisableUser` + `AdminDeleteUser`) + all 6 Dynamo tables (Query + BatchWriteItem) + S3 prefix `slips/{userId}/` + Secrets Manager (`recoveryWindowInDays: 0`).

3. **`POST /admin/export`.** Rate-limit: 1 request per 5 min per principal (in-memory token bucket). Scan all 8 tables; flatten `budget_state` blob into `budget_state.csv`, `priority_categories.csv` (long-format), and `installments.csv`. Pseudonymise: `participant_id = SHA256(userId + EXPORT_SALT).slice(0,16)` — salt in SST `Config.Secret`. Emit CSVs via `papaparse` with **stable column ordering per [data-export.md](../data-export.md) — append new columns only, never insert**. Stream-ZIP via `archiver` to private S3 prefix; return 24h signed URL + `manifest.json`.

4. **Report routes.** Use `scanAll<T>()` helper from `packages/api/src/lib/reports.ts` (pattern in [data-export.md](../data-export.md) §Reports):
   - `GET /admin/reports/cohort-overview` — per-user budget completion %, days logged, slips uploaded, debt remaining.
   - `GET /admin/reports/funnel` — per-event-type counts as % of cohort, in standard taxonomy order.
   - `GET /admin/reports/repayment-progress` — wages-vs-advance per user.

5. **7 admin route components in `apps/web/src/admin/`.** Per [admin-app.md](../admin-app.md) §Routes:
   - `/login` — standard Amplify login; role check post-login.
   - `/` — counters + funnel chart (horizontal-bar `<div>`s with width-percentages, no library; 30s poll).
   - `/participants` — sortable table.
   - `/participants/new` — invite form; on success, immediately renders credential-slip PDF in iframe modal.
   - `/participants/:id` — all-state view; destructive actions (reset, disable, delete) require name-confirmation dialog.
   - `/reports` — funnel + cohort overview + repayment progress tables.
   - `/export` — single button; polls until signed URL ready; triggers download.

6. **Credential-slip PDF component.** `@react-pdf/renderer` in-browser. PDF blob via `URL.createObjectURL`; "Download" saves it. `URL.revokeObjectURL` on modal close. **Never written to a tmp file or persisted server-side.**

## Exit Criteria

- [ ] Invite participant → Cognito user created + Secrets Manager entry at `kothi/dev/credentials/participant-{NN}` + credential-slip PDF renders and downloads.
- [ ] Modal close: credential-slip PDF no longer accessible (object URL revoked).
- [ ] Reset password → Secrets Manager `tempPassword` updated; credential-slip shows new password.
- [ ] Delete participant → item absent from all 6 Dynamo tables, S3 prefix empty, Cognito user gone, Secrets Manager entry gone (verify in AWS console).
- [ ] Export ZIP contains all 8 CSVs; column order matches [data-export.md](../data-export.md) exactly; `manifest.json` row counts are accurate.
- [ ] Second export within 5 min returns a rate-limit error message.
- [ ] Funnel chart reflects new events within one 30s poll cycle.

## Files Touched

```
infra/auth.ts                                         (Lambda IAM grants for Cognito + Secrets)
packages/api/src/lib/secrets.ts                       (new)
packages/api/src/lib/reports.ts                       (new)
packages/api/src/routes/admin.ts                      (new)
packages/api/src/index.ts                             (admin routes mounted)
apps/web/src/admin/                                   (new — 7 route components)
apps/web/src/admin/CredentialSlipPdf.tsx              (new)
apps/web/src/shells/AdminShell.tsx                    (wired)
```
