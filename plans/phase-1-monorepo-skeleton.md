# Phase 1 — Monorepo Skeleton

**Spec refs:** [architecture.md](../architecture.md) — repo layout, stack at a glance, CI/CD, Biome, SST stages. [deploy.md](../deploy.md) — CI workflow steps, cardinal rule, Pulumi-strip.

## What

A deployable-but-empty shell: pnpm workspaces, three SPA shell stubs, a single Hono Lambda with `/health`, SST infra wiring CloudFront + S3 + API Gateway, three CI workflows, Biome v2, Sentry bootstrapped, and Secrets Manager namespace pre-seeded. After this phase, every push to `main` auto-deploys to `dev`; the three `dev.*.wysbryxapp.com` subdomains resolve; CI is green.

## Preconditions

- Phase 0 complete: `koyta` AWS account ready, OIDC role exists, ACM cert issued, SST bootstrapped, `AWS_DEPLOY_ROLE_ARN` / `AWS_REGION` set in GitHub.
- Route53 ALIAS records for `dev.*` will be written manually after the first successful deploy (phase 0, step 6).

## Steps (ordered)

1. **Init pnpm workspace.** Root `package.json` with `packageManager` pinned; `pnpm-workspace.yaml` listing `apps/*`, `packages/*`, `infra`; `tsconfig.base.json` strict mode.

2. **Scaffold packages.**
   - `apps/web/` — Vite + React 19 + TS + Tailwind v4 + `vite-plugin-pwa`. `src/main.tsx` reads `window.location.hostname` and renders the matching shell stub (see [architecture.md](../architecture.md) Bootstrap section for the exact hostname map). Add `manifest.budget.webmanifest` and `manifest.tracker.webmanifest` to `public/`.
   - `packages/shared/src/index.ts` — empty barrel.
   - `packages/api/src/index.ts` — Hono app, one `GET /health` route, Lambda handler export.

3. **Biome v2.** Root `biome.json`: lint + format + import sort enabled. Add `eslint-plugin-react-hooks` alongside for exhaustive-deps (Biome doesn't cover this yet). Both run in CI.

4. **`sst.config.ts`.** Pin `ap-south-1`. Add the stage guard (throws immediately on any stage outside `["dev", "prod"]`). Add `infra/auth.ts`, `infra/data.ts`, `infra/api.ts`, `infra/web.ts` as minimal stubs — enough to deploy without errors.

5. **`infra/web.ts`.** One `StaticSite` with three alternate domain names. CloudFront cache policy: hashed assets `max-age=31536000,immutable`; `index.html`, `sw.js`, manifests `no-cache`. SPA fallback `index.html` for 403/404. CloudFront Function (~10 lines) rewriting `/manifest.webmanifest` requests to the subdomain-specific file per `Host` header.

6. **CI workflows (three files).** All use OIDC (`aws-actions/configure-aws-credentials`) — no stored keys.
   - `ci.yml` — triggers on PRs. Steps: frozen install, `pnpm biome ci`, `pnpm tsc --noEmit`, `pnpm vitest run`.
   - `deploy-dev.yml` — triggers on push to `main`. Adds: **`sudo rm -f /usr/local/bin/pulumi*`** (Pulumi-strip, required), then `pnpm sst deploy --stage dev`. Concurrency group `deploy-dev`, cancel-in-progress.
   - `deploy-prod.yml` — push to `production` branch, same as dev workflow but `environment: production` (requires Krishna's approval), stage `prod`, concurrency group `deploy-prod`.

7. **Seed Secrets Manager namespace.** One-time manual script `scripts/seed-dev.ts`: creates a test participant secret at `kothi/dev/credentials/participant-01`. Run authenticated via SSO; never runs in CI.

8. **Sentry.** DSN stored as SST `Config.Secret`. Initialize in `apps/web/src/main.tsx` before shell mount; tag every event with the active shell. User identifier = hashed `participant_id` — no email/name.

9. **Push to `main`.** After deploy completes, write `dev.*` Route53 ALIAS records (phase 0, step 6).

## Exit Criteria

- [ ] `pnpm biome ci`, `pnpm tsc --noEmit`, `pnpm vitest run` all pass in CI.
- [ ] Push to `main` triggers `deploy-dev.yml`; `sst deploy --stage dev` completes.
- [ ] `https://dev.budget.*`, `https://dev.tracker.*`, `https://dev.admin.wysbryxapp.com` each serve the stub SPA with the correct shell heading.
- [ ] `GET <api-url>/health` returns HTTP 200.
- [ ] Push to `production` branch pauses at the environment approval gate.
- [ ] `pnpm sst deploy --stage krishna` throws at config-eval time.

## Files Touched

```
sst.config.ts
package.json, pnpm-workspace.yaml, tsconfig.base.json
biome.json
apps/web/                            (Vite scaffold + 3 shell stubs)
packages/shared/src/index.ts
packages/api/src/index.ts            (Hono + /health)
infra/auth.ts, data.ts, api.ts, web.ts
.github/workflows/ci.yml
.github/workflows/deploy-dev.yml
.github/workflows/deploy-prod.yml
scripts/seed-dev.ts
```
