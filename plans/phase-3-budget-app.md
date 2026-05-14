# Phase 3 — Budget App

**Spec refs:** [project-requirements-budget-app.md](../project-requirements-budget-app.md) — §5 screen flow, §6 Aditi's 9 deltas, §7 screen-by-screen requirements, §8 data model. [architecture.md](../architecture.md) — Events taxonomy, Marathi readiness.

## What

All 17 budget-app screens wired to DynamoDB, Aditi's 9 deltas baked in, paise arithmetic throughout, browser SpeechSynthesis TTS on every instructional screen, lazy-loaded `@react-pdf/renderer` PDF with Devanagari support, `react-i18next` defaulting to Marathi, and `events.track()` at every meaningful interaction. After this phase, a participant can complete the wizard, download a budget PDF, and log advance installments — all state persisting in `budget_state` and appearing in the `events` table.

## Preconditions

- Phase 2 complete: auth working, `GET /me` returns a user row.
- Village dropdown list in hand (or placeholder list per spec §13).
- Quiz copy and prioritization categories confirmed or placeholder used (spec §13).

## Steps (ordered)

1. **`budget_state` table in `infra/data.ts`.** PK `userId`, no SK, `PAY_PER_REQUEST`, `removalPolicy: "destroy"`. TypeScript schema in `packages/shared/src/types/budget.ts` (see spec §8 for the full blob shape).

2. **API routes in `packages/api/src/routes/budget.ts`.** `GET /budget-state` → DynamoDB `GetItem`. `PUT /budget-state` → `PutItem` (full blob). Both behind `requireAuth`. Mount in `index.ts`.

3. **i18n.** `packages/shared/src/i18n/en.json` + `mr.json`. Configure `react-i18next` with `mr` as the default locale. Language preference stored in `users` table via `PUT /me` and hydrated on next load. Every user-facing string goes through `t("key.path")` — no hardcoded English.

4. **17 screens in `apps/web/src/budget/`.** Implement in the order from spec §5. Key delta notes (spec §6):
   - Profile: first + last name fields; village as `<select>` from `config/villages.ts`.
   - Quiz: `+1` per correct selection, no penalties (delta 3).
   - Prioritization: expert tip inline during must/wait; no numeric score (delta 4); two-stage (list → classify); "Skip" button removed (delta 6).
   - Repayment estimate: labeled "BROAD estimate" (delta 5); formula verbatim from spec §7.10.
   - Budget PDF auto-generated after Stage 2 classification (delta 8).
   - Installment date: any past date accepted, no future dates (delta 9).
   - **All money stored in paise** (₹ × 100, integer arithmetic only).

5. **SpeechSynthesis TTS.** `packages/shared/src/hooks/useTTS.ts` wrapping `window.speechSynthesis.speak()` in the current i18n locale. "Read aloud" button on every instructional screen. No third-party TTS API.

6. **Lazy-loaded PDF route.** `React.lazy` wrapping the PDF screen. `@react-pdf/renderer` + Noto Sans Devanagari TTF (`/fonts/NotoSansDevanagari-Regular.ttf`, fetched with `cache: "force-cache"`, `Font.register()`'d once per session) load only on first PDF open. PDF contents per spec §7.14. "Download PDF" button + WhatsApp share link via a pre-signed S3 URL (same flow the tracker uses for slips).

7. **Events client.** `packages/shared/src/events/client.ts` + `types.ts` per [architecture.md](../architecture.md) Events section: fire-and-forget queue, localStorage persistence, 30s flush, sendBeacon on unload. `POST /events` batch ingest route in the Lambda. Fire all events from the standard taxonomy at the correct interaction points (spec §"Event tracking inside the budget flow").

8. **Auto-save.** Each wizard step's `onNext` calls `PUT /budget-state` before navigating. On load, `GET /budget-state` hydrates the wizard; the user resumes where they left off.

## Exit Criteria

- [ ] All 17 screens render and navigate correctly in both `en` and `mr`.
- [ ] Wizard state persists: close and reopen → resume at last step.
- [ ] Repayment estimate matches a manual calculation with known inputs (spec §7.10 formula).
- [ ] Money inputs stored in paise — verify directly in DynamoDB console.
- [ ] TTS plays on at least the four story/training screens (7.5, 7.6, 7.8, 7.9).
- [ ] PDF downloads with readable Devanagari text (not `□□□`).
- [ ] After a complete wizard run, the `events` table contains `wizard_started`, `wizard_step_completed` (×17), `wizard_completed`, `pdf_generated`.
- [ ] Installment logged with a past date appears correctly in the ledger (spec §7.17).

## Files Touched

```
infra/data.ts                                       (budget_state table)
packages/shared/src/types/budget.ts                 (new)
packages/shared/src/i18n/en.json, mr.json, index.ts (new)
packages/shared/src/hooks/useTTS.ts                 (new)
packages/shared/src/events/client.ts, types.ts      (new)
packages/shared/public/fonts/NotoSansDevanagari-Regular.ttf  (new)
packages/api/src/routes/budget.ts, events.ts        (new)
packages/api/src/index.ts                           (routes mounted)
apps/web/src/budget/                                (new — 17 screen components)
apps/web/src/shells/BudgetShell.tsx                 (wired)
scripts/import-translations.ts                      (new — XLSX → mr.json helper)
```
