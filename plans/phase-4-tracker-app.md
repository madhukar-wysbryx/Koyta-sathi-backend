# Phase 4 — Tracker App

**Spec refs:** [project-requirements-tracker-app.md](../project-requirements-tracker-app.md) — §5 IA & flow, §6 screen-by-screen, §6.4 wage formula (authoritative — do not change without Aditi), §7 data model. [architecture.md](../architecture.md) — S3 slip photos, Events taxonomy.

## What

The full tracker shell: 5-step onboarding wizard, 4-tab main app (Home/Ledger/Slips/Toli), Add Daily Entry modal with live wage preview, slip photo capture + S3 upload via `browser-image-compression`, and a lazy-loaded Season Ledger PDF. All wage values computed and stored in paise at write-time; `ratesVersionId` snapshotted on every `daily_record`. After this phase, a participant who finished budget-app onboarding lands in the tracker recognized and can log daily work and photograph slips.

## Preconditions

- Phase 3 complete: budget app working end-to-end; events client in `packages/shared`; i18n + PDF infra reusable.
- `ratesVersionId` for 2026-27 SOPPECOM rates confirmed with Aditi (placeholder `"v1"` acceptable until Chakda rate arrives — spec §13).
- Noto Sans Devanagari TTF already present in `packages/shared/public/fonts/`.

## Steps (ordered)

1. **Three DynamoDB tables + S3 slip bucket in `infra/data.ts`.**
   - `tracker_onboarding` — PK `userId`, blob, `removalPolicy: "destroy"`.
   - `daily_records` — PK `userId`, SK `occurredOn` (YYYY-MM-DD), `removalPolicy: "destroy"`.
   - `slips` — PK `userId`, SK `slipId` (ULID), `removalPolicy: "destroy"`.
   - S3 bucket `kothi-{stage}-slips`: `BlockPublicAccess: all`, SSE-S3, `forceDestroy: true`, noncurrent-versions lifecycle 1 day.

2. **API routes in `packages/api/src/routes/tracker.ts` + `slips.ts`.** All behind `requireAuth`.
   - `GET /tracker-onboarding`, `PUT /tracker-onboarding` — blob read/write.
   - `GET /daily-records` — `Query` on `userId`; return records newest-first + dashboard aggregates.
   - `POST /daily-records` — upsert on `(userId, occurredOn)`. **Compute and store wages at write-time** (paise integers); snapshot `ratesVersionId`. Uses per-day toli override if provided; otherwise onboarding toli.
   - `POST /slips/upload-url` — 5-min pre-signed S3 PUT URL; write metadata to `slips` table.
   - `GET /slips` — list slip metadata with 1-hour download pre-signed URLs.

3. **Wage formula in `packages/shared/src/lib/wages.ts`.** Implement verbatim from spec §6.4. Rate constants in `packages/shared/src/data/rates.ts` keyed by `ratesVersionId`. Boys/girls helping tracked but excluded from the divisor. All money as paise integers. **Do not refactor the formula without Aditi's approval.**

4. **Onboarding wizard B1–B5 in `apps/web/src/tracker/onboarding/`.** Skip B1 (Welcome) and profile step if `users.firstName` already populated (budget app done). B3 shows live weighted-koyta-count preview (`full + 0.5 × half`). B4 shows read-only per-ton rate for the selected vehicle type. On completion, `PUT /tracker-onboarding`.

5. **4-tab main app in `apps/web/src/tracker/`.** Bottom-tab nav; FAB opens Add Daily Entry modal. Screens per spec §6.7–6.12:
   - **Home:** debt remaining (red), wages earned (green), repayment bar; 2×2 stats grid.
   - **Ledger:** newest-first; tap row → expand with raw inputs + computed wages; "Download PDF."
   - **Slips:** thumbnail grid via pre-signed URLs; tap → full-screen.
   - **Toli/Profile:** language toggle, download ledger PDF, logout, delete-my-data.

6. **Add Daily Entry modal (spec §6.10).** Date defaults to today, no future dates. Day status chips; when Harvesting: start/end time, vehicles filled (+/- stepper), collapsible per-day toli override. Live wage preview updates as user types. Form state in `sessionStorage`, cleared on successful POST ("no connection" banner if network drops mid-save).

7. **Slip capture + upload (spec §6.11).** `<input type="file" accept="image/*" capture="environment">`. Client-side compress via `browser-image-compression` to ~150 KB, max 1600 px, JPEG. Upload to S3 via pre-signed PUT. Optional metadata (factory name, slip date, voucher amount) editable post-upload.

8. **Season Ledger PDF (spec §6.13).** `React.lazy`-wrapped; reuses font registration from phase 3. Cover page + summary stats + day-by-day table (paginated natively) + slips appendix (metadata list, no thumbnails). Fire `pdf_generated` + `pdf_downloaded` events.

9. **Wire events.** `tracker_onboarding_started`, `wizard_step_completed` per step, `tracker_onboarding_completed`, `daily_record_logged`, `slip_uploaded` — per [architecture.md](../architecture.md) Events taxonomy.

## Exit Criteria

- [ ] Budget-app user lands in tracker with name/village recognized; no re-onboarding of profile fields.
- [ ] Onboarding persists: close and reopen, skip straight to main app.
- [ ] Daily record wage math: `vehicles_filled=3, tons_per_vehicle=10, vehicle_type=Truck, full_m=2, full_w=1` → `koyta_wages = 408,410 paise`. Verify stored value in DynamoDB.
- [ ] `ratesVersionId` present on every `daily_records` item.
- [ ] Slip photo serves from S3 via pre-signed URL in the Slips tab.
- [ ] Season Ledger PDF renders Devanagari, paginates for multiple records.
- [ ] Per-day toli override changes the wage for that day only; historical records unaffected.

## Files Touched

```
infra/data.ts                                         (3 tables + S3 bucket)
packages/shared/src/types/tracker.ts                  (new)
packages/shared/src/lib/wages.ts                      (new)
packages/shared/src/data/rates.ts                     (new)
packages/api/src/routes/tracker.ts, slips.ts          (new)
packages/api/src/lib/s3.ts                            (new)
packages/api/src/index.ts                             (routes mounted)
apps/web/src/tracker/                                 (new — all screens)
apps/web/src/shells/TrackerShell.tsx                  (wired)
apps/web/public/manifest.tracker.webmanifest          (finalized)
```
