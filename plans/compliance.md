# Koyta-Sathi — Compliance Posture

**Audience:** Wysbryx engineering. **Status:** Internal. Reflects defaults baked into IaC. **Last updated:** 2026-05-09.

---

## TL;DR

Aditi runs a Harvard human-subjects pilot on ~20 sugarcane workers in Maharashtra. The data she collects is biometric + financial PII of identifiable Indian agricultural workers. **Engineering does not gate prod deploy on Aditi producing IRB documentation** — she has IRB approval (her project couldn't legally exist without it) and the commercial team carries that conversation. What *we* do: **pin the region, lock down access by default, keep no PII in logs, give her a clean export path, and tear it all down when the pilot ends.**

---

## Region

- **`ap-south-1` (Mumbai). Pinned in `sst.config.ts`. No fallback.**
- All Dynamo tables, the S3 bucket (web bucket + slip-photos prefix), the Lambda, the Cognito User Pool, and Secrets Manager secrets live in `ap-south-1`.
- CloudFront is global by definition; ACM certs for the three subdomains (`budget.`, `tracker.`, `admin.wysbryxapp.com`) live in `us-east-1` (CloudFront's requirement). Static SPA assets cached at edge worldwide. No PII is in those assets.
- API Gateway HTTP API in `ap-south-1` — every request that touches PII is processed in-region.
- **SES sender domain (`wysbryxapp.com`) is in production access** for Cognito's email delivery to admin-role users. SES sends from `ap-south-1`.

If Aditi (or Harvard IRB, or Indian regulator) ever asks where the data lives: Mumbai. End of conversation.

---

## Storage

### DynamoDB
- SSE with AWS-managed KMS key (default for new tables in `ap-south-1`). No customer-managed key — overkill for a 60-day pilot, adds key-rotation operational burden.
- PITR off. Recovery model = `sst deploy` from clean state. We are not going to "restore to a point in time" for a 20-user pilot.
- `removalPolicy: "destroy"` set explicitly on every table. `sst remove --stage prod` actually removes.

### S3 (slip photos)
- One bucket per stage for slip photos: `kothi-dev-slips`, `kothi-prod-slips`. (Separate from the SPA-hosting bucket `kothi-{stage}-web`.)
- **`BlockPublicAccess: all`.** No way to make an object public, ever, even by accident.
- Default SSE-S3.
- Bucket ACL disabled, owner-enforced.
- All access via pre-signed URLs minted by the single Lambda after `requireAuth` middleware validates the Cognito JWT.
  - Upload URLs: 5-minute expiry.
  - Download URLs: 1-hour expiry, generated on-demand per slip-display.
- Lifecycle policy: noncurrent versions deleted after 1 day. Pilot has no legitimate need for object versions.
- **`removalPolicy: "destroy"` + `forceDestroy: true`** so `sst remove` actually empties and deletes the bucket.

### Secrets Manager (participant credentials)
- One secret per participant at path `kothi/{stage}/credentials/participant-{NN}`.
- Payload: `{ login, tempPassword, realName, village, createdAt, lastResetAt }`. JSON.
- Encrypted with AWS-managed KMS key (default).
- Read access: only the single Lambda's IAM role (specifically the credential-slip route handler).
- Write access: only the seed script + reset-password route handler.
- **Never written to local disk.** The admin app reads via authenticated API call and renders the credential slip PDF in-browser.
- `removalPolicy: "destroy"` + `recoveryWindowInDays: 0` so `sst remove` deletes immediately (default 30-day recovery window would leave secrets lingering after teardown).

---

## Auth + Sessions

- Cognito User Pool, admin-created users only (see `architecture.md`). No public signup endpoint.
- AWS Amplify v6 on the frontend handles token storage in its secure internal store + silent refresh. We don't write tokens to `localStorage` directly.
- **Logout-on-tab-close** wired in the auth wrapper to prevent shared-phone session bleed in the budget + tracker apps. Workers in the field share devices.
- Backend auth via Hono `requireAuth` middleware (`jose` against Cognito JWKS). Same pattern as the Geberit project.
- Email delivery for invites + password resets via SES from `noreply@wysbryxapp.com`. SES production access already lifted on the domain — no sandbox handling required.
- Cognito advanced security features (compromised-credentials checks, etc.) **off**. They cost $0.05/MAU and we don't need them at 20 users.

---

## Logging

- **CloudWatch log retention: 7 days.** Set on the single Lambda's log group via SST. Default-30-day retention bills more than the Lambda invocations themselves.
- **No PII in logs.** Specifically: never log full request bodies, never log Cognito JWTs, never log email or phone or full names. Log `userId` (Cognito `sub`) and the route name only. The Hono error middleware enforces this.
- **Sentry:** users keyed by `participant_id` (= a hash of `userId`). Sentry never sees email, phone, or name. Sentry's "Send Personal Information" toggle: off. Wired in the SPA bootstrap, with the active shell tagged on every event so we can filter by budget / tracker / admin in the Sentry UI.
- Frontend `console.error` calls do not log user data; they log error class + a request ID.

---

## Rate limits

- **Admin export endpoint:** rate-limit applied in Hono middleware (1 request per 5 minutes per principal, in-memory token bucket inside the warm Lambda). Aditi running the export in a tight loop hurts nothing but it's clean to bound.
- **All other authenticated endpoints:** API Gateway default account-level throttle (10K req/s) is fine; we won't approach it.
- **Public endpoints:** only `/health`. Everything else passes through the `requireAuth` Hono middleware.

---

## Data export

- Single admin endpoint: `POST /admin/export`. Documented in `data-export.md`.
- Caller authenticated via Cognito JWT carrying `custom:role = "admin"`. Aditi + Wysbryx team only.
- Output: CSVs zipped, written to a private S3 prefix, signed download URL returned in the response. Signed URL TTL: 24h.
- Export logic emits a CloudWatch metric per invocation; we can graph it if needed but in practice nobody will look.

---

## Pilot teardown

End of pilot (~2026-08-31):

1. Final data export sent to Aditi via `POST /admin/export`. Confirm she has it.
2. `sst remove --stage prod` from a fresh checkout. Confirms IaC fully describes the system.
3. Manually verify the AWS console shows zero remaining resources for the `prod` stage (Cognito User Pool, 6 Dynamo tables, 2 S3 buckets, ~20 Secrets Manager secrets, the single Lambda, API Gateway, 1 CloudFront distribution, 3 Route53 records).
4. `sst remove --stage dev` likewise.
5. Delete the IAM OIDC provider + GitHub Actions deploy role used by CI.
6. Confirm zero AWS charges in the next billing cycle.

The teardown drill (running `sst remove --stage dev` then re-deploying from scratch) is a verification step in the plan and should be done at least once during build, well before pilot end.

---

## What we're NOT doing and why

- **No customer-managed KMS keys.** Default AWS-managed keys are fine; CMK rotation is an operational burden we don't need.
- **No WAF in front of CloudFront.** Public-facing surface is just an SPA bundle and an API Gateway with Cognito auth. WAF cost > value at 20 users.
- **No GuardDuty, Security Hub, Config, etc.** Not enabled. Pilot scope, single AWS account, monitor manually.
- **No data processing agreement (DPA)** authored by us. If Harvard or SOPPECOM produces a template, Praveen/Chinmaya handle it; engineering doesn't draft contracts.
- **No DLP scanning of slip photos.** Photos are biometric/financial PII by definition; we treat them as such (private S3, signed URLs, region-pinned, deleted on teardown). DLP would be theatre.
- **No "right to be forgotten" UI.** Pilot users can ask the facilitator → facilitator hits the admin delete endpoint → user's rows gone. Self-serve delete UI is v2.

---

## If something goes wrong

- **Suspected data breach:** rotate the Cognito User Pool client secret, force-revoke all sessions (`AdminUserGlobalSignOut` for each user), notify Praveen and Aditi within 24h. The breach response is a phone call, not a document.
- **Accidental prod deploy of broken code:** the `prod` stage is gated on Krishna's manual approval (GitHub Environment "production"). If something still slips through: revert the merge, push to `production` again. SST handles incremental rollback.
- **AWS bill spikes:** set up a $50/month billing alarm on day one. At our usage, anything over $50 is a bug or a leak.
- **Aditi loses her access:** facilitator hits admin reset endpoint to issue new temp password.

---

## Open questions for the commercial team (not engineering blockers)

These are flagged for Praveen/Chinmaya to handle with Aditi when convenient. Engineering ships sane defaults regardless.

1. Does Harvard IRB require a data processing agreement countersigned by Wysbryx?
2. Does Aditi need a "data handling appendix" listing the technical controls above? (If yes, we can rewrite this doc in client-friendly language.)
3. Is there a data-retention requirement *beyond* the pilot end (e.g. Harvard wants the export kept for 7 years for research reproducibility)? Affects export storage, not engineering build.
4. Does the IRB require us to delete data on participant withdrawal request? (Operationally trivial; just confirms the admin-delete endpoint is required, not optional.)
