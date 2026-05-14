# Phase 2 — Auth & Shells

**Spec refs:** [architecture.md](../architecture.md) — Auth section (Cognito config, Amplify v6, Hono middleware, Geberit pattern), Data section (`users` table schema).

## What

Working login across all three shells: Cognito User Pool provisioned, Amplify v6 wired on the frontend, `requireAuth`/`requireRole` Hono middleware protecting all non-public routes, and the `users` table upserted on first authenticated request. After this phase, a test participant can log in on `dev.budget.wysbryxapp.com` and hit authenticated API routes. The admin shell rejects non-admin logins. `NEW_PASSWORD_REQUIRED` on first login works cleanly.

## Preconditions

- Phase 1 complete: CI green, three subdomains resolving, `/health` returns 200.
- `gebberit/geberit` repo accessible as the pattern reference (per [architecture.md](../architecture.md) Auth section).

## Steps (ordered)

1. **Cognito User Pool in `infra/auth.ts`.** One pool per stage (`koyta-pilot-{stage}`). Username = email; self-signup OFF. Password policy: 8+ chars, mixed case, numbers. Custom attribute `custom:role` (string, mutable). MFA off; Hosted UI off; no Lambda triggers. App client: no secret, `USER_PASSWORD_AUTH` flow. SES sender `noreply@wysbryxapp.com` for admin-role users; participants use `MessageAction=SUPPRESS`. Export `userPoolId` + `clientId` as linked SST resource outputs.

2. **`users` DynamoDB table in `infra/data.ts`.** PK `userId`, `PAY_PER_REQUEST`, `removalPolicy: "destroy"`, no GSIs. Schema per [architecture.md](../architecture.md) Data section.

3. **Amplify v6 in `packages/shared/src/auth/`.** Lift pattern from `gebberit/geberit`:
   - `amplify-config.ts` — reads `VITE_COGNITO_USER_POOL_ID` / `VITE_COGNITO_CLIENT_ID` from `import.meta.env`.
   - `useAuth.ts` — Zustand store with hydration guard; exposes `{ user, signIn, signOut, isLoading }`. `fetchAuthSession()` for silent refresh; never writes tokens to localStorage directly.
   - `NEW_PASSWORD_REQUIRED` handling: redirect to `<ChangePassword />`, call `confirmSignIn`, then proceed to the shell.
   - Logout-on-tab-close via `visibilitychange` event — fires `signOut()` to prevent shared-phone session bleed.

4. **Hono middleware in `packages/api/src/middleware/auth.ts`.** Extract Bearer token. Verify against `https://cognito-idp.ap-south-1.amazonaws.com/{userPoolId}/.well-known/jwks.json` using `jose` (`createRemoteJWKSet` + `jwtVerify`); JWKS cached in-memory. On success, attach `{ userId, email, role }` to Hono context. On failure, 401. `requireRole("admin")` composed on top: 403 if role ≠ `"admin"`.

5. **`GET /me` route in `packages/api/src/routes/me.ts`.** Calls `requireAuth`. DynamoDB `UpdateItem` with `SET createdAt = if_not_exists(...)` and `SET lastSeenAt = :now`. Returns the user row. All three shells call `/me` immediately after login to ensure the `users` record exists before any other API call.

6. **Login screens in all three shells.** Each shell entry component checks `useAuth().user`. If null → `<LoginScreen />` (email + password, Amplify `signIn`, error display, `<ChangePassword />` for the challenge). If present → shell content. `<AdminShell />` additionally checks `role === "admin"` post-login; if not, renders "You don't have access" + logout button — does not redirect to user-facing URLs.

7. **Seed test users.** Extend `scripts/seed-dev.ts`: `AdminCreateUser` with `MessageAction=SUPPRESS` for `participant-01@wysbryxapp.com`; `AdminCreateUser` without SUPPRESS for a real Wysbryx admin email. Store both in Secrets Manager.

## Exit Criteria

- [ ] Test participant logs in on `dev.budget.wysbryxapp.com`; `GET /me` returns the user row; item in `users` table.
- [ ] `GET /budget-state` (stub) returns 401 without a token, 200 with a valid token.
- [ ] Admin user on `dev.admin.wysbryxapp.com` sees the admin shell; a participant attempting the same URL sees "You don't have access."
- [ ] `NEW_PASSWORD_REQUIRED` flow completes without error.
- [ ] `/admin/*` route returns 403 with a participant JWT.
- [ ] Closing the budget tab and reopening shows the login screen (session cleared).

## Files Touched

```
infra/auth.ts                                  (Cognito User Pool)
infra/data.ts                                  (users table)
packages/shared/src/auth/amplify-config.ts     (new)
packages/shared/src/auth/useAuth.ts            (new)
packages/api/src/middleware/auth.ts            (new)
packages/api/src/routes/me.ts                  (new)
packages/api/src/index.ts                      (mount /me)
apps/web/src/components/LoginScreen.tsx        (new)
apps/web/src/components/ChangePassword.tsx     (new)
apps/web/src/shells/BudgetShell.tsx            (login gate)
apps/web/src/shells/TrackerShell.tsx           (login gate)
apps/web/src/shells/AdminShell.tsx             (login gate + role guard)
scripts/seed-dev.ts                            (extended)
```
