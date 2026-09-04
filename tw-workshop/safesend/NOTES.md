# NOTES

Assumptions, deviations and limitations for the SafeSend prototype.

---

## Not production-ready — read this first

This is a design prototype. A real deployment would need, and does **not** have
here:

- A consent record with legal standing, and a mandate / power-of-attorney
  framework appropriate to the jurisdiction.
- Safeguarding escalation paths, and a route to a human being when the app
  detects a likely case of abuse or coercion.
- A GDPR data-minimisation review. The approver here sees a 90-day summary and
  the text of each request; whether that is proportionate is a question for a
  DPIA, not for a build brief.
- Regulatory sign-off, and integration with real payment rails, real
  Confirmation of Payee, and a real fraud-reporting route.
- The correct **national fraud reporting number** for its jurisdiction.
  `/m/report` is deliberately a placeholder and says so.

Additional honest limitations:

- **The persona switcher is the bypass.** On a single device, anyone who can
  open this app can become either party. The different PINs *perform* the
  separation between the two roles; they do not *provide* it. A real product
  needs two devices, two identities and real authentication.
- **The risk engine is uncalibrated against real fraud data.** The points in
  the rule table are a plausible-looking design artefact, not an empirical
  model. They are tuned against the brief's own calibration table and against
  intuition, which is exactly how you get an engine that looks convincing and
  is wrong.
- **The 24-hour delays are the central design bet of this product, and they are
  untested with real users.** The claim is that a live scammer will not wait a
  day, and that a controlling relative should never get a veto. Both halves are
  plausible; neither is validated here.
- **The second trusted-contact slot exists because a single approver is a
  genuine single point of failure.** A 24-hour expiry with one unavailable
  approver strands the sender. Jean Okafor is seeded but inactive; Margaret can
  activate her (24 hours, cancellable only by her).
- Scam-education content is defensive only: recognition and resistance. There
  are no scripts, templates or operational details anywhere.

---

## Risk engine calibration

The brief's rule table and its calibration table are not simultaneously
satisfiable as literally written. Applying only the listed additive rules,
€2,000 to a new tradesperson with an honest reason scores about **90** — a
CRITICAL scam warning on a roof repair — where the calibration table demands
**MEDIUM ≈ 45**. Any engine that behaves like the first version trains the
sender to click through warnings, which is worse than having no engine.

Rather than silently weakening individual rules, the scoring model separates
two kinds of evidence:

- **Circumstantial** (R01–R05, R08–R13, R17, R18) — what the payment *looks*
  like: new, large, abroad, round, over the daily amount.
- **Behavioural** (R06, R07, R14, R15, R16, R19) — what *happened around* it:
  scam vocabulary, the safety answers, a resubmission after a rejection.

```
score = clamp(0, 100,
          min(45, max(0, circumstantial + mitigation)) + behavioural)
```

Three additions, all in `src/config.ts` under `caps`:

| Addition | Value | Why |
| --- | --- | --- |
| Circumstantial cap | 45 | Circumstance alone can never reach HIGH. An unusual but honest payment gets an approval request, not a scam warning. Reaching HIGH requires a scam signal. |
| Mitigation cap | −25 | Mitigators soften a score; they must never erase one. Without this, familiarity cancels a velocity/limit pattern outright. |
| R04 baseline excludes the last 24 hours | — | If “your usual payments” absorbs today's outliers, an attacker re-baselines what counts as normal within a single day — and threshold splitting stops firing on the third payment, which is precisely the case the brief wants caught. |

Everything else follows the brief: Tier A 30 each capped at 40, Tier B 15 each
capped at 25, the two combined capped at 55, and the mitigator gate closing
entirely on a Tier A keyword, a `no_match` name check, or a “keep it secret or
hurry” answer.

With this model the brief's calibration table passes exactly, including
**MEDIUM ≈ 45** for both the tradesperson and the holiday-deposit cases, LOW
score 0 for the electricity bill, and CRITICAL capped at 100 for the courier
scenario. `src/risk/falsePositives.test.ts` is that table as executable tests.

### Where the seeded scenarios differ from the brief's narrative

| Scenario | Brief says | This build | Why |
| --- | --- | --- | --- |
| 6, invoice redirect | HIGH | CRITICAL | With `no_match` on the name check, “they emailed me new bank details”, contacted-first = yes and no verification on a known number, the evidence is stronger than HIGH. Weakening the engine to hit a narrative label would be the wrong trade. |
| 7, threshold splitting | scores 5 / 20 / 40 | 0 / 0 / 25 | The exact numbers are not reproducible from the rule table — €480 already exceeds 3× the €85 median and the €340 largest, so R04 fires on the first payment too. The **bands** match: sends, sends, then MEDIUM with R04 + R09 + R18, which is what acceptance criterion 11 actually tests. |
| 3, tradesperson | ≈45 | 45 | Exact, via the circumstantial cap above. |

---

## Deviations from the brief

- **`screens/guardian/` is `screens/approver/`.** The brief drops the word
  “guardian” from code and copy, then names a directory after it. The rename is
  applied consistently; the file names inside are otherwise as specified.
- **`R02` fires literally** (payee added less than 7 days ago), including for a
  payee created by the transfer itself, where it double-counts with R01. The
  circumstantial cap absorbs the overlap, so it was left faithful to the table
  rather than special-cased.
- **`INFO_REQUESTED` does not expire.** The state machine gives a 24-hour
  expiry to `PENDING_APPROVAL` only. A request waiting on the *sender* is not
  the approver failing to answer, so it is left open rather than invented.
- **Mitigators are subtracted from the circumstantial subtotal**, not from the
  final score. All four are familiarity- or pattern-based, i.e. circumstantial
  counter-evidence. The floor at 0 means this is only visible in edge cases.
- **No Playwright suite.** The brief allows either Playwright or an explicit
  manual script for cross-tab sync; this build takes the second option, and
  `README.md` carries the manual script. Cross-tab sync is therefore the least
  covered feature here, and is called out as such rather than left implicitly
  “tested”.
- **`copy.ts` holds the user-facing strings that matter** — all sender copy,
  band labels, categories, scam explainers, the agreement, the aftermath card,
  errors. A handful of structural labels on the approver's own screens (table
  headers, button captions on `/d/settings`) are still inline. They are
  reviewable in place and are not the copy that needs a reading-level pass.
- **The demo clock is frozen at `2026-09-03T10:42+02:00`** and advanced only
  from `/demo`. Nothing runs on a wall clock, so seeded relative dates and
  screenshots stay stable.

---

## Assumptions

- Locale `en-GB`, currency EUR, time zone `Europe/Amsterdam`, account country
  `NL`. All in `src/config.ts`.
- Approval threshold €500, daily limit €1,000, “always check new payees” on,
  “always check cross-border” on, “block CRITICAL outright” off.
- The high-risk country list is fictional (`XA`, `XB`, `XC`). It exists to
  exercise R12 and is not a statement about any real country.
- Unknown IBANs return `unavailable` from the mock Confirmation-of-Payee
  directory, never `match`. Absence of evidence is not evidence of safety.
- The daily limit **forces approval and never hard-blocks**. A hard block causes
  displacement: the sender simply opens their real banking app, outside the
  protective layer. `blockCriticalOutright` is the one exception, is off by
  default, and always offers a route forward.
- Nine seeded 90-day payments: €18.40–€340.00, median €85.00, largest €340.00.
  `timesPaid` on a payee is a lifetime counter and is deliberately larger than
  the 90-day list.
- All fictional: bank “Northgate Bank (demo)”, IBANs beginning `NL00DEMO…`,
  emails `@example.com`, phone `+31 6 0000 0000`, domain `safesend.example`
  (RFC 2606 / 6761 reserved).

---

## Design decisions worth flagging

- **The numeric score never appears on the sender's screens.** She sees the
  band label, an icon and the plain-language reasons. “Score 100/100” is
  meaningless to her and reads as a judgement of *her*, not of the payment.
  There is an assertion for this in `src/a11y.test.tsx`.
- **The reason text is not scored while it is typed.** Live scoring reads as
  surveillance and teaches keyword-avoidance — exactly what a coaching scammer
  wants. The assessment is computed and revealed at step 5 only.
- **The mock SMS contains no link and never asks for a code**, and the UI says
  why. Teaching people to tap links in bank texts is the behaviour smishing
  exploits.
- **Reference codes use Crockford base32 without 0/O/1/I/L**, because David
  reads them to Margaret over the phone.
- **The approver has no veto over his own removal, anywhere in the reducer.**
  The majority of financial abuse of older adults is committed by family
  members; a veto would turn a consent-based safety layer into a cage. There is
  a test for the absence of this.
- **There is no “send anyway” or “skip the safety check” control**, because it
  would be the single most exploitable thing in the design.
- **Protection strengthens instantly and weakens only after 24 hours**, with
  both parties notified and an audit entry, in every direction.

---

## Extra packages

Beyond the stack named in the brief (React 18, TypeScript, Vite, Tailwind,
react-router-dom, vitest, @testing-library/react, jest-axe):

- `@testing-library/user-event` and `@testing-library/jest-dom` — used by the
  wizard tests.
- `@types/jest-axe` — types only.
- `jsdom` — the vitest DOM environment.

No icon library: the icons are inline text and SVG. No component library.
No analytics. No backend. No auth library.

---

## Accessibility notes

- Risk warnings announce with `aria-live="polite"`, only on a **band change**,
  debounced 500 ms, with focus moved to the panel heading on reveal. Assertive
  would interrupt a screen-reader user mid-sentence.
- The threshold control is a slider **plus** a numeric input **plus** ± steppers
  (SC 2.5.7 Dragging Movements).
- Reflow target is **320 CSS px** (SC 1.4.10); tested at 400% zoom.
- The sticky demo banner is the obvious SC 2.4.11 hazard, so every focusable
  element carries a `scroll-margin-top` clear of it.
- Payee details are never re-asked across wizard steps (SC 3.3.7).
- The PIN field allows paste and autofill (SC 3.3.8). No puzzles, no memory
  tests.
- No session timeout anywhere. Back never loses data.
- Every risk band carries an icon and a text label, never colour alone.
- `prefers-reduced-motion: reduce` removes all non-essential motion, including
  the hold countdown.

`jest-axe` runs over all 14 routes in `src/a11y.test.tsx`. Automated checks
catch perhaps a third of real accessibility problems; a manual keyboard and
screen-reader pass is still required before anyone calls this AA.
