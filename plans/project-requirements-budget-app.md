# Koyta-Sathi — Budgeting App: Project Requirements

**Audience:** Wysbryx engineering (Madhukar primary, Ayush assisting, Krishna on architecture, Praveen/Chinmaya on delivery).
**Status:** Working spec. Source of truth for build. Supersedes the PDF mockup wherever the two disagree.
**Last updated:** 2026-05-08
**Owner:** Wysbryx Engineering

---

## 1. Context (read this first or you will build the wrong thing)

This is the **first of two apps** for a Harvard research pilot run by Aditi Bhowmick (PhD student, Harvard) under Prof. Eliana La Ferrara, in partnership with **SOPPECOM**. The end users are roughly **20 sugarcane *koyta* cutters from Maharashtra** (treatment group). The pilot is a controlled study; this is not a product launch.

The Budgeting App is the *prep* tool: it's used **once per season**, before the cutting season begins, to walk a worker through:

1. A short financial-literacy training (stories + a quiz + a prioritization exercise).
2. Recall of the last two seasons' advances and arrears.
3. Planning the upcoming season's advance (with a repayment-time estimate).
4. Optionally building a "priority advance plan" by listing must-have vs can-wait expense categories.
5. Generating a printable PDF budget plan to take home.
6. Tracking individual *advance installments* taken from the *mukaddam* (labour contractor) over the season.

The companion **Tracking App** (separate spec) handles daily wage/work logging during the season. **Do not blur the two apps.** They share branding ("Koyta-Sathi"), language (Marathi + English), and a design system — nothing else.

### Hard constraints we are NOT revisiting
- **Web app, responsive, mobile-first.** Not Android. Praveen made this call; Aditi accepted via email on 2026-05-06. No native, no PWA-as-a-must, no offline-first. Online-only is fine — see §11.
- **English first, Marathi second.** Aditi will deliver Marathi translations after the English flow is signed off.
- **Pilot scale.** Code accordingly: simple, observable, no premature optimisation. Don't build for 100k users.
- **Data deletion deadline:** all user data must be wiped from app storage by **April 2027** (end of agricultural cycle). Build the deletion job into the schema/operations from day one, not as an afterthought.

### Hard deadline
The SOW lists **2026-05-26** for budget-app testing readiness, but the real binding constraint is the SOPPECOM training schedule (which Aditi controls and we don't yet know). Treat the SOW date as **indicative**, not contractual. Build at a sustainable pace, ship to `prod` when genuinely ready, let Aditi pull the trigger on going live. The milestone trail in §12 is an indicative working sequence.

### Commercial context (so engineering knows what's at stake)
SOW total = **5,998 USD**. Budget-app testing milestone = **1,500 USD**. Slipping the May 30 date directly delays cash flow and damages a Harvard relationship Praveen specifically wants for ecosystem visibility. Don't slip.

---

## 2. The reference materials (and what to do with them)

| Artifact | Location | How to treat it |
|---|---|---|
| `Koyta-Sathi_Budgeting_App_Mockup.pdf` (18 screens) | `_client-artifacts/` | **Visual reference.** Aesthetic direction: cream/olive palette, serif italics for headings, rounded-32 cards, soft shadows. Layout intent only — *not* a feature spec. |
| `budget_app_code/` (vibe-coded prototype) | `_client-artifacts/` | Aditi built this in Google AI Studio. **Mine it for content** (story text, quiz options, prioritization items, expert tip, expense category labels) — but **do NOT take it as an architectural reference.** Single 1391-line `App.tsx`, no persistence, in-memory state, hardcoded TTS. Read once, then close it. |
| `Aditi's 9 design changes` (Slack, 2026-05-04 19:30) | `_client-artifacts/slack-context.md` | **Authoritative.** Already baked into §6 of this spec. Anywhere this spec contradicts the PDF mockup, this spec wins. |
| `wysbryz_sow.docx` | `_client-artifacts/` | Contractual milestones and payment schedule. |

---

## 3. Users, languages, and accessibility

- **Primary persona:** sugarcane cutter from rural Maharashtra. Likely low literacy; many won't read English; some won't read Marathi confidently either.
- **Secondary persona:** SOPPECOM field facilitator who may sit beside the user and operate the phone with them.
- **Tertiary persona:** Aditi/research team (data export and dashboard, not in-app).

### Language
- All user-facing strings in **English (en) + Marathi (mr)**, swappable at runtime.
- **Default to Marathi** on first launch; offer English as a toggle.
- TTS narration of every screen's main instruction in the user's selected language. Browser SpeechSynthesis as the primary; **drop the Gemini-based TTS from the prototype** — adding a third-party API key, billing, and outbound cost for narration of static text is absurd.

### Accessibility / ergonomics
- Min tap target 44×44 px.
- Minimum body-text size 16 px; numeric inputs 24 px+.
- High-contrast palette (current cream/olive needs a contrast pass — visual-audit before sign-off).
- All flows operable on a 360×640 viewport. Test on a real low-end Android browser before delivery.
- Voice ("read aloud") button must be present on every instructional screen.

---

## 4. Tech stack

**See `architecture.md` for the source of truth.** Summary for context:

- **Frontend:** Vite + React 19 + TS + Tailwind v4. **One SPA** (`apps/web`) that mounts `<BudgetShell />` when the hostname is `budget.wysbryxapp.com` (or `dev.budget.*`). The same bundle also serves the tracker and admin shells on their respective subdomains — see `architecture.md` "Bootstrap." Shared code lives in `packages/shared`; the single Hono Lambda lives in `packages/api`.
- **Routing:** Wouter (~1KB). The wizard is mostly URL-state + a single screen mount per step.
- **PWA:** `vite-plugin-pwa`. Installable to home screen.
- **i18n:** `react-i18next` with `en` and `mr` catalogs.
- **PDF generation:** `@react-pdf/renderer`, **client-side, lazy-loaded.** Devanagari TTF (Noto Sans Devanagari) fetched separately and registered on first PDF open to keep the SPA's first-load bundle under ~200 KB gz.
- **Forms:** `react-hook-form` + `zod` for the wizard steps.
- **Animations:** `motion` (formerly framer-motion), already in the prototype.
- **Auth:** **AWS Cognito User Pool, admin-created users only.** AWS Amplify v6 on the frontend (token storage + silent refresh). Email-only login via SES from `noreply@wysbryxapp.com`; SES production access already lifted on the domain. NEW_PASSWORD_REQUIRED challenge handled gracefully on first login. Pattern lifted from `gebberit/geberit`.
- **API:** Single AWS Lambda (Node 22) behind API Gateway HTTP API. Hono router. Hand-rolled JWT verify in a `requireAuth` middleware (`jose` against Cognito JWKS) — same pattern as Geberit. No API Gateway authorizer; the middleware does it all.
- **Data:** **DynamoDB**, table-per-entity, `PAY_PER_REQUEST`. See §8.
- **Hosting:** S3 + CloudFront, single distro for `budget.wysbryxapp.com` (and `dev.budget.wysbryxapp.com`). Region `ap-south-1` for everything except the ACM cert (CloudFront requires `us-east-1`).
- **IaC:** SST v3 (Ion). Stages locked to `["dev", "prod"]` at config-eval time. Never deploy locally — CI only.
- **Observability:** Sentry free tier (client errors, no PII), CloudWatch with 7-day retention.

### Prototype-derived warnings for the build

- **DO NOT lift the `@google/genai` TTS code from the prototype's `App.tsx`.** Use **browser SpeechSynthesis** for the read-aloud feature. The prototype tries to read a Gemini API key from `process.env` in browser context (fails) and falls back to SpeechSynthesis anyway. We just keep the fallback path.
- **DO NOT lift the `jspdf + html2canvas` PDF generation from the prototype.** It screenshots a hidden DOM into a PNG-in-a-PDF — not searchable, not selectable, no Marathi font support. Use `@react-pdf/renderer` (see above and §7.14).
- The prototype is a single 1391-line `App.tsx` with all state in-memory. Use it as a **content reference only** (story text, quiz options, prioritization items, expert tips, expense categories). Architecture comes from `architecture.md`, not from the prototype.

---

## 5. Information architecture & flow (post-deltas, canonical)

This is the flow we are building. The PDF mockup has 18 screens; this list reorders and modifies per Aditi's 2026-05-04 deltas.

```
1.  Welcome / Disclaimer
2.  Onboarding — Profile (first name, last name, village dropdown). Email is captured separately during account invite, not on this screen.
3.  Past Season recall — 2024-25
4.  Past Season recall — 2025-26
5.  Training — Geeta Tai's Story (1/2)
6.  Training — Geeta Tai's Story (2/2) — "Steps to Make a Budget"
7.  Training — Budget Quiz (simplified scoring)
8.  Training — Gauri's Story (Staying on Track 1/2)
9.  Training — Jagdish's Story (Staying on Track 2/2)
10. Advance Plan 2026 — planned advance amount + repayment-time estimate (broad)
11. Priority Plan — Stage 1: list up to 10 expense categories the household plans for
12. Priority Plan — Stage 2: must-have vs can-wait classification per category
13. Priority Plan — Result: revised priority advance estimate + expert tip
14. Generated Budget PDF — preview + download
15. Transition — "Ready to Track"
16. Dashboard — Advance Ledger (running total vs planned)
17. Add Installment (modal/screen) — amount, purpose category, date (allow past dates)
```

The order of training-vs-recall-vs-planning is deliberately the prototype's order (training first, then recall, then planning). Confirm with Aditi if she wants it in the alternate order shown in the PDF mockup. **Default: keep the prototype's order.**

---

## 6. Aditi's design deltas — baked into the spec

These are the 9 changes Aditi sent on Slack on 2026-05-04 19:30 IST. They override the mockup PDF wherever they conflict.

| # | Change | Where it lands in this spec |
|---|---|---|
| 1 | Onboarding: split name into **first name + last name** fields. | §7.2 |
| 2 | Onboarding: **village = dropdown** (list pending from Aditi). Implement as `<select>` backed by a config file; ship with a placeholder list and seed real list when delivered. | §7.2 |
| 3 | Budget Quiz scoring: **1 point per correct answer**, no negative scoring for wrong picks. Just count correct selections. | §7.7 |
| 4 | Prioritization exercise: **no numeric score**. Instead, the **expert tip surfaces inline** as the user does the must-have/can-wait classification. Categories shown are temporary — Aditi will replace with context-relevant ones. | §7.12 |
| 5 | Arrears recall → repayment estimate: label the estimate explicitly as a **"BROAD repayment timeline estimate based on last two years' data."** Don't let it look authoritative. | §7.10 |
| 6 | Priority Plan is **mandatory**, not optional. Remove the "No, Skip" button on the intro screen. | §7.11 |
| 7 | Prioritization is **two stages**: (a) list up to 10 categories with planned amounts, (b) classify each as must/wait. Then show the **revised priority advance** = sum of must-haves only. | §7.11–7.13 |
| 8 | After prioritization, **generate a downloadable budget PDF** containing the user's listed expenses (step 7) and total borrowing goal. User keeps it as a loose plan. | §7.14 |
| 9 | Advance ledger: allow **retroactive installment dates**. No restriction on the date field. | §7.17 |

---

## 7. Screen-by-screen requirements

### 7.1 Welcome / Disclaimer
- Project intro: SOPPECOM + La Ferrara + Bhowmick research framing. Pull copy from the existing prototype; have Aditi review the legal wording before lock.
- Two consent items: **(a) Research participation** (data used by named researchers, deleted by April 2027), **(b) Not financial advice**.
- Single CTA: "I Understand & Agree."
- Language toggle (en / mr) in the header — accessible from every screen.

### 7.2 Onboarding — Profile
- Inputs: **First Name**, **Last Name** (both required), **Village** (dropdown, required — placeholder list until Aditi sends the real one).
- Optional: age band, education level (carry-over from tracker app's profile schema for consistency).
- The user's **login (an auto-generated `participant-NN@wysbryxapp.com` alias)** was set at admin-create time (see `architecture.md` Auth). The worker doesn't see it after first login; the credential sheet stays with the facilitator. No email field on this screen.
- Continue is disabled until first name + last name + village are filled.

### 7.3 Past Season Recall — 2024-25
4 numeric inputs:
- Advance pending at start (₹)
- Total advance taken in 2024 (₹)
- Months worked
- Arrears remaining (₹)

Big numbers, big tap targets. Save & Continue.

### 7.4 Past Season Recall — 2025-26
Same as §7.3 with year labels updated.

### 7.5 Training — Geeta Tai's Story (1/2)
Story text (lift from prototype) + TTS narration. "Next" CTA.

### 7.6 Training — Geeta Tai's Story (2/2) — Steps to Make a Budget
Numbered list of 6 steps (lift from prototype). Closing tagline. Next: Quiz.

### 7.7 Budget Quiz
- Multi-select. 7 options (lift from prototype). 5 are correct.
- **Scoring: +1 per correctly selected; no penalty for incorrect selections; no penalty for missed correct ones.** Score displayed as `correctly_selected / total_correct`.
- After "Check Answers": render each option with its true correct/incorrect status, color-coded.

### 7.8 Gauri's Story (Staying on Track 1/2)
Story text + key lesson + TTS. Next: Jagdish.

### 7.9 Jagdish's Story (Staying on Track 2/2)
Same shape. Next: Advance Plan. *(Prioritization is moved to §7.11–7.13, after planning.)*

### 7.10 Advance Plan 2026
- Single input: Planned Advance Amount (₹).
- On any input change, compute and display:
  - **Repayment Estimate (broad):** "Based on your past two years' data, it will take about **N months** to pay off ₹X." Label clearly as broad estimate.
  - If arrears > 0 from §7.4: also show **"Including ₹A arrears, total ≈ M months to clear total ₹X+A."**
- "Would you like to change this amount?" with Yes/No. Yes refocuses input, No proceeds.

**Formula** (carry over from prototype, document it for Madhukar):
```
avg_advance_per_month = mean(
  recall2024.advanceTaken / max(1, recall2024.monthsWorked),
  recall2025.advanceTaken / max(1, recall2025.monthsWorked)
)
estimated_months          = ceil(plannedAdvance / (avg_advance_per_month || 10000))
estimated_months_w_arrears = ceil((plannedAdvance + arrears) / (avg_advance_per_month || 10000))
```
Falls back to ₹10,000/month if past data is missing or zero.

### 7.11 Priority Plan — Intro
- Title: "Priority Plan 2026"
- Single CTA: "Start Plan." **No "Skip" option** (per delta #6).

### 7.12 Priority Plan — Stage 1 (List categories)
- User adds up to 10 expense categories. Each row: category label + planned amount.
- Inline "Add Category" form: text input + amount input + add button.
- Live total of all planned amounts displayed prominently.
- "Continue" enabled when ≥1 category is added.

### 7.13 Priority Plan — Stage 2 (Must vs Wait)
- For each of the 1–10 categories the user added in §7.12, present a Must Have / Can Wait toggle.
- **No score.** Instead, show the **expert tip inline** as the user works through it (text from prototype: "Experts recommend prioritizing: 1. Emergencies, 2. Debt payments, 3. Daily needs (Food), 4. Future goals.").
- On completion: show **Priority Advance Amount = sum(amount where status == 'must')** with the recommendation text from the prototype ("plan to take this as initial priority advance from mukaddam, take additional advances only if needed later").

### 7.14 Budget PDF
- Auto-generated when user completes §7.13.
- Contents:
  - Header: "Koyta-Sathi Budget Plan" + user's first+last name + village + season (2026-27)
  - Past-season recap (one short table)
  - Planned advance + repayment estimate
  - Priority Plan: full list with must/wait labels and amounts; bolded priority advance total
  - Footer: short lesson recap, generated date

**Implementation:**
- **`@react-pdf/renderer`, client-side, lazy-loaded.** The PDF route + `@react-pdf` library + Devanagari TTF together are ~600-700 KB; lazy-load the entire route via `React.lazy` so the SPA's first-load stays small.
- **Devanagari font:** Noto Sans Devanagari Regular, served from `/fonts/NotoSansDevanagari-Regular.ttf` (full TTF — `@react-pdf` doesn't accept woff2 and doesn't subset). Fetched with `cache: "force-cache"` on first PDF open and `Font.register`'d once per session.
- **No server-side PDF.** Lambda font-loading + `@react-pdf` cold-start would be a footgun; client-side at 20 users is free and snappy.
- **No `html2canvas`, no `jspdf` screenshot hack.** Real PDF, real selectable text, Marathi renders correctly.

Provide both a **"Download PDF"** button and a **"Send to my number via WhatsApp link"** option (a `wa.me` link that opens WhatsApp with the PDF URL pre-filled — facilitator can forward). The PDF blob is generated client-side; for the WhatsApp share path, upload to S3 first via the same pre-signed URL flow the tracker uses for slips, then share the signed URL.

### 7.15 Transition — "Ready to Track"
Static screen. CTA: "Go to Ledger" → §7.16.

### 7.16 Dashboard — Advance Ledger
- Header: greeting with first name; village.
- Big stat: **Total Debt So Far** (= sum of all logged installments) vs **Planned Limit** (= priority advance from §7.13, since priority is now mandatory).
- Progress bar with % used.
- Warning banner when usage > 90%.
- Two stat cards: Planned, Remaining (planned − used).
- "Advance Ledger" list of installments (most recent first) — purpose, date, amount.
- "+ Add New" CTA → §7.17.
- Top-right: **Download Budget PDF** (re-export of §7.14), language toggle, profile menu (logout, delete my data).

### 7.17 Add Installment
- Amount (₹) — large numeric input.
- Purpose — chips for {Food, Seeds, Health, Travel, Debt, Other} + free-text "Or type purpose…"
- Date — defaults to today; **user can pick any past date** (per delta #9). No future dates.
- Save → returns to dashboard, list updates, totals recompute. Fires `events.track("installment_logged", { purpose })`.

---

### Event tracking inside the budget flow

Per `architecture.md` "Events" section, the SPA fires `events.track(type, payload)` at every meaningful interaction. For the budget flow specifically, the standard taxonomy maps as:

| Where | `events.track(...)` call |
|---|---|
| Welcome screen mounts | `app_opened`, `{ subdomain: "budget" }` (fired in bootstrap, not here) |
| Disclaimer "I Understand & Agree" | `wizard_started`, `{ wizard: "budget" }` |
| Each wizard step `onNext` | `wizard_step_completed`, `{ wizard: "budget", step: N, stepName: "<name>" }` |
| Last step (PDF download / dashboard reach) | `wizard_completed`, `{ wizard: "budget" }` |
| PDF generated | `pdf_generated`, `{ kind: "budget" }` |
| PDF download button | `pdf_downloaded`, `{ kind: "budget" }` |
| Add Installment save | `installment_logged`, `{ purpose }` |

The events client is fire-and-forget with a localStorage-backed retry queue. UI never blocks on `track()`.

---

## 8. Data model (DynamoDB)

Two tables relevant to this app. Both keyed on `userId` = Cognito `sub` claim.

### `users` (shared with tracker app)

```
PK: userId (string)            -- Cognito sub
attrs:
  firstName            string
  lastName             string
  village              string
  email                string
  language             enum('en','mr')   default 'mr'
  consentAcceptedAt    ISO8601 string    optional, set on §7.1 accept
  isAdmin              bool              false except for Aditi
  createdAt            ISO8601 string
  lastSeenAt           ISO8601 string    updated on each authenticated request
```

### `budget_state` (one item per user)

The full wizard JSON blob, upserted as a single Dynamo item. We deliberately do not normalize. At 20 users, two-table joins cost more in code than they save in storage.

```
PK: userId (string)
attrs (a typed JSON blob, schema in packages/shared/src/types/budget.ts):
  recall2024:
    pendingStartPaise      int
    advanceTakenPaise      int
    monthsWorked           int
    arrearsRemainingPaise  int
  recall2025: { same shape }
  quiz:
    selectedOptionIds      string[]
    scoreCorrect           int
    scoreTotal             int          -- 5
    attemptedAt            ISO8601
  prioritization:
    completedAt            ISO8601 optional
    expertTipShownAt       ISO8601 optional
  planning:
    plannedAdvancePaise    int
    revisedAt              ISO8601 optional
  priorityCategories:
    [
      { position: int, label: string, amountPaise: int,
        classification: enum('must','wait','unclassified') }
    ]
  priorityAdvancePaise    int            -- computed; sum where classification == 'must'
  budgetPdf:
    generatedAt            ISO8601 optional
    s3Key                  string optional   -- if uploaded for WhatsApp share
  installments:
    [
      { id: ULID, amountPaise: int, purpose: string,
        occurredOn: 'YYYY-MM-DD', loggedAt: ISO8601 }
    ]
  updatedAt              ISO8601           -- bumped on every PUT
```

**Why a JSON blob and not 6 normalized tables:** at 20 users for 60 days, every read is "give me one user's state" and every write is "save the wizard step." A blob is one round-trip, one Dynamo item, one type definition. Schema evolution = bump a TypeScript interface, ship.

**Conventions:**
- All money values in **paise** (₹ × 100), integers only. No IEEE float for debt math.
- Timestamps `ISO8601` strings. Dates `YYYY-MM-DD`.
- Dynamo billing: `PAY_PER_REQUEST`. PITR off. `removalPolicy: "destroy"`.
- No GSIs. No streams.

The export Lambda (see `data-export.md`) flattens this blob into `budget_state.csv`, `priority_categories.csv`, and `installments.csv` for Aditi's analysis.

---

## 9. Researcher data export

This is the *whole point* of the project from Aditi's side. Don't treat it as an afterthought.

- Admin-only route (`/admin/export`) gated by Wysbryx-team email allowlist.
- Two endpoints:
  - **CSV per table** (users, recalls, planned, priority, quiz, installments) — flat, downloadable, with stable column ordering.
  - **JSON dump** for analysis pipelines.
- Each export logged to `ResearchExportLog`.
- Email addresses in exports replaced with stable hashed `participant_id`. Aditi gets a separate one-time mapping file (delivered out-of-band, not via the app) so she can re-identify if needed for follow-up but the export itself is pseudonymised.

---

## 10. Privacy & data lifecycle

See `compliance.md` for the full posture. Summary:

- Region pinned to `ap-south-1` (Mumbai). Data does not leave India.
- Pilot lifespan: ~60 days, exact start determined by SOPPECOM training schedule. End-of-pilot teardown is `sst remove --stage prod`. Not a scheduled cron, not a future-date deletion job — a one-time deliberate action by Krishna.
- "Delete my data" UI in the profile menu calls an admin-delete endpoint that hard-deletes the user's rows from Dynamo and disables their Cognito user. No soft-delete; pilot scope doesn't justify it.
- No third-party trackers. Sentry's user identifier = hashed `participant_id`.
- CloudWatch logs: 7-day retention, no PII.
- Cognito JWT in `localStorage` with explicit logout-on-tab-close to prevent shared-phone session bleed.

---

## 11. Non-requirements (call them out so nobody re-litigates)

- ❌ Offline-first / service-worker / IndexedDB sync. Praveen explicitly killed this on Slack 2026-05-04 20:54.
- ❌ Native Android. Killed on email 2026-05-06.
- ❌ Bulk uploads, large media, photo capture. Not in this app (the tracker has slip uploads — different app).
- ❌ Marathi voiceover via Gemini paid API. Use browser SpeechSynthesis. Free, fine for static instructional copy.
- ❌ Authentication via Google/Facebook/SMS/phone-OTP. Email + admin-issued temp password only (Cognito's NEW_PASSWORD_REQUIRED flow on first login). Same pattern as Geberit.
- ❌ Push notifications.

---

## 12. Milestones — indicative working sequence

Treat as a working order, not a schedule. The SOW dates are tentative; the real binding constraint is the SOPPECOM training schedule, which is TBD.

| Step | Milestone | Owner |
|---|---|---|
| 0 | Async-blockers kicked off: subdomain CNAMEs in Route53, ACM cert(s) in `us-east-1`, GitHub OIDC trust. | Krishna |
| 1 | Local repo bootstrapped: pnpm workspaces, single Vite scaffold (`apps/web`), Tailwind v4, `vite-plugin-pwa`, Biome, SST v3 init. | Krishna |
| 2 | SST deploys to `dev` end-to-end: all three subdomains resolving on one CloudFront distribution, hostname → shell switching works, health-check Lambda returns 200, Cognito User Pool seeded, Secrets Manager seeded with one test participant. | Krishna |
| 3 | **Static UI prototype, all three shells, all screens, English-only, mocked state, deployed to `dev`.** Aditi gets a click-through link to react against. | Krishna |
| 4 | Budget app: auth wired, DynamoDB persistence, all 17 screens functional, `events.track()` called at every meaningful interaction. | Krishna |
| 5 | Budget app: PDF generation lazy-loaded, Aditi's 9 deltas baked in. | Krishna |
| 6 | Marathi strings wired (placeholder if Aditi's XLSX is late), accessibility pass, visual audit, internal QA. | Krishna |
| 7 | **Budget app ready for Aditi UAT on `prod`.** Aditi reviews. | Krishna delivers; Chinmaya coordinates |
| Post-UAT | Madhukar takes over for fine-tuning based on UAT feedback. | Madhukar |

If Marathi translations don't arrive in time, ship with English-only and a "Marathi coming soon" toggle. The schedule slips for *real* problems, not translation delays.

---

## 13. Open questions (block before ship)

1. **Village list:** Aditi to send finalized list. Until then, dropdown shows "Beed, Latur, Osmanabad, Solapur" as placeholders.
2. **Quiz options:** Aditi may revise the 7 quiz options. Confirm copy is final before May 22.
3. **Prioritization categories:** Aditi flagged the 8 sample categories ("Food, Medicine, Jewelry…") are temporary. New list to come.
4. **Domain name confirmed:** `budget.wysbryxapp.com` (existing Wysbryx domain, SES production access already lifted). No separate brand domain unless Praveen objects.
5. **Pre-registered cohort:** Get the list of 20 (real name + village) from SOPPECOM by May 20 so we can seed `infra/pilot-cohort.json`. Workers don't supply emails — we auto-generate `participant-NN@wysbryxapp.com` aliases and the facilitator hands out printed credentials at training. See `architecture.md` Auth section.
6. **PDF Marathi font:** `@react-pdf/renderer` needs a Devanagari font registered (e.g. Noto Sans Devanagari). Bake this in at PDF init, not at the last minute.

---

## 14. Out of scope, but worth noting for v2

- Web-share API for the budget PDF.
- Reminder SMS at start of each month asking the user to log any new installments.
- Aggregated cohort dashboard for SOPPECOM/Aditi.
- Native Android wrap (Capacitor) post-pilot, if real usage data justifies it.
