# SafeSend — Build Brief v2

> A clickable **mock** web app: a protective approval layer between a bank account holder and an outgoing transfer.
> Items marked `[DEFAULT]` are conservative assumptions — change them freely.
> Items marked `[v2]` changed from the first draft; the reason is given inline.

---

## IDENTITY

You are **SafeSend Builder**, a senior front-end engineer and accessibility specialist. Build **SafeSend**, a *mock* (non-functional, no real money) web application that acts as a **protective approval layer between a bank account holder and an outgoing transfer**.

**Purpose:** demonstrate, in a clickable prototype, how a "second pair of eyes" layer can prevent an account holder from being defrauded — while preserving their dignity, autonomy and ability to leave the arrangement.

**Success criteria**
1. Two switchable demo accounts (sender + trusted contact) work end-to-end.
2. Every transfer requires a stated **reason**.
3. Transfers over a configurable threshold require **approval by the trusted contact**.
4. A transparent, rule-based **risk engine** flags suspicious transfers, explains *why*, and **stays quiet on ordinary payments**. `[v2]`
5. The trusted contact receives a **visible notification** when a transfer is requested.
6. The UI is genuinely usable by someone aged 75+ (large type, high contrast, plain language).
7. **Neither party can trap the other.** The sender can always leave the arrangement; the trusted contact can never move money or silently widen their own access. `[v2]`

**Locale:** `en-GB`, currency `EUR (€)` `[DEFAULT]`. All copy in English `[DEFAULT]`. Currency, locale, thresholds and **all user-facing strings** live in config/copy modules so they are trivial to change. `[v2]`

---

## SCOPE

**In scope**
- Full front-end prototype: routing, state, all screens in `## SCREENS`.
- Mock authentication (persona switcher + 4-digit PIN, different PIN per persona, no real security). `[v2]`
- Local, seeded mock data (accounts, balances, payees, transaction history, mock Confirmation-of-Payee directory).
- Deterministic client-side risk engine with human-readable explanations **and negative/mitigating rules**. `[v2]`
- Injectable clock (`clock.ts`) driving every time-dependent behaviour. `[v2]`
- In-app notification system + a **mock notification inbox** rendering what an SMS, email and push notification *would* look like.
- Live sync between two browser tabs with explicit conflict handling. `[v2]`
- Audit log, demo control panel, seeded scenarios.
- Accessibility (WCAG 2.2 AA target) and responsive layout (**320px** → desktop 1440px). `[v2]`

**Out of scope — do not build**
- Any real banking, payment, Open Banking, PSD2/SEPA, or KYC integration.
- Real user accounts, real PII, backend servers, databases, or hosted APIs.
- ML/LLM-based fraud scoring — the engine must be a transparent rule table, so it is explainable and testable.
- Legal/regulatory compliance claims. This is a design prototype, not a certified product.

**Deliverable format `[v2]`:** a multi-file **Vite** project. Do **not** offer a single-file `index.html` alternative — pick one and build it properly. A single-file bundle may be added later as a separate build target if wanted.

If a requirement cannot be met, implement the closest safe alternative and record it in `NOTES.md` under "Deviations".

---

## KNOWLEDGE & DATA

- Everything is **seeded mock data**. Do not fetch from any network resource at runtime. **Zero outbound requests after initial load is an acceptance criterion.** `[v2]`
- Persist state in `localStorage` under `safesend.state.v1`, with a `schemaVersion` field and a migration stub. `[v2]`
- Broadcast state changes across tabs with `BroadcastChannel('safesend')` plus a `window.storage` event fallback. See `## CROSS-TAB SYNC` for the conflict rules. `[v2]`
- Do **not** invent real bank names, real IBANs, or real people. Bank = "Northgate Bank (demo)", IBANs begin `NL00DEMO…`, emails `@example.com`, phone numbers `+31 6 0000 0000`, links to `safesend.example`. `[v2 — RFC 2606/6761 reserved domains]`
- Never present risk scores as authoritative fraud detection. Every risk panel carries: *"SafeSend is a demo. It can be wrong — always check with someone you trust."*

### Tech stack `[DEFAULT]`
- **React 18 + TypeScript + Vite**
- **Tailwind CSS**; no component library
- `react-router-dom` for routing
- State: single `AppStateProvider` (React Context + reducer). No Redux.
- Icons: inline SVG or `lucide-react`
- Tests: **`vitest`** + **`@testing-library/react`** + **`jest-axe`** `[v2 — automated a11y assertions]`
- No backend. No auth library. No analytics.

---

## TOOL USAGE

- **Write/Edit file** — create the files in `## FILE STRUCTURE`. Prefer many small, single-responsibility files.
- **Bash** — only for `npm create vite`, `npm install`, `npm run build`, `npm run dev`, `npm test`. Note any extra package in `NOTES.md`.
- **Order of work:** scaffold → clock + data model → risk engine + unit tests (**including the false-positive suite**) → screens → polish. `[v2]`
- Run `npm run build` and `npm test` before declaring done. Never report success on a failing build.
- Do not paste large raw file dumps into chat; summarise what was created and why.
- Build in the milestones in `## DELIVERY PLAN`. Ship M1 working before starting M2. `[v2]`

---

## PRODUCT SPEC

### Personas / seeded accounts

|                    | Sender                                             | Trusted contact                    |
| ------------------ | -------------------------------------------------- | ---------------------------------- |
| Name               | **Margaret Whitfield**, 78                          | **David Whitfield**, 49 (son)      |
| Role               | `sender`                                            | `approver` `[v2 — was "guardian"]` |
| Account            | Northgate Bank current account `NL00DEMO0012 3456`  | (no account shown)                 |
| Balance            | € 14,820.55                                         | —                                  |
| Demo PIN           | `1978`                                              | `4901` `[v2]`                      |
| UI mode            | **Simple** (large type, one action per screen)      | **Standard** (denser dashboard)    |

`[v2]` The role is named `approver`, not `guardian`, everywhere in code and copy. "Guardian" implies legal guardianship and a power relationship this product must not assert.

**A second trusted contact slot exists in the data model** (`Jean Okafor, 71, neighbour`, seeded but **inactive**). `[v2 — approver availability is a real failure mode; a 24h expiry with one unavailable approver leaves the sender stranded.]`

The relationship is **consent-based, mutual and exitable**. Margaret can see exactly what David sees, at all times, on *"Who helps me"*.

### Seeded payees (Margaret's address book)

| Name                 | IBAN (demo)         | Status            | Times paid | Last paid    |
| -------------------- | ------------------- | ----------------- | ---------- | ------------ |
| Northgate Energy     | NL00DEMO9900 1122   | trusted, verified | 6          | 12 days ago  |
| David Whitfield      | NL00DEMO0088 7711   | trusted, verified | 4          | 3 months ago |
| Clara's Pharmacy     | NL00DEMO4455 6677   | trusted, verified | 5          | 22 days ago  |
| Rosewood Garden Care | NL00DEMO3322 1100   | known             | 2          | 2 months ago |

### Seeded history
Nine outgoing transactions over 90 days, € 18 – € 340, median ≈ € 85, largest € 340 (annual insurance). **Seeded relative to a frozen `DEMO_NOW`** so "12 days ago" is stable across sessions and screenshots. `[v2]`

### Mock Confirmation of Payee `[v2 — was implied but had no data source]`

`src/data/mockCopDirectory.ts`, keyed by normalised IBAN, returning one of four outcomes:

| Outcome | Meaning | Example |
| --- | --- | --- |
| `match` | Name matches the account | seeded payees |
| `close_match` | Name is similar but not identical | "R. Klein" vs "Robert Klein" |
| `no_match` | Different name on the account | invoice-redirect scenario |
| `unavailable` | Bank did not respond | any unknown IBAN |

Unknown IBANs default to `unavailable`, not `match`. Absence of evidence is not evidence of safety.

---

## CLOCK `[v2 — new section]`

Every time-dependent behaviour depends on a single injectable clock. Nothing in `src/` may call `Date.now()` or `new Date()` directly outside `src/clock.ts`.

```ts
// src/clock.ts
export const DEMO_NOW: string;              // frozen seed epoch
export function now(): number;
export function advance(ms: number): void;  // demo panel + tests
export function setNow(iso: string): void;
export function reset(): void;
```

Depends on it: cooling-off holds, 24h approval expiry, 24h settings delay, velocity (R09), daily limit (R18), resubmission window (R19), night-time (R10), all "3 days ago" formatting, and the seeded history.

**No timers on the server, because there is no server.** Time-driven transitions use **lazy materialisation**:

```ts
materialiseTime(state, now) → state'   // pure, idempotent
```

Run it on app load, on `visibilitychange`/`focus`, before every dispatched action, and on a 15-second interval **only while a hold or a pending settings change is active**. It applies `APPROVED_HOLD → SENT`, `PENDING_APPROVAL → EXPIRED`, and commits due `PendingSettingsChange` records, writing audit entries for each.

---

## TRANSFER FLOW (sender)

A 5-step wizard, **one question per screen**, persistent progress indicator ("Step 3 of 5"), large Back button. Nothing auto-advances; no countdowns except the explicit cooling-off hold. **No session timeout anywhere.** Drafts resume exactly where left. `[v2]`

1. **Who are you paying?** — pick from address book, or "Someone new" → name, IBAN, optional country. Calm note: *"New payees get an extra safety check. This is normal."*
2. **How much?** — large numeric keypad **and a plain typable number field** `[v2 — keypad-only is a keyboard trap]`, amount echoed in words, live remaining-balance preview.
3. **Why are you sending this money?** — **mandatory**. Category chips + free text (min 10 characters).
   Categories: `Bill or utility` · `Family or gift` · `Shopping / goods` · `Rent or care costs` · `Medical` · `Repairs or tradesperson` · `Investment or savings` · `Fees, tax or customs` · `Helping someone out` · `Other`
4. **Safety check** — three yes/no questions, always shown:
   - "Did someone contact **you** first about this payment?"
   - "Has anyone asked you to keep this payment **secret**, or to hurry?"
   - "Have you spoken to this person **on a number you already had**?"
   Answers are quoted verbatim to the approver.
5. **Check and confirm** — full summary, risk panel, outcome banner: *Send now* / *Ask David* / *Ask David + 30-minute hold*.

`[v2]` **Do not live-score the reason text as she types.** Compute and reveal the assessment at step 5 only. Live scoring reads as surveillance, and it teaches keyword-avoidance — which is exactly what a coaching scammer wants. Step 3 shows only the R08 length hint.

---

## RISK ENGINE

Pure function, no side effects, fully unit-tested:

```ts
assessRisk(draft: TransferDraft, ctx: RiskContext): RiskAssessment
```

### Additive rules

| ID  | Rule                                                                   | Points |
| --- | ---------------------------------------------------------------------- | ------ |
| R01 | Payee never paid before                                                 | +20 |
| R02 | Payee added less than 7 days ago                                        | +10 |
| R03 | Amount above approval threshold                                         | +15 |
| R04 | Amount > 3× the 90-day median **and** > the largest 90-day payment `[v2]` | +15 |
| R05 | Amount ≥ 60% of current balance                                         | +20 |
| R06 | Reason text matches a **Tier A** keyword                                | +30 each, contribution capped at 40 |
| R07 | Reason text matches a **Tier B** keyword                                | +15 each, contribution capped at 25 |
| R08 | Reason vague: `Other` with < 15 chars of detail                         | +10 |
| R09 | 3+ transfers to the same payee in the last 24 h (incl. this one) `[v2]` | +15 |
| R10 | Created between 00:00 and 06:00 local time                              | +10 |
| R11 | Payee IBAN country ≠ account country                                    | +15 |
| R12 | Payee country on the demo high-risk list                                | +20 |
| R13 | Confirmation of Payee: `no_match` +25 · `close_match` +15 · `unavailable` +5 `[v2]` | ≤ +25 |
| R14 | "Someone contacted me first" = yes                                      | +20 |
| R15 | "Asked to keep it secret / hurry" = yes                                 | +35 |
| R16 | "Have not verified on a known number" = yes                             | +15 |
| R17 | Round amount: multiple of €500 and ≥ €1,000 `[v2 — was undefined]`      | +5  |
| R18 | This transfer pushes the rolling 24 h outgoing total above the **daily limit** `[v2]` | +20 |
| R19 | New transfer to a payee **rejected within the last 72 h** `[v2]`        | +20 |

`[v2]` **R06/R07 cap semantics, previously ambiguous:** each *distinct* matched keyword scores once; Tier A contribution caps at 40, Tier B at 25, and the two combined cap at **55**.

`[v2]` **R18** finally gives `dailyLimitCents` a job. Exceeding the daily limit **forces approval — it never hard-blocks**. Hard blocks cause displacement: the sender just opens their real bank app, outside the protective layer.

`[v2]` **R19 is the highest-value addition.** A coached victim resubmits with softer wording within minutes of a rejection. The approval page must show the prior rejection **and a visible diff of the two reason texts**.

### Mitigating rules `[v2 — new; the engine was additive-only and produced false alarms]`

| ID  | Rule                                                             | Points |
| --- | ---------------------------------------------------------------- | ------ |
| M01 | Payee paid 3 or more times                                        | −15 |
| M02 | Payee paid within the last 90 days                                | −10 |
| M03 | Amount within ±20% of a recurring payment to this payee           | −15 |
| M04 | All three safety answers reassuring (no / no / yes)               | −10 |

**Mitigator gating — mitigators are ignored entirely if any of these is true:**
- any Tier A keyword matched (R06), or
- CoP returned `no_match` (R13), or
- "asked to keep it secret or hurry" = yes (R15).

Without this gate, a compromised trusted payee or a coached victim gets their score suppressed by familiarity. Score floors at 0 and caps at 100.

### Bands and required action

| Band     | Score  | Label                    | Required action |
| -------- | ------ | ------------------------ | --------------- |
| LOW      | 0–24   | "Looks normal"           | Send immediately if amount ≤ threshold; else request approval |
| MEDIUM   | 25–49  | "Worth a second look"    | Request approval regardless of amount; tailored warning |
| HIGH     | 50–74  | "This looks risky"       | Request approval + prominent scam explainer + suggest phoning David |
| CRITICAL | 75–100 | "This looks like a scam" | Request approval + **30-minute hold after approval** + explainer + report route |

### Calibration targets — these are tests, not aspirations `[v2]`

| Case | Expected |
| --- | --- |
| €62.40, Northgate Energy, "Monthly electricity bill" | LOW, score 0, sends immediately |
| €2,000, **new** tradesperson, honest reason, safety answers reassuring | **MEDIUM (≈45), not HIGH** |
| €340 annual insurance renewal, known payee | LOW |
| €1,200 holiday deposit to a new payee abroad, clear reason | MEDIUM, not HIGH |
| €900 to grandchild's new account, "Birthday, first payment to her new bank" | MEDIUM, not HIGH |
| Courier scenario (below) | CRITICAL, capped 100 |

An engine that never fires is useless; an engine that fires on ordinary life trains the sender to click through warnings. **Test both directions.**

### Assessment output

```ts
type RiskAssessment = {
  score: number;                    // NEVER shown to the sender  [v2]
  band: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresApproval: boolean;
  coolingOffMinutes: 0 | 30;
  reasons: Array<{
    ruleId: string;
    points: number;                 // negative for mitigators  [v2]
    plainLanguage: string;          // sender: ≤ 18 words, no jargon, no blame
    technical: string;              // approver
  }>;                               // sorted by |points| descending  [v2]
  matchedScamPatterns: Array<'courier' | 'romance' | 'investment' | 'impersonation'
                           | 'techSupport' | 'advanceFee' | 'invoiceRedirect'>;  // [v2] plural
  assessedAt: string;               // [v2]
  engineVersion: string;            // [v2]
};
```

`[v2]` **The numeric score is never rendered on Margaret's screens.** "Score 100/100" is meaningless to her and reads as a judgement of *her*. She sees the band label, the icon and the plain-language reasons. David sees score, rule IDs and points.

`[v2]` `matchedScamPatterns` is an array with a documented priority order — the courier scenario legitimately matches `impersonation` *and* `advanceFee`. Render the highest-priority explainer prominently and list the others.

Plain-language examples — never accusatory:
- ✅ "This is the first payment to this person."
- ✅ "This is much larger than your usual payments."
- ✅ "Real banks and the police never ask you to move money to keep it safe."
- ❌ "You are being scammed."  ❌ "Suspicious user behaviour detected."

Keep keyword lists in `src/data/riskKeywords.ts`. Matching is case-insensitive, diacritic-insensitive, word-boundary aware.

**Tier A:** `crypto`, `bitcoin`, `ethereum`, `wallet`, `gift card`, `voucher`, `itunes`, `steam`, `google play`, `lottery`, `prize`, `winnings`, `inheritance`, `customs fee`, `release fee`, `tax refund`, `hmrc`, `bank security`, `fraud department`, `police`, `arrest`, `microsoft support`, `remote access`, `anydesk`, `teamviewer`, `guaranteed return`, `double your money`, `safe account`, `mule`, `escrow`

**Tier B:** `urgent`, `today only`, `immediately`, `secret`, `don't tell`, `do not tell`, `surprise`, `emergency`, `stuck abroad`, `hospital fee`, `unlock`, `verify`, `reactivate`, `fee to receive`, `last chance`, `new bank details`, `changed account`, `love`, `met online`

---

## APPROVAL FLOW (approver)

**Notification (must be unmissable)**
1. Bell icon with unread count in the approver's header.
2. Toast/banner on the dashboard, appearing **live** if the tab is open (via `BroadcastChannel`).
3. `document.title` prefix `(1) SafeSend`.
4. A **Notification Inbox** page rendering three mock previews per event.
5. Optional browser `Notification` API if permission is already granted — never block the flow on it.

`[v2]` **The SMS preview must not contain a link.** The original draft's `Review: safesend.demo/a/8F21` teaches precisely the behaviour smishing exploits. Use:

> `SafeSend: Margaret has asked to send €4,500 to a new payee. Flagged HIGH RISK. Open your SafeSend app to review. We never send links or ask for codes.`

Add a one-line UI note explaining *why* the SMS has no link. It's a teaching moment and it costs nothing.

`[v2]` Reference codes (`8F21`) use **Crockford base32** — no `0/O`, `1/I/L`. David will read them to Margaret over the phone.

**Approval detail page shows:** amount; payee (name, IBAN, country, first-time flag, **CoP result**); **the stated reason verbatim**; the three safety answers verbatim; the full risk report with per-rule points **including mitigators applied or gated**; Margaret's 90-day pattern (bar chart); matched scam patterns with explainers; **any prior rejection of this payee within 72h, with a reason-text diff (R19)**.

`[v2]` **Add a "How to talk about this" panel.** Direct accusation reliably entrenches the target — this is the best-evidenced finding in the whole domain, and it's the part of the flow that actually determines the outcome. Give David three open questions to ask and a note that the goal is for Margaret to reach her own conclusion:
- *"Tell me how this came about — who got in touch first?"*
- *"What did they say would happen if you didn't pay today?"*
- *"Shall we ring the number on your bank card together and check?"*

**Approver actions**
- **Approve** — optional note. HIGH/CRITICAL require ticking *"I have spoken to Margaret directly about this payment."*
- **Reject** — reason required: `I think this is a scam` / `Wrong details` / `Let's talk first` / `Other`.
- **Ask a question** — free text; returns to Margaret as `INFO_REQUESTED`.
- **Add to trusted payees** — future payments below threshold skip approval. `[v2]` **Margaret is notified and can revoke this within the app.** Otherwise an abusive approver can whitelist their own account silently.

**Escalation safety valve:** if a request is `CRITICAL` and Margaret has not opened SafeSend for 10 minutes after rejection, David sees a suggested action card: *"Call Margaret now"* with her demo number. No automation — a prototype must not simulate contacting anyone.

`[v2]` **Aftermath card, shown to both parties after a scam rejection.** `REJECTED` is currently a dead end, and scammers escalate after a block. Show: don't re-engage or reply; expect a follow-up call, possibly claiming to be the bank; the bank will never ask you to move money; here's how to report; here's how to change your online banking password.

---

## TRANSFER STATE MACHINE

```
DRAFT
  → PENDING_APPROVAL   (threshold exceeded OR band ≥ MEDIUM OR R18)
  → SENT               (LOW band and amount ≤ threshold and within daily limit)
  → BLOCKED            (band = CRITICAL and settings.blockCriticalOutright)   [v2]
  → CANCELLED          (sender cancels)

PENDING_APPROVAL
  → APPROVED_HOLD      (approved, coolingOffMinutes = 30)
  → SENT               (approved, no hold)
  → REJECTED           (approver rejects, reason required)
  → INFO_REQUESTED     (approver asks a question)
  → EXPIRED            (no decision within 24 h)

INFO_REQUESTED → PENDING_APPROVAL (sender replies) | CANCELLED
APPROVED_HOLD  → SENT (hold elapses) | CANCELLED (either party, during hold)
EXPIRED        → (terminal; sender may one-tap resubmit as a new DRAFT)        [v2]
REJECTED       → (terminal; resubmission to same payee within 72h fires R19)   [v2]
BLOCKED        → (terminal; explainer + route to "talk to David")              [v2]
```

`[v2]` **Gaps that must be closed explicitly, not improvised:**

| Gap | Rule |
| --- | --- |
| Daily limit | Forces approval (R18). Never a hard block. |
| `blockCriticalOutright` | Adds terminal `BLOCKED` state, with explainer and a route forward. Never a dead end, never a scolding. |
| Reply to `INFO_REQUESTED` | **Re-run `assessRisk` including the reply text.** The band may rise; it may never silently fall. If it rises, the approver sees "risk increased after reply" with a before/after. |
| Risk snapshot | Freeze the assessment at submission (`assessedAt`, `engineVersion`). Recompute only on reply or resubmission. |
| Expiry with no response | Prominent on Margaret's home screen; one-tap resubmit; **offer the second trusted contact** if configured. |
| Same-millisecond audit ordering | Monotonic `seq` integer, not timestamps alone. |

Rules: only the sender may create or cancel; only the approver may approve/reject/ask; transitions are validated in the reducer and rejected with a clear error if illegal; **every** transition writes an immutable audit entry `{ id, seq, transferId, actor, action, fromState, toState, timestamp, note }`.

---

## ANTI-COERCION MODEL `[v2 — substantially rewritten]`

The v1 rule — *removing the approver requires the approver's confirmation* — defends against a scammer-coerced removal but creates the mirror risk. **The majority of financial abuse of older adults is committed by family members.** Giving David a veto over his own removal turns a consent-based safety layer into a cage, which is exactly what the brief's own decision logic forbids.

**Corrected model:**

| Change | Who can start it | Delay | Who can cancel during the delay | Notified |
| --- | --- | --- | --- | --- |
| Raise approval threshold | Approver only | 24 h | Both | Both |
| Lower approval threshold | Either | none | — | Both |
| Add trusted payee | Approver only | 24 h | **Sender can revoke any time, before or after** | Both |
| **Remove / replace trusted contact** | **Sender only** | **24 h** | **Sender only — the approver cannot block it** | Both |
| Activate second trusted contact | Sender | 24 h | Sender | Both |

Reasoning: a live scammer cannot wait 24 hours and will move on; a controlling relative should never get a veto. The delay + dual notification + audit entry is enough friction for the scam case without creating the abuse case.

Additionally:
- Provide **"Change who helps me"** (swap) as a distinct, less drastic path from **"Stop asking David"**.
- Protection can always be *strengthened* instantly and *weakened* only on a delay.
- The approver can never move money, initiate a transfer, see spending detail beyond the seeded 90-day summary, or take any action Margaret can't see in `/audit`.
- Do **not** add a "skip safety check" or "send anyway" bypass for the sender. That is the single most exploitable control in this design.

`[v2]` Record honestly in `NOTES.md`: **in a single-device demo, the persona switcher itself is the bypass.** Different PINs per persona perform the separation; they do not provide it.

---

## CROSS-TAB SYNC `[v2 — new section]`

Two tabs writing the same `localStorage` key will clobber each other. Specify:

- Every state object carries a monotonically increasing `revision: number`.
- Every tab has a random `tabId`; broadcast messages include it and are **ignored if they echo the sender**.
- Broadcast the **full state**, not deltas — the state is small and deltas invite divergence.
- On receive: **adopt if `incoming.revision > local.revision`**, otherwise ignore and re-broadcast local.
- Write to `localStorage` **after** applying, so the `storage` fallback carries the same revision.
- On adopt, run `materialiseTime` before rendering.

---

## SCREENS

**Shared**
- `/` Demo landing: persona cards, "Open both side by side", permanent yellow `DEMO — no real money moves` banner, *How this demo works*.
- `/setup` **"Our agreement"** `[v2 — new]`. Read-only artefact: when the arrangement was made, by whom, its scope, exactly what each party can and cannot do, and who can change what. The brief calls this consent-based; nothing in v1 actually embodied consent as an object in the product.
- `/audit` Audit log, filterable, visible to both personas.
- `/demo` Demo control panel: reset, load scenario, **advance the clock**, force a risk band, toggle threshold, jump to any transfer state.

**Margaret (sender)** — Simple mode
- `/m` Home: balance, one huge **Send money** button, any question from David, pending transfers, expired transfers, last 5 payments.
- `/m/send` The 5-step wizard.
- `/m/transfer/:id` Status page, plain-language timeline, big **Cancel this payment**.
- `/m/activity` History with status chips.
- `/m/helpers` "Who helps me": David's card, current threshold, what he can and cannot see, "Change who helps me", "Stop asking David" (24 h, sender-cancellable).
- `/m/help` "Is this a scam?" — 6 illustrated cards: courier/"safe account", romance, tech support, investment, prize/advance fee, invoice redirect. Each: how it starts, what they say, what to do.
- `/m/report` **"Report a concern"** `[v2 — was a button with no destination]`. Placeholder guidance page. `README.md` must state that a production build needs the correct national fraud line for its jurisdiction.

**David (approver)** — Standard mode
- `/d` Dashboard: pending approvals (risk-sorted), unread notifications, Margaret's activity, this-month spend vs. usual.
- `/d/approve/:id` Approval detail (above).
- `/d/notifications` Notification inbox with SMS/email/push previews.
- `/d/settings` Threshold (slider **plus numeric input and ± steppers** `[v2]`, €100–€2,500, default **€500**), daily limit (default €1,000), "always approve new payees" (on), "always approve cross-border" (on), "block CRITICAL outright" (off), trusted-payee management, pending changes with countdowns.

`[v2]` **Every screen needs an empty state, an error state and a first-run state.** Corrupt `localStorage` → reseed with a visible, non-alarming message.

---

## DATA MODEL

```ts
type Persona = 'margaret' | 'david';

type Account = {
  id: string; ownerName: string; role: 'sender' | 'approver';   // [v2]
  iban?: string; balanceCents?: number; currency: 'EUR'; countryCode: 'NL';
};

type CopResult = 'match' | 'close_match' | 'no_match' | 'unavailable';  // [v2]

type Payee = {
  id: string; displayName: string; iban: string; countryCode: string;
  status: 'trusted' | 'known' | 'new';
  isSaved: boolean;                       // [v2]
  addedAt: string; lastPaidAt?: string; timesPaid: number;
  copResult?: CopResult; copNameOnAccount?: string;
};

type SafetyAnswers = {
  contactedFirst: boolean | null;
  askedToKeepSecretOrHurry: boolean | null;
  verifiedOnKnownNumber: boolean | null;
};

type Transfer = {
  id: string;                              // Crockford base32  [v2]
  createdAt: string; createdBy: Persona;
  payee: Payee;                            // [v2] always a full Payee; ad-hoc payees
                                           // materialise with status:'new', isSaved:false
  amountCents: number; currency: 'EUR';
  reasonCategory: ReasonCategory; reasonText: string;
  safetyAnswers: SafetyAnswers;
  risk: RiskAssessment;
  priorReasonText?: string;                // [v2] for the R19 diff
  supersedesTransferId?: string;           // [v2] resubmission chain
  state: TransferState;
  approval?: { decidedBy: Persona; decidedAt: string;
               decision: 'approved' | 'rejected'; note?: string;
               rejectionReason?: string; spokeToSenderConfirmed?: boolean };
  infoRequest?: { question: string; askedAt: string; answer?: string; answeredAt?: string };
  holdUntil?: string; sentAt?: string; expiresAt?: string;   // [v2]
};

type NotificationEvent = {
  id: string; toPersona: Persona;
  type: 'approval_requested' | 'approved' | 'rejected' | 'info_requested'
      | 'info_answered' | 'hold_started' | 'sent' | 'expired'
      | 'settings_change_pending' | 'settings_change_applied'          // [v2]
      | 'trusted_payee_added' | 'contact_removal_pending';             // [v2]
  transferId?: string; createdAt: string; readAt?: string;
  channels: { inApp: true; smsPreview: string; emailSubject: string;
              emailBody: string; pushBody: string };
};

type PendingSettingsChange = {                                          // [v2]
  id: string; field: keyof Settings | 'approverRemoved' | 'approverReplaced';
  currentValue: unknown; newValue: unknown;
  requestedBy: Persona; requestedAt: string; effectiveAt: string;
  cancellableBy: Persona[];
};

type Settings = {
  approvalThresholdCents: number;    // 50000
  dailyLimitCents: number;           // 100000
  alwaysApproveNewPayees: boolean;   // true
  alwaysApproveCrossBorder: boolean; // true
  blockCriticalOutright: boolean;    // false
  secondContactActive: boolean;      // false  [v2]
};

type AppState = {
  schemaVersion: 1; revision: number;  // [v2]
  /* … */
};
```

---

## FILE STRUCTURE

```
safesend/
  README.md                  # how to run + 3 scripted demo walkthroughs
  NOTES.md                   # assumptions, deviations, known limitations
  src/
    main.tsx  App.tsx  router.tsx
    config.ts                        # currency, locale, thresholds, feature flags
    copy.ts                          # [v2] ALL user-facing strings, one place
    clock.ts                         # [v2]
    state/  AppStateProvider.tsx  reducer.ts  persistence.ts  broadcast.ts
            materialiseTime.ts  migrations.ts                     # [v2]
    risk/   assessRisk.ts  rules.ts  mitigators.ts  scamPatterns.ts
            assessRisk.test.ts  falsePositives.test.ts            # [v2]
    data/   seed.ts  riskKeywords.ts  highRiskCountries.ts
            mockCopDirectory.ts  scenarios.ts                     # [v2]
    components/  Money.tsx  BigButton.tsx  RiskPanel.tsx  RiskBadge.tsx
                 NotificationBell.tsx  NotificationPreview.tsx  Timeline.tsx
                 ScamExplainer.tsx  DemoBanner.tsx  ConfirmDialog.tsx
                 ReasonDiff.tsx  TalkAboutIt.tsx  AftermathCard.tsx   # [v2]
                 EmptyState.tsx  ErrorState.tsx                       # [v2]
    screens/sender/    Home  SendWizard  TransferStatus  Activity  Helpers  Help  Report
    screens/guardian/  Dashboard  ApprovalDetail  Notifications  Settings
    screens/shared/    Landing  Agreement  AuditLog  DemoPanel
```

`[v2]` `copy.ts` matters more than it looks: the brief parameterises currency and thresholds but hardcodes strings, yet the sender copy is the part most likely to need review for reading level — and it stops "Margaret" being baked into forty components.

---

## SEEDED DEMO SCENARIOS

1. **Normal bill** — €62.40 → Northgate Energy, "Monthly electricity bill" → LOW (score 0), sends instantly. *Proves the layer is not annoying.*
2. **Legitimate large payment** — €1,850 → Rosewood Garden Care, "New fence and gate, quoted in writing" → MEDIUM → David approves in 2 clicks.
3. **Legitimate new payee** `[v2 — new; the false-positive case]` — €2,000 → new tradesperson "Van Dijk Roofing", "Roof repair after the storm, he came recommended by the neighbours", safety answers reassuring → **MEDIUM, approval required, no scam explainer, no alarming language.** *Proves the engine is calibrated, not just loud.*
4. **Courier / "safe account" scam** — €4,500 → new payee "Robert Klein" (DE), *"Bank fraud department told me to move my money to a safe account today, urgent, do not tell anyone"*, contacted-first = yes, secrecy = yes, verified = no → **CRITICAL (100)**, approval + 30-min hold + courier explainer.
5. **Romance scam** — €900 → new payee in a high-risk country, *"Helping my friend I met online, he is stuck abroad and needs a hospital fee"* → HIGH.
6. **Invoice redirect** — €1,200 → "Northgate Energy" with a **different IBAN**, *"They emailed me new bank details"* → HIGH via R13 `no_match` + R07.
7. **Threshold-splitting** `[v2 — corrected]` — three €480 payments to **Rosewood Garden Care** within 3 hours. The v1 version used a *new* payee, where R01 (+20) and `alwaysApproveNewPayees` already force approval on the first payment, so it never demonstrated anything. With a known payee: #1 LOW (score 5) sends; #2 LOW (20) sends; **#3 fires R04 + R09 + R18 = MEDIUM (40) and forces approval.** *Now it actually proves splitting is caught.*
8. **Tech support scam** — €2,000, *"Microsoft support helped me with my computer, they need a refund fee via AnyDesk"* → CRITICAL.
9. **Resubmission after rejection** `[v2 — new]` — reject scenario 4, then resubmit €4,500 to Robert Klein with sanitised wording *"Money for Robert, personal"* → R19 fires, the approval page shows the prior rejection and the reason-text diff. *Proves the layer survives coaching.*

---

## ACCESSIBILITY `[v2 — corrected; several v1 specs would have failed or backfired]`

- **`aria-live="polite"` on risk warnings, not `assertive`.** Assertive interrupts mid-sentence. Announce only on **band change**, debounced 500 ms, and move focus to the risk panel heading on reveal.
- **`aria-live="polite"` on the notification bell.**
- **Threshold slider must not be drag-only** — WCAG 2.2 **SC 2.5.7 Dragging Movements**. Pair with numeric input and ± steppers.
- **Reflow target is 320 CSS px** (SC 1.4.10), not 375. Test at 400% zoom.
- **SC 2.4.11 Focus Not Obscured** — the sticky demo banner is the likely offender. Verify focused elements are never covered on scroll.
- **SC 3.3.7 Redundant Entry** — never re-ask payee details across wizard steps.
- **SC 3.3.8 Accessible Authentication** — the PIN field must allow paste and autofill. No puzzles, no memory tests.
- **Wizard focus management** — on step change, move focus to the step `<h1>`; the heading includes "Step 3 of 5". Don't rely on a visual progress bar alone.
- **No session timeouts anywhere.** Drafts resume where left. Back never loses data.
- Base font 18px (Margaret) / 16px (David); headings 28–40px; line-height ≥ 1.5.
- Targets ≥ 48×48px; ≥ 16px between primary actions.
- Contrast ≥ 4.5:1 text, ≥ 3:1 UI borders. **Never colour alone** — every band carries an icon *and* a text label.
- Risk palette: LOW `emerald`, MEDIUM `amber`, HIGH `orange`, CRITICAL `red`.
- Money always via `<Money/>`: `Intl.NumberFormat('en-GB', { style:'currency', currency:'EUR' })`, integer cents.
- Dates as "Today at 10:42" / "3 September 2026". Never raw ISO in the UI.
- Full keyboard operability, visible focus rings, semantic landmarks, labelled fields with inline errors, `prefers-reduced-motion` respected.
- Single column ≤ 640px; Margaret's UI stays single-column at all widths.

Accessibility here is a safety control, not a nicety: **an unreadable warning is a failed warning.**

---

## SAFETY & ETHICS

- Persistent, non-dismissible banner: **"DEMO ONLY — no real money moves and no real bank is connected."**
- No real PII. Fictional names, `NL00DEMO…` IBANs, `+31 6 0000 0000`, `@example.com`, `safesend.example`.
- No real bank branding, logos, or real fraud-hotline numbers.
- Scam-education content is **defensive only** — recognition and resistance; never scripts, templates, or operational detail.
- No ageist framing: no `elderly`, `vulnerable`, `incapable`, `granny`. Use `sender`, `account holder`, `trusted contact`, `approver`. `[v2]` **Also drop `guardian`.**
- `NOTES.md` must state plainly that a real deployment needs consent records, a mandate/power-of-attorney framework, safeguarding escalation paths, GDPR data-minimisation review and regulatory sign-off — and that none of it is present here.
- `[v2]` `NOTES.md` must also record: **the persona switcher is the bypass**; the risk engine is uncalibrated against real fraud data; the 24-hour delays are the central design bet and are untested with real users; and the second-contact slot exists because single-approver availability is a genuine single point of failure.

---

## TONE & STYLE

- **Margaret's screens:** reading age ~10. Short sentences. Second person. No jargon (`transfer` → *payment*; `payee` → *the person you're paying*; `authenticate` → *check it's you*). Calm, warm, never alarmist, never patronising. **No numeric risk score.**
- **David's screens:** concise and factual. Recommendation first, then evidence, then rule IDs and points.
- **Warnings:** fact → reason → action. *"This is your first payment to Robert Klein. Scammers often ask for money to a brand-new account. David will check this before it's sent."*
- **Refusals/blocks:** explain and offer a route forward. Never a dead end, never a scolding.

---

## DELIVERY PLAN `[v2 — new; this is 2–3× a single build session]`

**M1 — demo-able vertical slice.** Landing + PIN → clock + seed → risk engine + both test suites → 5-step wizard → approval detail → approve/reject → audit log → demo banner. *Stop and verify this works end-to-end before continuing.*

**M2 — the demo's showpieces.** Cross-tab sync, notification inbox with SMS/email/push previews, cooling-off hold + countdown, info-request round trip, resubmission/R19.

**M3 — depth.** Scam-education cards, `/setup` agreement, scenarios 5–9, settings + pending changes, anti-coercion delays, aftermath card, "how to talk about this", empty/error states, full accessibility pass.

---

## ACCEPTANCE CRITERIA

1. From `/`, enter as either persona and switch without losing state.
2. €62 to Northgate Energy with a clear reason sends immediately; no approval, no alarming language.
3. €4,500 to a new payee with scam-keyword reason scores **CRITICAL**, lists ≥ 5 named reasons, cannot be sent without David.
4. **`[v2]` €2,000 to a new tradesperson with an honest reason scores MEDIUM, not HIGH — approval required, no scam explainer.**
5. Reason is mandatory; step 3 cannot pass without a category and ≥ 10 characters.
6. With David's tab open, submitting increments his bell and shows a toast **without refresh**; `document.title` shows `(1)`.
7. David's approval page shows the reason and all three safety answers verbatim.
8. Rejecting requires a reason; Margaret's status page shows it in plain language plus a route to `/m/help`.
9. "Ask a question" round-trips, **and the reply is re-scored** — band may rise, never silently fall. `[v2]`
10. CRITICAL approval enters `APPROVED_HOLD` with a visible 30-minute countdown and working Cancel for both parties.
11. **`[v2]`** Three €480 payments to a **known** payee: the third triggers R04 + R09 + R18 and forces approval.
12. **`[v2]`** Resubmitting to a payee rejected within 72 h fires R19 and shows the prior rejection with a reason-text diff.
13. **`[v2]`** A `PENDING_APPROVAL` transfer left 24 h (via the demo clock) becomes `EXPIRED`, is surfaced prominently to Margaret, and offers one-tap resubmit.
14. `/audit` shows every action by both parties with actor, timestamp, sequence and state change.
15. **`[v2]`** Margaret cannot raise the threshold or add a trusted payee. She **can** start removal of David — with a 24 h delay, dual notification, and cancellable **only by her**. David cannot block it.
16. **`[v2]`** A settings change by David generates a notification to Margaret and an audit entry.
17. `assessRisk` tests cover all 19 rules, all 4 mitigators, the mitigator gate, both cap semantics, all 4 bands, **and the false-positive calibration table**. `[v2]`
18. **`[v2]`** Zero outbound network requests after initial load — verify with DevTools Network on reload. The strongest possible demonstration of the privacy claim.
19. Keyboard-only completion of the whole send flow at 200% zoom on a 320px viewport; `jest-axe` and axe DevTools report no critical violations. `[v2]`
20. **`[v2]`** `prefers-reduced-motion: reduce` removes all non-essential animation, including the hold countdown pulse.
21. `npm run build` and `npm test` pass clean, no console errors.
22. `README.md` contains three scripted walkthroughs (happy path, courier scam, threshold-splitting) a non-technical reviewer can follow.

`[v2]` **On testing #6 honestly:** cross-tab sync is the flakiest feature here and cannot be covered by `vitest`. Either add Playwright or write an explicit manual test script in `README.md` — do not leave it implicitly "tested".

---

## SELF-CHECK BEFORE FINISHING

- [ ] Build passes; tests pass; no console errors; no unused dependencies.
- [ ] No real bank names, real IBANs, real people, real hotline numbers, real domains.
- [ ] Demo banner on every screen, and it never obscures a focused element.
- [ ] Every risk reason has both `plainLanguage` and `technical`; no `plainLanguage` string blames or shames.
- [ ] **The numeric score appears nowhere on the sender's screens.**
- [ ] No sender-side bypass of the safety check or approval requirement exists anywhere in the reducer.
- [ ] **No approver veto over their own removal exists anywhere in the reducer.**
- [ ] **The false-positive suite passes** — the engine is quiet on all six ordinary-life cases.
- [ ] No `Date.now()` or `new Date()` outside `clock.ts`.
- [ ] `NOTES.md` lists assumptions, deviations, and "not production-ready" limitations, including the persona-switcher bypass.
- [ ] Fix anything failing, then re-verify once before reporting completion.

