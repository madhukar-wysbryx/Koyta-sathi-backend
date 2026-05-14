# Koyta-Sathi — Execution Plan Index

**Audience:** Wysbryx engineering. **Last updated:** 2026-05-10.

Each phase doc below describes what to build, the preconditions to start, the ordered steps, and binary exit criteria. They link to the locked specs in `docs/` rather than duplicating them — if detail is missing here, the spec has it.

## Phases

| # | Doc | Spec refs | Status |
|---|-----|-----------|--------|
| 0 | [Bootstrap](phase-0-bootstrap.md) | *(no prior spec — this doc is the spec)* | Not Started |
| 1 | [Monorepo skeleton](phase-1-monorepo-skeleton.md) | [architecture.md](../architecture.md) | Not Started |
| 2 | [Auth & shells](phase-2-auth-and-shells.md) | [architecture.md](../architecture.md) | Not Started |
| 3 | [Budget app](phase-3-budget-app.md) | [project-requirements-budget-app.md](../project-requirements-budget-app.md) | Not Started |
| 4 | [Tracker app](phase-4-tracker-app.md) | [project-requirements-tracker-app.md](../project-requirements-tracker-app.md) | Not Started |
| 5 | [Admin app](phase-5-admin-app.md) | [admin-app.md](../admin-app.md), [data-export.md](../data-export.md) | Not Started |
| 6 | [Prod cutover](phase-6-prod-cutover.md) | [deploy.md](../deploy.md) | Not Started |

## Conventions across all phases

- **~400 words per doc.** Detail lives in the spec; the phase doc is the checklist, not the spec.
- **All money in paise.** ₹1 = 100 paise, integer arithmetic only. No floats anywhere in the money chain.
- **Never deploy locally.** `sst deploy` runs only in GitHub Actions via OIDC. `pnpm dev` + `sst dev` are fine for local work.
- **`main` branch = `dev` stage. `production` branch = `prod` stage.** The stage guard in `sst.config.ts` throws on anything else. (`main` is the GitHub default; `production` is the protected release branch.)
- **`_client-artifacts/` is gitignored and stays local.** Mockups, SOW, slack context — never committed.
- **Pulumi-strip step is required in every CI workflow** that calls SST (`sudo rm -f /usr/local/bin/pulumi*`). Without it, the runner's pre-installed Pulumi version conflicts with SST's bundled one and produces cryptic state-lock failures.
- **ap-south-1 for everything except ACM certs** (which must be in us-east-1 for CloudFront). PIN this in `sst.config.ts` from day one.
- **No long-lived IAM access keys** in the `kothi` AWS account. GitHub Actions uses OIDC; local work uses IAM Identity Center SSO or a read-only profile.
- **Update the Status column above** when a phase is entered (→ In Progress) and completed (→ Done). That's the only project tracking required.
