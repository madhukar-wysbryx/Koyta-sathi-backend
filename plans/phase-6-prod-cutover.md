# Phase 6 — Prod Cutover

**Spec refs:** [deploy.md](../deploy.md) — prod deploy flow, approval gate, Route53 ALIAS records, teardown drill, runbook. [compliance.md](../compliance.md) — teardown checklist, pilot teardown steps.

## What

Promote the tested `dev` build to `prod`, write the production Route53 ALIAS records, seed the real pilot cohort, smoke-test all three subdomains, and hand off credentials to Aditi. After this phase, `budget.wysbryxapp.com`, `tracker.wysbryxapp.com`, and `admin.wysbryxapp.com` are live and the SOPPECOM training session can proceed.

## Preconditions

- Phase 5 complete: all three shells working end-to-end on `dev`; export ZIP verified; funnel chart working.
- **Teardown drill completed** ([deploy.md](../deploy.md) §Teardown drill): `sst remove --stage dev` run via `workflow_dispatch` then re-deployed from scratch. Confirms IaC fully describes the system and no console-only resources exist.
- Real pilot cohort list received from SOPPECOM (first name, last name, village, ~20 participants). Entered into `infra/pilot-cohort.json` (gitignored, never committed).
- Aditi's real Harvard email address confirmed for her admin invite.
- GitHub Environment "production" already configured with required reviewer = Krishna.

## Steps (ordered)

1. **Final `dev` smoke test.** Full happy-path run on `dev.*` subdomains: log in as a test participant, complete the budget wizard, download the PDF, log a daily tracker record, upload a slip, open the admin app, trigger an export, confirm the ZIP opens. Fix any issues before proceeding — prod is harder to roll back.

2. **Merge `main` → `prod` via PR.** Open a PR in GitHub. Re-read the diff. Merge. `deploy-prod.yml` starts and pauses at the environment approval gate.

3. **Krishna approves.** Open the pending workflow run in GitHub Actions. Review the deploy plan. Click "Approve and deploy." CI runs Biome + tsc + vitest + `sst deploy --stage prod`. First prod deploy takes ~5–10 min (CloudFront distribution creation is the slow step).

4. **Write prod Route53 ALIAS records.** After "deploy complete," SST outputs the prod CloudFront distribution domain. In the `wysbryxapp.com` hosted zone (payer account `wysbryxone`), create or update:
   - `budget.wysbryxapp.com` ALIAS → prod CloudFront domain
   - `tracker.wysbryxapp.com` ALIAS → prod CloudFront domain
   - `admin.wysbryxapp.com` ALIAS → prod CloudFront domain

5. **Seed prod cohort.** Run `pnpm tsx scripts/seed-prod.ts` (authenticated via SSO to the `koyta` account). Script reads `infra/pilot-cohort.json`, calls `AdminCreateUser` with `MessageAction=SUPPRESS` for each participant, writes credentials to `kothi/prod/credentials/participant-{NN}` (the project name `kothi` is the Secrets Manager namespace; the AWS account is `koyta` — see phase-0 naming note). Seeds Aditi + Wysbryx team as admin-role users without SUPPRESS (SES delivers welcome emails). Idempotent — safe to re-run on partial failure.

6. **Print credential slips.** In `admin.wysbryxapp.com`, log in as Krishna. For each participant: open their detail page, click "Generate credential slip," download the PDF. Print all slips. Facilitator distributes at SOPPECOM training; shred afterward.

7. **Prod smoke tests.** One real participant credential: complete `NEW_PASSWORD_REQUIRED`, verify Marathi wizard loads on `budget.wysbryxapp.com`. Log a test daily entry on `tracker.wysbryxapp.com`, then delete it via the admin app. As Aditi: trigger export from `admin.wysbryxapp.com`, confirm ZIP downloads. `GET <prod-api-url>/health` → 200.

8. **Hand off to Aditi.** Email her admin login + temp password. She receives the SES welcome email. Confirm she can log in and see the cohort list.

9. **Billing alarm.** In the `koyta` account Billing console, create a $50/month CloudWatch billing alarm emailing Krishna. Confirm it's active.

## Exit Criteria

- [ ] `dig budget.wysbryxapp.com`, `tracker.wysbryxapp.com`, `admin.wysbryxapp.com` all resolve (no NXDOMAIN).
- [ ] `GET <prod-api-url>/health` returns HTTP 200.
- [ ] A real participant credential completes `NEW_PASSWORD_REQUIRED` and lands in the Marathi budget wizard.
- [ ] `POST /admin/export` on prod returns a valid ZIP with correct row counts and all 8 CSVs.
- [ ] Aditi can log in to `admin.wysbryxapp.com` and view the cohort list.
- [ ] $50/month billing alarm active in CloudWatch.
- [ ] Credential slips printed, distributed, shredded.

## Files Touched

```
infra/pilot-cohort.json    (new — gitignored; created locally, seeded, then archived)
scripts/seed-prod.ts       (new — mirrors seed-dev.ts, targets prod stage)
docs/plans/README.md       (Status → Done for all phases)
```

---

**Post-pilot teardown** (not part of this phase — see [deploy.md](../deploy.md) §Tearing down and [compliance.md](../compliance.md) §Pilot teardown for the full checklist). Short version: final export → `sst remove --stage prod` via `workflow_dispatch` (with Krishna's approval) → `sst remove --stage dev` → verify zero remaining resources in AWS console → delete OIDC role → confirm zero charges next billing cycle.
