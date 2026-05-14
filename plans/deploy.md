# Koyta-Sathi — Deploy & Teardown Runbook

**Audience:** Wysbryx engineering. Future-you at 11pm before UAT. **Last updated:** 2026-05-09.

---

## TL;DR

```
git push origin main         # auto-deploys to dev stage in ~90s
git push origin production   # opens deploy in GitHub, waits for Krishna's approval
```

**Branch naming convention (do not confuse):** `main` is the GitHub default branch and deploys to the **`dev` stage**. `production` is the protected release branch and deploys to the **`prod` stage**. There is no "dev branch" and no "prod branch" — only `main` and `production`. The *stages* are named `dev` and `prod` (in `sst.config.ts`); the *branches* are `main` and `production`.

Teardown (end of pilot only):

```
sst remove --stage dev       # via CI workflow_dispatch, never locally
sst remove --stage prod      # ditto
```

URLs:
- **dev:** `dev.budget.wysbryxapp.com`, `dev.tracker.wysbryxapp.com`, `dev.admin.wysbryxapp.com`
- **prod:** `budget.wysbryxapp.com`, `tracker.wysbryxapp.com`, `admin.wysbryxapp.com`

If something is on fire, scroll to "If something goes wrong."

---

## The cardinal rule (Handmade lesson)

**Never run `sst deploy` (or `sst remove`) locally.** Ever. That's what caused production outages in the Handmade project — personal/developer stages leaked into shared environments, state files scattered across S3, Pulumi version mismatches caused lock failures.

Enforced two ways:

1. **Stages locked at config-eval time.** `sst.config.ts` checks the requested stage against `["dev", "prod"]` and throws on anything else. You literally cannot create a `--stage krishna` even if you try.
2. **CI is the only path to AWS.** GitHub Actions has the OIDC trust; your laptop does not. Local `sst dev` works fine for emulation against the `dev` stage's resources.

If you're tempted to bypass these for "just one quick fix": don't. Open a PR, push, wait 90 seconds.

---

## Prerequisites — one-time setup

Done once per machine.

### Local
- macOS or Linux. Windows users use WSL.
- Node 22.x (`nvm install 22 && nvm use 22`).
- pnpm via `corepack enable && corepack prepare pnpm@<version> --activate`.
- AWS CLI v2 (`brew install awscli`) for one-off ops (read-only, no deploy access).
- `aws configure --profile wysbryx-koyta-readonly` — fills in the access key for a read-only IAM user. **You do not need deploy permissions on your laptop.**
- Biome installed automatically via `pnpm install` (in `devDependencies`). Editor integration: install the Biome extension for VS Code / Zed / your editor of choice. Format-on-save = on.

### AWS account
- Single AWS account. Default region: `ap-south-1`.
- Root account locked behind hardware MFA. Day-to-day work via IAM Identity Center.
- Billing alarm at $50/month, email to Krishna.
- One wildcard ACM cert `*.wysbryxapp.com` in `us-east-1` (covers all three subdomains across both stages). Locked at bootstrap.
- Route53 hosted zone for `wysbryxapp.com` already exists (used by other Wysbryx projects). Subdomains delegated within the existing zone — no NS-record dance needed.
- SES production access for `wysbryxapp.com` already lifted. `noreply@wysbryxapp.com` is verified and ready as the sender for Cognito invites.

### GitHub
- Repo: `wysbryxtech/kothi`.
- Branches: `main` (default — deploys to `dev` stage), `production` (deploys to `prod` stage).
- Branch protection on `production`: require PR, no force-push, no deletions.
- GitHub Environment "production" with required reviewer = Krishna.
- AWS OIDC trust set up: `https://token.actions.githubusercontent.com` as identity provider, role `arn:aws:iam::<acct>:role/kothi-github-deploy` with `sts:AssumeRoleWithWebIdentity` from `repo:wysbryxtech/kothi:ref:refs/heads/main` and `:ref:refs/heads/production`.
- Repo secrets: none. OIDC, not access keys.
- Repo variables: `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION=ap-south-1`.

---

## Day-to-day

### Local dev loop

```
git checkout main
git pull
pnpm install
pnpm dev:api          # runs sst dev --stage dev (Hono in local Lambda emulation, real Cognito/Dynamo/S3)
```

In separate terminals:

```
pnpm --filter budget dev    # http://localhost:5173
pnpm --filter tracker dev   # http://localhost:5174
pnpm --filter admin dev     # http://localhost:5175
```

Each SPA's `vite.config.ts` reads `VITE_API_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID` from `.env.local`. `sst dev` writes them for you, OR pull from the latest deploy outputs:

```
aws ssm get-parameters-by-path --path /sst/kothi/dev --region ap-south-1
```

### Pushing to dev stage (via `main`)

```
git checkout main
git pull
git add ...
git commit -m "<one short imperative line>"
git push origin main
```

GitHub Actions runs:
1. `pnpm biome ci` (lint + format check, fails on any diff)
2. `pnpm tsc --noEmit` (typecheck)
3. `pnpm vitest run` (unit tests)
4. `pnpm sst deploy --stage dev`

Takes ~60-90s for code-only changes, longer for first-time infra changes. Watch in the Actions tab.

After deploy: the three `dev.*.wysbryxapp.com` subdomains reflect the new build. CloudFront invalidation handled by SST as part of `StaticSite` deploy — no manual step needed.

### Pushing to prod stage (via `production`)

```
git checkout production
git merge main         # or open a PR from main → production
git push origin production
```

GitHub Actions starts the deploy and stalls waiting for environment approval. Krishna gets a notification, opens the run, clicks "Approve and deploy." Then it runs.

**Do not approve your own deploys without re-reading the diff.** The whole point of the gate is one human pause before prod.

---

## Deploying for the first time (fresh AWS account)

This is the path Krishna walks once during initial bootstrap.

### Async-blocking items — start FIRST

Wall-clock dependencies. Kick them off before writing infra code.

1. **Subdomain delegation.** Confirm `wysbryxapp.com` is on Route53 (it is — used by other Wysbryx projects). The three subdomains will be created as records in the existing hosted zone — no NS-propagation wait.
2. **ACM certs in `us-east-1`.** Request via console or `aws acm request-certificate --region us-east-1 --domain-name *.wysbryxapp.com --validation-method DNS` (or six specific names). Add validation CNAMEs to Route53. Wait for "Issued."
3. **GitHub OIDC trust.** Create the IAM identity provider + role. Trust policy + thumbprint setup is a known 1-2h debug session. Don't put on the critical path.
4. **AWS account confirmed in `ap-south-1`.** Quotas check: Lambda concurrent ≥ 100, Cognito User Pools ≥ 5.

### Then deploy

Push an empty commit to `main`:

```
git commit --allow-empty -m "bootstrap dev"
git push origin main
```

CI runs `sst deploy --stage dev`. First deploy takes ~5-10 min: creates the Cognito User Pool, 6 Dynamo tables, 2 S3 buckets (web + slips), API Gateway, single Lambda, **one** CloudFront distribution with 3 alternate domain names, 3 Route53 records, ~20 Secrets Manager secrets (one per seeded participant).

After "deploy complete":
- Three `dev.*.wysbryxapp.com` subdomains should resolve, all serving the same SPA bundle, each mounting its own shell based on hostname.
- Hit `GET /health` (URL printed by SST) — should return 200.
- Cognito console: User Pool exists with seeded users.
- Dynamo console: 6 tables exist and are empty.
- Secrets Manager console: ~20 `kothi/dev/credentials/participant-NN` secrets exist.

Then deploy `prod` stage (via `production` branch):

```
git checkout production
git push origin production
# Krishna approves in GitHub
```

---

## Tearing down

### End of pilot (intentional teardown)

**Do not run `sst remove` from your laptop.** Use the `workflow_dispatch` teardown workflow:

```
gh workflow run teardown.yml --ref production -f stage=prod -f confirm="I-understand-this-deletes-everything"
```

The workflow:

1. Triggers the final data export (calls `POST /admin/export` server-side, attaches the resulting ZIP as a workflow artifact).
2. Waits for Krishna's approval (same Environment gate as `prod` deploy).
3. Runs `sst remove --stage prod`.

SST tears down in dependency order: CloudFront distribution (slow — 15-20 min for CF deletion), API Gateway, Lambda, S3 buckets (force-emptied), Secrets Manager secrets (immediate delete via `recoveryWindowInDays: 0`), Dynamo tables, Cognito User Pool.

After "remove complete":
1. Open AWS console, switch to `ap-south-1`. Verify zero remaining: Dynamo (no tables), S3 (no buckets), Lambda (no functions), Cognito (no user pool), API Gateway (no API), Secrets Manager (no secrets).
2. Switch to `us-east-1`. CloudFront should show zero distros for the `prod` stage. ACM certs can stay (no cost) or be deleted.
3. Route53 records for `prod` subdomains gone.
4. Delete the IAM OIDC provider + GitHub deploy role (optional, no cost).
5. Confirm zero AWS charges in the next billing cycle.

Then the same for `dev`:

```
gh workflow run teardown.yml --ref main -f stage=dev -f confirm="I-understand-this-deletes-everything"
```

### Teardown drill (during build, before pilot starts)

Once during build, run the dev teardown workflow then re-deploy from scratch by pushing to `dev`. This confirms:
- IaC fully describes the system (no console-only resources).
- Teardown actually completes (no orphaned resources surviving `removalPolicy: "destroy"`).
- Re-deploy works without manual fixup.

If anything resists removal or requires manual cleanup, fix the IaC, not the resource. Console fixes today = pain at end of pilot.

---

## If something goes wrong

### "I pushed to prod and broke it"

1. **Don't panic.** GitHub Environment gate should have caught you, but if it didn't and you self-approved:
2. `git revert <sha>` on `prod`, push. Wait for the approval gate. Approve. Deploy.
3. If you can't wait, manually trigger `workflow_dispatch` of the deploy workflow with the previous good SHA.
4. **Never** SSH-style fix Lambda code via the AWS console. Always revert via git + CI.

### "The deploy hangs"

- CloudFront updates can take 15-20 min. Be patient.
- Cognito User Pool changes can take 5 min.
- If >30 min, check the SST log for the actual stuck resource. Pulumi (under SST v3) sometimes deadlocks on cross-resource dependencies. Trigger the teardown workflow for the broken stage, then re-deploy.

### "DNS doesn't resolve"

- `dig <subdomain>.wysbryxapp.com` — check NXDOMAIN vs wrong IP.
- If NXDOMAIN: Route53 A-record missing. Check `infra/web.ts`.
- If wrong IP: CloudFront distro mapped to wrong cert/origin. Check `infra/web.ts`.
- If "no such cert": ACM cert in `us-east-1` not validated. Add CNAME, wait.

### "Cognito JWT rejected by Hono middleware"

- Check the JWKS URL the middleware fetches matches the Cognito User Pool URL for the current stage. SST wires this via `Resource` linking; if it's wrong, the cause is usually a stale linked resource from a prior deploy.
- `pnpm sst outputs --stage <stage>` to confirm the User Pool ID + region match the JWT's `iss` claim.
- The Hono middleware caches the JWKS in-memory; a Lambda restart picks up changes within the next invocation.

### "AWS bill is higher than expected"

- Open Cost Explorer, filter to last 7 days, group by service. Usual suspects:
  - **CloudWatch Logs** > Lambda invocations: log retention not set to 7 days, or the Lambda is logging entire request bodies. Find it, fix the middleware.
  - **Dynamo** > $0: PITR accidentally enabled. Disable.
  - **S3** > a few cents: slip uploads spike. Check client-side image compression is actually running.
  - **Cognito** > $0: Advanced Security Features got enabled. Disable.
  - **SES** > a few cents: invitation emails spike — fine, that's the system working. >$1/month means somebody wired a noisy notification flow we shouldn't have.

### "I need to add a new pilot user mid-pilot"

Two paths, prefer the admin-app path:

1. **Via admin app:** open `admin.wysbryxapp.com`, sign in as admin, click "Invite user," fill in the form. The admin Lambda calls `AdminCreateUser`, Cognito sends the invitation email via SES.
2. **Via seed script (bulk):** edit `infra/pilot-cohort.json` (gitignored), add the rows, push to `main` then `production`. Krishna approves. The seed script `AdminCreateUser`s any new entries idempotently.

### "I need to delete a pilot user mid-pilot"

Use the admin app's "Delete user" action, or directly:

```
curl -X DELETE https://api.koytasathi.../admin/users/<userId> \
     -H "Authorization: Bearer <admin JWT>"
```

This soft-deletes from Cognito (`AdminDisableUser` + `AdminUserGlobalSignOut`) and hard-deletes the user's rows from Dynamo + S3 prefix. Documented in `data-export.md`.

---

## Things you'll probably forget

- The CloudFront cache for `index.html` and `sw.js` must be `no-cache`. If a deploy looks "stuck" — code is updated but the browser shows old UI — clear browser cache and check the response headers on `index.html`.
- `sst dev` requires AWS creds with the deploy role; your laptop's read-only profile is not enough. **You must use the GitHub OIDC role for `sst dev`** — request a temporary STS token via `aws sts assume-role-with-web-identity` if you need to run it from a non-CI context. (Or just don't run `sst dev` and use unit tests + the deployed `dev` stage URL.)
- Adding a new route requires updating `apps/api/src/routes/`. SST won't auto-discover new files; mount them in `apps/api/src/index.ts`.
- Marathi font for PDFs: registered lazily on first PDF open, fetched from `/fonts/NotoSansDevanagari-Regular.ttf`. If PDFs render with `□□□`, the fetch failed; check Network tab.
- The Pulumi cleanup step in CI (`sudo rm -f /usr/local/bin/pulumi*`) is critical. Without it, GitHub-runner-installed Pulumi version conflicts with SST's bundled Pulumi and you get cryptic state-lock errors.

---

## Things this runbook deliberately doesn't cover

- Hotfixing prod by editing Lambda code in the AWS console. **Don't.** Always go through CI.
- Manual Dynamo writes via the console for "just one fix." **Don't.** Add an admin endpoint, deploy, run, optionally remove.
- Bypassing the approval gate. **Don't.** If you must, document why in the commit message.
- Running `sst deploy` locally. **Don't, ever.** That's the cardinal rule.
