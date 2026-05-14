# Phase 0 — Bootstrap

**Spec refs:** This doc is the spec. No prior doc covers bootstrap. Constraints in [architecture.md](../architecture.md) §CI/CD and [deploy.md](../deploy.md) §Cardinal rule govern every decision here.

> **Naming note.** The AWS member account is named **`koyta`** (root email `krishna+koyta@wysbryx.com`). The project, repo, IAM role names, SST resource prefixes, and Secrets Manager paths all stay **`kothi`** (`kothi-github-deploy`, `kothi-dev-users`, `kothi/dev/credentials/...`). The two names are deliberately different — don't "fix" them.

## What

Stand up the `koyta` AWS member account, wire GitHub OIDC so CI can deploy without long-lived keys, issue the wildcard ACM cert in `us-east-1`, and run the SST Ion bootstrap. After this phase, phase 1's `deploy-dev.yml` can execute `sst deploy --stage dev` and succeed.

## Preconditions

- Access to payer account `wysbryxone` (347156581996) with org admin rights.
- `wysbryxapp.com` hosted zone exists in Route53 in the payer account.
- GitHub repo `wysbryxtech/kothi` exists (private, `main` default branch).
- SES production access already lifted for `wysbryxapp.com` in `ap-south-1`.

## Steps (ordered)

**1. Create `koyta` member account.** Under org `o-r97w8z29rk`, add member account named `koyta` (root email `krishna+koyta@wysbryx.com`). Mirror contact/support tier of sibling `handmade`. Note the new account ID.

**2. Enable IAM Identity Center SSO.** Add the `koyta` account to the SSO instance. Create a permission set (PowerUserAccess or scoped equivalent). Assign Krishna.

**3a. Request wildcard ACM cert (async — start immediately, runs in parallel with 3b).** In the `koyta` account, switch to `us-east-1`:
```
aws acm request-certificate --region us-east-1 \
  --domain-name "*.wysbryxapp.com" --validation-method DNS
```
Copy the CNAME validation record. Add it to the `wysbryxapp.com` zone in the **payer account** (zone lives there, not in `koyta`). Wait for status "Issued." Note cert ARN for `infra/web.ts`.

**3b. Create GitHub OIDC role (parallel with 3a).** In the `koyta` account IAM:
1. Add OIDC identity provider: URL `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
2. Create role `kothi-github-deploy`. Trust policy condition `StringLike` on `sub`:
   ```
   repo:wysbryxtech/kothi:ref:refs/heads/main
   repo:wysbryxtech/kothi:ref:refs/heads/production
   ```
   **Scoped to `main` and `production` only — not `*`.**
3. Attach an inline policy covering what SST v3 Ion needs: S3, CloudFormation, IAM PassRole, CloudFront, ACM read, Cognito, DynamoDB, Lambda, API Gateway, Secrets Manager, Route53 record writes, SES identity read.
4. **No access keys created.**

**4. Set GitHub repo variables.** In `wysbryxtech/kothi` Settings → Variables: `AWS_DEPLOY_ROLE_ARN` (the role ARN above), `AWS_REGION=ap-south-1`. No secrets — OIDC needs no stored credentials.

**5. SST Ion bootstrap.** Authenticated via SSO to the `koyta` account, from a local shell inside the repo:
```
pnpm sst bootstrap --stage dev
```
Creates the SST state S3 bucket and bootstrap CloudFormation stack in `ap-south-1`. Run once.

**6. Route53 ALIAS records (deferred — after first phase-1 deploy).** After `sst deploy --stage dev` completes, SST prints the CloudFront distribution domain. Create ALIAS records in the `wysbryxapp.com` zone (payer account): `dev.budget.*`, `dev.tracker.*`, `dev.admin.*` → CloudFront domain. Repeat for prod ALIAS records after the first prod deploy (phase 6).

## Exit Criteria

- [ ] `koyta` account visible in AWS Org; account ID noted.
- [ ] Krishna can log in to `koyta` via IAM Identity Center SSO.
- [ ] ACM cert for `*.wysbryxapp.com` in `us-east-1` shows status **Issued**.
- [ ] A GitHub Actions test step (`aws sts get-caller-identity`) authenticates via OIDC and returns the `kothi-github-deploy` role ARN (the IAM role keeps the project name).
- [ ] `pnpm sst bootstrap --stage dev` exits 0; SST state S3 bucket visible in `ap-south-1`.
- [ ] Zero IAM access keys exist in the `koyta` account.

## Files Touched

*(No repo files in this phase — all work is in AWS console and GitHub Settings.)*
