# SafeSend (demo)

A clickable prototype of a **protective approval layer** between a bank account
holder and an outgoing transfer.

> **DEMO ONLY — no real money moves and no real bank is connected.**
> No backend, no network calls after the page loads, no real people, no real IBANs.

---

## Run it with Docker (port 3100)

```bash
docker compose up --build
```

Then open **http://localhost:3100**.

That builds the app, runs the type-check and all 123 tests inside the image
(a failing test fails the build), and serves the static bundle with nginx
listening on port 3100. Health check: `http://localhost:3100/healthz`.

Without compose:

```bash
docker build -t safesend .
docker run --rm -p 3100:3100 safesend
```

Hot-reloading dev server in a container, same port:

```bash
docker compose --profile dev up safesend-dev
```

## Run it without Docker

```bash
npm install
npm run dev        # http://localhost:3100
npm test           # 123 tests
npm run build      # type-check + production bundle into dist/
npm run preview    # serve dist/ on http://localhost:3100
```

Node 20 or later.

---

## The two demo accounts

| | Account holder | Trusted contact |
| --- | --- | --- |
| Name | Margaret Whitfield, 78 | David Whitfield, 49 (son) |
| Role | `sender` | `approver` |
| Demo PIN | `1978` | `4901` |
| UI | Simple mode — 18px base, one question per screen | Standard mode — denser dashboard |

The PIN field accepts paste and autofill (WCAG 2.2 SC 3.3.8). There is no
session timeout anywhere, and drafts resume exactly where they were left.

---

## Three scripted walkthroughs

A non-technical reviewer can follow these end to end. Each takes about two
minutes. Use **Demo controls** (link in the footer, or `/demo`) to reset
between runs.

### Walkthrough 1 — the happy path: an ordinary bill

*What it proves: the safety layer stays out of the way on normal payments.*

1. Open http://localhost:3100 and enter as **Margaret** (PIN `1978`).
2. Press the big **Send money** button.
3. **Step 1** — choose **Northgate Energy**, press Continue.
4. **Step 2** — type `62.40`. The amount is read back in words and the
   remaining balance updates. Press Continue.
5. **Step 3** — choose **Bill or utility** and type
   `Monthly electricity bill`. Press Continue.
6. **Step 4** — answer **No**, **No**, **Yes**. Press Continue.
7. **Step 5** — press **Check this payment**.
   You should see **“Looks normal”**, no scam explainer, no alarming language,
   and *“This can be sent straight away.”*
8. Press **Send now**. The payment goes immediately. David is never involved.

Expected risk: LOW, score 0.

### Walkthrough 2 — the courier / “safe account” scam

*What it proves: the engine fires hard on a real scam, explains why, and cannot
be bypassed.*

1. As **Margaret**, press **Send money**.
2. **Step 1** — choose **Someone new**. Name `Robert Klein`,
   IBAN `DE00DEMO55667788`. The country fills in as Germany. Continue.
3. **Step 2** — `4500`. Continue.
4. **Step 3** — choose **Other**, and type:
   `Bank fraud department told me to move my money to a safe account today, urgent, do not tell anyone`
   Note that **nothing is scored while you type**. Continue.
5. **Step 4** — answer **Yes**, **Yes**, **No**. Continue.
6. **Step 5** — press **Check this payment**.
   You should see **“This looks like a scam”**, at least five named reasons in
   plain language, the *“safe account”* explainer, and a prompt to ring David.
   **No number is shown to Margaret anywhere.**
7. Press **Ask David, then a 30-minute wait**.
8. Press **Switch person** → enter as **David** (PIN `4901`).
   The request is at the top of his dashboard, risk-sorted.
9. Open it. He sees the score `100/100`, every rule ID and its points, the
   mitigators that were *calculated and then gated*, Margaret's reason word for
   word, all three safety answers word for word, the Confirmation-of-Payee
   result, her 90-day pattern, and a **“How to talk about this”** panel.
10. Try **Approve** without ticking *“I have spoken to Margaret directly”* —
    it is refused. Tick it, approve, and the payment enters a visible
    **30-minute hold** that either party can cancel.
11. Or press **Reject**, choose *“I think this is a scam”*. Both Margaret and
    David then see the **aftermath card**: don't re-engage, expect a follow-up
    call, change your banking password, how to report.

### Walkthrough 3 — threshold splitting

*What it proves: three payments that are individually unremarkable are caught
as a pattern.*

1. Go to **Demo controls** (`/demo`) and load scenario
   **7. Threshold splitting**. That seeds two €480 payments to Rosewood Garden
   Care (a payee Margaret has used before) in the last three hours, and puts a
   third €480 payment on step 5.
2. Press **Check this payment**.
   The third one fires **R04** (much larger than usual), **R09** (three payments
   to the same payee in 24 hours) and **R18** (over the daily amount), reaching
   **MEDIUM** and forcing approval — even though each payment on its own is
   under the €500 checking amount.
3. Load the scenario again and step through the first two payments manually
   if you want to see them both send without any friction.

---

## Manual test script: live sync between two tabs

Cross-tab sync cannot be covered honestly by `vitest`, so here is the manual
script. (There is no Playwright suite in this build — see NOTES.md.)

1. Open http://localhost:3100 in **Tab A** and enter as **Margaret**.
2. Open http://localhost:3100 in **Tab B** and enter as **David**. Leave Tab B
   on his dashboard and keep it visible next to Tab A.
3. In Tab A, run walkthrough 2 up to pressing **Ask David**.
4. Without touching Tab B, watch it:
   - the bell count in the header increases,
   - the request appears in *“Waiting for your decision”*,
   - the browser tab title becomes **“(1) SafeSend (demo)”**.
5. In Tab B, approve or reject. Tab A updates without a refresh.
6. In Tab B, open **Messages** — the notification inbox shows what the SMS,
   email and push notification would look like. **The SMS contains no link and
   never asks for a code**, and says so, on purpose.

### Verifying the privacy claim

Open DevTools → Network, tick *Disable cache*, and reload. After the initial
document, JS and CSS, there are **zero further requests**. The nginx config
ships a Content-Security-Policy of `default-src 'self'` with
`connect-src 'self'`, so this is enforced rather than merely asserted.

---

## Other things to try

- `/setup` — **Our agreement**: the consent artefact. What each person can and
  cannot do, and who is allowed to change what.
- `/m/helpers` — **Who helps me**. Margaret can lower the checking amount
  instantly, and can start *“Stop asking David”*. It takes 24 hours, both are
  told, and **only she can cancel it** — David has no veto.
- `/d/settings` — David can request a *higher* checking amount; it takes 24
  hours and Margaret can cancel it. Lowering is instant for either of them.
- `/audit` — every action by both people, with actor, timestamp, a monotonic
  sequence number and the state change. Both personas see the same list.
- `/demo` — reset, load any of the nine seeded scenarios, and advance the demo
  clock past a 30-minute hold, a 24-hour approval expiry or a 24-hour settings
  delay.
- Resize to **320px** and zoom to **400%**. Margaret's screens stay in one
  column, targets stay at least 48×48px, and the sticky demo banner never
  covers a focused element.

---

## Project layout

```
src/
  config.ts        currency, locale, thresholds, caps, feature flags
  copy.ts          every user-facing string
  clock.ts         the only module allowed to call Date.now() / new Date()
  format.ts        money, dates, relative times, amount-in-words
  risk/            assessRisk, rules, mitigators, scam patterns, 2 test suites
  state/           reducer, materialiseTime, persistence, migrations, broadcast
  data/            seed, keywords, high-risk countries, mock CoP, scenarios
  components/      Money, RiskPanel, ReasonDiff, TalkAboutIt, AftermathCard, …
  screens/         sender/ · approver/ · shared/
```

`NOTES.md` records the assumptions, the deviations from the brief and the
reasons for them, and everything that is deliberately not production-ready.
