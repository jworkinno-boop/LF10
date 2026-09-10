import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { SenderRiskPanel } from '../../components/RiskPanel';
import { ScamExplainerList } from '../../components/ScamExplainer';
import { ReasonDiff } from '../../components/ReasonDiff';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Money } from '../../components/Money';
import { COPY } from '../../copy';
import { CONFIG } from '../../config';
import { iso, now } from '../../clock';
import { amountInWords, formatIban, formatMoney, parseAmountToCents } from '../../format';
import { assessRisk } from '../../risk/assessRisk';
import { useApp } from '../../state/AppStateProvider';
import { emptyDraft, draftIsComplete, safetyQuestionsRequired } from '../../state/reducer';
import { materialisePayee, countryFromIban } from '../../state/payees';
import { activeContact, riskContextFor, savedPayees, transferById } from '../../state/selectors';
import { copLabel } from '../../data/mockCopDirectory';
import { SELECTABLE_COUNTRIES, COUNTRY_NAMES } from '../../data/highRiskCountries';
import type { Payee, RiskBand, TransferDraft } from '../../types';

// Three steps: who · how much and why · safety questions. Amount and reason
// were two screens and are one thought ("€4,500 for the boiler"), so they share
// a step. The safety questions keep a screen to themselves — they carry the most
// weight in the risk engine and deserve undivided attention.
const ALL_STEPS: number[] = [1, 2, 3];
// Trusted payees are not asked the safety questions, so the wizard is one step
// shorter and the numbering follows.
const TRUSTED_STEPS: number[] = [1, 2];
// Not a numbered step: it is what "Check this payment" leads to. A draft
// persisted by the old five-step build can carry step 5, which lands here too.
const REVIEW_STEP = 4;

export function SendWizard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const draft = state.draft ?? emptyDraft();
  const step = draft.step;
  const reviewing = step >= REVIEW_STEP;

  useEffect(() => {
    if (!state.draft) dispatch({ type: 'DRAFT_START' });
  }, [state.draft, dispatch]);

  // Wizard focus management: focus the step heading, which names the step.
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  // After submission, go to the status page for the new payment.
  useEffect(() => {
    if (!submitting || state.draft) return;
    const latest = [...state.transfers].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    if (latest) navigate(`/m/transfer/${latest.id}`);
    setSubmitting(false);
  }, [submitting, state.draft, state.transfers, navigate]);

  const patch = (changes: Partial<TransferDraft>) =>
    dispatch({ type: 'DRAFT_PATCH', patch: changes });

  const goTo = (next: TransferDraft['step']) => patch({ step: next });

  const payee = useMemo(() => {
    if (draft.payeeId) return state.payees.find((p) => p.id === draft.payeeId) ?? null;
    if (draft.newPayee?.iban && draft.newPayee.displayName) {
      return materialisePayee({
        displayName: draft.newPayee.displayName,
        iban: draft.newPayee.iban,
        countryCode: draft.newPayee.countryCode,
        addedAt: iso(now()),
      });
    }
    return null;
  }, [draft.payeeId, draft.newPayee, state.payees]);

  // Assessment is computed and revealed on the result screen only — live
  // scoring reads as surveillance and teaches keyword avoidance.
  const assessment = useMemo(() => {
    if (!reviewing || !payee) return null;
    if (!draftIsComplete(draft, { requireSafetyAnswers: safetyQuestionsRequired(payee) }))
      return null;
    return assessRisk(
      {
        amountCents: draft.amountCents!,
        reasonCategory: draft.reasonCategory ?? 'other',
        reasonText: draft.reasonText,
        safetyAnswers: draft.safetyAnswers,
        payee,
        createdAtMs: now(),
      },
      riskContextFor(state, now()),
    );
  }, [reviewing, payee, draft, state]);

  const priorTransfer = draft.supersedesTransferId
    ? transferById(state, draft.supersedesTransferId)
    : undefined;

  const balance = state.accounts.margaret.balanceCents ?? 0;
  const contact = activeContact(state);

  const safetySkipped = !safetyQuestionsRequired(payee);
  const steps = safetySkipped ? TRUSTED_STEPS : ALL_STEPS;
  const stepLabel = (n: number) =>
    COPY.wizard.stepOf(Math.max(1, steps.indexOf(n) + 1), steps.length);
  const position = reviewing ? steps.length : Math.max(1, steps.indexOf(step) + 1);
  const lastStep = steps[steps.length - 1] as TransferDraft['step'];

  // Picking a trusted payee after reaching the questions moves past them.
  useEffect(() => {
    if (safetySkipped && step === 3) goTo(REVIEW_STEP);
  }, [safetySkipped, step]);

  const alarming = assessment?.band === 'HIGH' || assessment?.band === 'CRITICAL';

  function stopAndGoHome() {
    dispatch({ type: 'DRAFT_DISCARD' });
    navigate('/m');
  }

  return (
    <AppShell persona="margaret" title={COPY.sender.sendMoney}>
      <div className="mx-auto w-full max-w-2xl space-y-6 lg:max-w-3xl">
        {/* On every step: where she is, whose payment it is, and one way out
            that always confirms first. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="eyebrow">
            {reviewing ? COPY.wizard.steps.review.title : stepLabel(step)}
            {payee ? ` · ${payee.displayName}` : ''}
          </p>
          <button type="button" className="btn-secondary" onClick={() => setStopping(true)}>
            {COPY.wizard.stop}
          </button>
        </div>
        <div
          className="h-[14px] w-full overflow-hidden rounded-full bg-rule"
          role="progressbar"
          aria-valuenow={position}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label="Progress through sending money"
        >
          <div className="h-full bg-ok" style={{ width: `${(position / steps.length) * 100}%` }} />
        </div>

        {step === 1 ? (
          <StepPayee
            draft={draft}
            heading={heading}
            patch={patch}
            onNext={() => goTo(2)}
          />
        ) : null}
        {step === 2 ? (
          <StepAmountAndReason
            draft={draft}
            balance={balance}
            heading={heading}
            patch={patch}
            onBack={() => goTo(1)}
            onNext={() => goTo(safetySkipped ? REVIEW_STEP : 3)}
          />
        ) : null}
        {step === 3 && !safetySkipped ? (
          <StepSafety
            draft={draft}
            heading={heading}
            patch={patch}
            onBack={() => goTo(2)}
            onNext={() => goTo(REVIEW_STEP)}
          />
        ) : null}

        {reviewing ? (
          <section className="space-y-5">
            {alarming ? (
              /* The verdict carries by type, position and the ink disc: no red
                 page wash, no numeric score, and no "send anyway" anywhere. */
              <div>
                <span
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-ink
                             text-3xl font-bold text-paper"
                  aria-hidden="true"
                >
                  !
                </span>
                <p className="eyebrow mt-3">{COPY.wizard.steps.review.stoppedEyebrow}</p>
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="mt-2 font-display text-[clamp(2rem,6vw,2.875rem)] leading-[1.05]"
                >
                  {COPY.risk.bandLabel[assessment!.band]}, {COPY.people.sender.first}.
                </h2>
                <p className="mt-3 max-w-[62ch]">
                  {COPY.wizard.steps.review.nothingMoved(
                    formatMoney(draft.amountCents ?? 0),
                    payee?.displayName ?? '',
                  )}
                </p>
              </div>
            ) : (
              <>
                <h2 ref={heading} tabIndex={-1} className="text-3xl">
                  {COPY.wizard.steps.review.title}
                </h2>
                <ReviewSummary
                  draft={draft}
                  payee={payee}
                  safetySkipped={safetySkipped}
                />
              </>
            )}

            {priorTransfer ? (
              <div className="card space-y-3">
                <h3 className="text-xl">You are sending this again</h3>
                <p>
                  {COPY.people.approver.first} stopped an earlier payment to{' '}
                  {priorTransfer.payee.displayName}. He will see both versions of your reason.
                </p>
                <ReasonDiff before={priorTransfer.reasonText} after={draft.reasonText} />
              </div>
            ) : null}

            {assessment ? (
              <>
                <SenderRiskPanel assessment={assessment} autoFocus={!alarming} />
                {alarming ? (
                  <>
                    <ScamExplainerList patterns={assessment.matchedScamPatterns} />
                    {/* Ink, not green: green here would read as approval of the
                        payment. And the phone call comes before the app does. */}
                    <div className="rounded-card border border-attend-border bg-attend-bg p-5">
                      <h3 className="text-2xl">{COPY.wizard.steps.review.doThisFirst}</h3>
                      <p className="mt-2 max-w-[62ch]">{COPY.wizard.steps.review.hangUp}</p>
                      {contact ? (
                        <p className="mt-2 font-semibold">{contact.phone}</p>
                      ) : null}
                      <div className="mt-4 flex flex-col gap-4">
                        {contact ? (
                          <a
                            href={`tel:${contact.phone.replace(/\s/g, '')}`}
                            className="btn-neutral w-full !min-h-[80px] !text-2xl"
                          >
                            {COPY.wizard.steps.review.ringNow}
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setSubmitting(true);
                            dispatch({ type: 'SUBMIT_TRANSFER', nowMs: now() });
                          }}
                        >
                          {state.settings.blockCriticalOutright &&
                          assessment.band === 'CRITICAL'
                            ? COPY.wizard.steps.review.blocked
                            : COPY.wizard.steps.review.askInApp}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <button type="button" className="btn-secondary" onClick={() => goTo(lastStep)}>
                        {COPY.wizard.back}
                      </button>
                      <button type="button" className="link" onClick={stopAndGoHome}>
                        {COPY.wizard.steps.review.stopAndGoHome}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="card space-y-4">
                    <p className="text-xl font-semibold">
                      {outcomeLabel(
                        assessment.requiresApproval,
                        assessment.coolingOffMinutes,
                        assessment.band === 'CRITICAL' && state.settings.blockCriticalOutright,
                        assessment.band,
                      )}
                    </p>
                    <button
                      type="button"
                      className="btn-huge"
                      onClick={() => {
                        setSubmitting(true);
                        dispatch({ type: 'SUBMIT_TRANSFER', nowMs: now() });
                      }}
                    >
                      {assessment.requiresApproval
                        ? assessment.coolingOffMinutes > 0
                          ? COPY.wizard.steps.review.askApproverHold
                          : COPY.wizard.steps.review.askApprover
                        : COPY.wizard.steps.review.sendNow}
                    </button>
                    <div className="flex flex-wrap gap-4">
                      <button type="button" className="btn-secondary" onClick={() => goTo(lastStep)}>
                        {COPY.wizard.back}
                      </button>
                      <button type="button" className="btn-secondary" onClick={stopAndGoHome}>
                        {COPY.wizard.steps.review.stopAndGoHome}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p role="alert" className="font-semibold text-danger">
                Something is missing. Please go back and check each step.
              </p>
            )}
          </section>
        ) : null}
      </div>

      <ConfirmDialog
        open={stopping}
        title={COPY.wizard.stopConfirm.title}
        confirmLabel={COPY.wizard.stopConfirm.confirm}
        destructive
        onCancel={() => setStopping(false)}
        onConfirm={() => {
          setStopping(false);
          stopAndGoHome();
        }}
      >
        <p>{COPY.wizard.stopConfirm.body}</p>
      </ConfirmDialog>
    </AppShell>
  );
}

function yesNo(value: boolean | null): string {
  if (value === null) return 'not answered';
  return value ? 'Yes' : 'No';
}

function outcomeLabel(
  requiresApproval: boolean,
  hold: number,
  blocked: boolean,
  band: RiskBand,
): string {
  if (blocked) return COPY.wizard.steps.review.blocked;
  // A second look is not an approval request: Margaret is told what stood out
  // and then sends it herself.
  if (!requiresApproval)
    return band === 'LOW'
      ? 'This can be sent straight away.'
      : `Something stood out, so have a read above. ${COPY.people.approver.first} is not being asked — this one is yours to send.`;
  if (hold > 0)
    return `${COPY.people.approver.first} will check this. If he approves, it waits ${hold} minutes before it goes, so you can still change your mind.`;
  return `${COPY.people.approver.first} will check this before it is sent.`;
}

// --- The review summary ------------------------------------------------------

function ReviewSummary({
  draft,
  payee,
  safetySkipped,
}: {
  draft: TransferDraft;
  payee: Payee | null;
  safetySkipped: boolean;
}) {
  return (
    <dl className="card space-y-3">
      <div>
        <dt className="font-semibold">You are paying</dt>
        <dd className="text-xl">
          {payee?.displayName ?? '—'}
          {payee ? (
            <span className="block text-base text-ink-2">
              {formatIban(payee.iban)} ·{' '}
              {COUNTRY_NAMES[payee.countryCode] ?? payee.countryCode}
            </span>
          ) : null}
          {payee?.copResult ? (
            <span className="mt-1 block text-base text-ink-2">
              Name check: {copLabel(payee.copResult)}
              {payee.copNameOnAccount ? ` (${payee.copNameOnAccount})` : ''}
            </span>
          ) : null}
        </dd>
      </div>
      <div>
        <dt className="font-semibold">Amount</dt>
        <dd className="text-2xl font-bold">
          <Money cents={draft.amountCents ?? 0} />
        </dd>
      </div>
      <div>
        <dt className="font-semibold">Your reason, in your words</dt>
        <dd>{draft.reasonText.trim() ? `“${draft.reasonText.trim()}”` : '—'}</dd>
      </div>
      <div>
        <dt className="font-semibold">Safety questions</dt>
        {safetySkipped ? (
          <dd>{COPY.wizard.steps[3].skippedTrusted}</dd>
        ) : (
          <dd>
            <ul className="mt-1 space-y-1">
              <li>
                {COPY.wizard.steps[3].q1} <b>{yesNo(draft.safetyAnswers.contactedFirst)}</b>
              </li>
              <li>
                {COPY.wizard.steps[3].q2}{' '}
                <b>{yesNo(draft.safetyAnswers.askedToKeepSecretOrHurry)}</b>
              </li>
              <li>
                {COPY.wizard.steps[3].q3}{' '}
                <b>{yesNo(draft.safetyAnswers.verifiedOnKnownNumber)}</b>
              </li>
            </ul>
          </dd>
        )}
      </div>
    </dl>
  );
}

// --- Step 1 ------------------------------------------------------------------

/** Initials, for the avatar disc. Two at most, so it stays legible at 52px. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** What she recognises, not what the bank needs: never the IBAN here. */
function payeeMeta(payee: Payee): string {
  const parts = [payee.plainLabel];
  if (payee.timesPaid > 0) parts.push(COPY.wizard.steps[1].paidTimes(payee.timesPaid));
  else parts.push(COPY.wizard.steps[1].neverPaid);
  return parts.filter(Boolean).join(' · ');
}

function StepPayee({
  draft,
  heading,
  patch,
  onNext,
}: {
  draft: TransferDraft;
  heading: React.RefObject<HTMLHeadingElement>;
  patch: (changes: Partial<TransferDraft>) => void;
  onNext: () => void;
}) {
  const { state } = useApp();
  const [mode, setMode] = useState<'saved' | 'new'>(draft.newPayee ? 'new' : 'saved');
  const [error, setError] = useState('');
  const payees = savedPayees(state);

  function next() {
    if (mode === 'saved' && !draft.payeeId) {
      setError('Please choose who you are paying.');
      return;
    }
    if (mode === 'new') {
      const p = draft.newPayee;
      if (!p?.displayName?.trim() || !p?.iban?.trim()) {
        setError('Please fill in their name and account number.');
        return;
      }
    }
    setError('');
    onNext();
  }

  return (
    <section className="space-y-5">
      <h2 ref={heading} tabIndex={-1} className="text-3xl">
        {COPY.wizard.steps[1].title}
      </h2>

      <fieldset className="space-y-3">
        <legend className="sr-only">Choose who you are paying</legend>
        {payees.map((p) => {
          const selected = mode === 'saved' && draft.payeeId === p.id;
          return (
            <label key={p.id} className={selected ? 'option-card-sel' : 'option-card'}>
              <input
                type="radio"
                name="payee"
                className="sr-only"
                checked={selected}
                onChange={() => {
                  setMode('saved');
                  patch({ payeeId: p.id, newPayee: undefined });
                }}
              />
              <span
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full
                           bg-ok-bg text-xl font-semibold text-ok-ink"
                aria-hidden="true"
              >
                {initials(p.displayName)}
              </span>
              <span className="min-w-0">
                <span className="block text-[22px] font-semibold">{p.displayName}</span>
                <span className="block text-base text-ink-2">{payeeMeta(p)}</span>
              </span>
              {/* Never colour alone: the selected card also carries a tick. */}
              <span className="ml-auto text-2xl text-ok" aria-hidden="true">
                {selected ? '✓' : ''}
              </span>
            </label>
          );
        })}

        <label className={mode === 'new' ? 'option-card-sel' : 'option-card'}>
          <input
            type="radio"
            name="payee"
            className="sr-only"
            checked={mode === 'new'}
            onChange={() => {
              setMode('new');
              patch({
                payeeId: undefined,
                newPayee: draft.newPayee ?? {
                  displayName: '',
                  iban: '',
                  countryCode: 'NL',
                  save: false,
                },
              });
            }}
          />
          <span
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full
                       bg-ok-bg text-2xl font-semibold text-ok-ink"
            aria-hidden="true"
          >
            +
          </span>
          <span className="min-w-0">
            <span className="block text-[22px] font-semibold">
              {COPY.wizard.steps[1].newPayee}
            </span>
            <span className="block text-base text-ink-2">
              {COPY.wizard.steps[1].newPayeeNote}
            </span>
          </span>
          <span className="ml-auto text-2xl text-ok" aria-hidden="true">
            {mode === 'new' ? '✓' : ''}
          </span>
        </label>
      </fieldset>

      {mode === 'new' ? (
        <div className="card space-y-4">
          <div>
            <label htmlFor="payee-name" className="block font-semibold">
              {COPY.wizard.steps[1].nameLabel}
            </label>
            <input
              id="payee-name"
              className="field mt-1"
              autoComplete="name"
              value={draft.newPayee?.displayName ?? ''}
              onChange={(e) =>
                patch({
                  newPayee: {
                    displayName: e.target.value,
                    iban: draft.newPayee?.iban ?? '',
                    countryCode: draft.newPayee?.countryCode ?? 'NL',
                    save: draft.newPayee?.save ?? false,
                  },
                })
              }
            />
          </div>
          <div>
            <label htmlFor="payee-iban" className="block font-semibold">
              {COPY.wizard.steps[1].ibanLabel}
            </label>
            <input
              id="payee-iban"
              className="field mt-1 font-mono"
              value={draft.newPayee?.iban ?? ''}
              onChange={(e) => {
                const iban = e.target.value;
                patch({
                  newPayee: {
                    displayName: draft.newPayee?.displayName ?? '',
                    iban,
                    countryCode: countryFromIban(iban, draft.newPayee?.countryCode ?? 'NL'),
                    save: draft.newPayee?.save ?? false,
                  },
                });
              }}
            />
          </div>
          <div>
            <label htmlFor="payee-country" className="block font-semibold">
              {COPY.wizard.steps[1].countryLabel}
            </label>
            <select
              id="payee-country"
              className="field mt-1"
              value={draft.newPayee?.countryCode ?? 'NL'}
              onChange={(e) =>
                patch({
                  newPayee: {
                    displayName: draft.newPayee?.displayName ?? '',
                    iban: draft.newPayee?.iban ?? '',
                    countryCode: e.target.value,
                    save: draft.newPayee?.save ?? false,
                  },
                })
              }
            >
              {SELECTABLE_COUNTRIES.map((code) => (
                <option key={code} value={code}>
                  {COUNTRY_NAMES[code] ?? code}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={draft.newPayee?.save ?? false}
              onChange={(e) =>
                patch({
                  newPayee: {
                    displayName: draft.newPayee?.displayName ?? '',
                    iban: draft.newPayee?.iban ?? '',
                    countryCode: draft.newPayee?.countryCode ?? 'NL',
                    save: e.target.checked,
                  },
                })
              }
            />
            <span>{COPY.wizard.steps[1].saveLabel}</span>
          </label>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <button type="button" className="btn-primary w-full" onClick={next}>
        {COPY.wizard.next}
      </button>
    </section>
  );
}

// --- Step 2 ------------------------------------------------------------------

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

function StepAmountAndReason({
  draft,
  balance,
  heading,
  patch,
  onBack,
  onNext,
}: {
  draft: TransferDraft;
  balance: number;
  heading: React.RefObject<HTMLHeadingElement>;
  patch: (changes: Partial<TransferDraft>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [text, setText] = useState(
    draft.amountCents ? (draft.amountCents / 100).toFixed(2) : '',
  );
  const [error, setError] = useState('');
  const cents = parseAmountToCents(text);
  const words = draft.reasonText.trim().length;

  function commit(nextText: string) {
    setText(nextText);
    setError('');
    patch({ amountCents: parseAmountToCents(nextText) });
  }

  function next() {
    if (!cents || cents <= 0) {
      setError(COPY.wizard.steps[2].tooSmall);
      return;
    }
    if (cents > balance) {
      setError(COPY.wizard.steps[2].tooMuch);
      return;
    }
    // The words are the reason now — the ten category chips are gone, and the
    // category is worked out from what she writes.
    if (words < CONFIG.minReasonChars) {
      setError(COPY.wizard.steps[2].textHelp);
      return;
    }
    patch({ amountCents: cents });
    setError('');
    onNext();
  }

  return (
    <section className="space-y-5">
      <h2 ref={heading} tabIndex={-1} className="text-3xl">
        {COPY.wizard.steps[2].title}
      </h2>

      <div className="card space-y-4">
        <div>
          <label htmlFor="amount" className="block font-semibold">
            {COPY.wizard.steps[2].amountLabel}
          </label>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-4xl font-medium" aria-hidden="true">
              €
            </span>
            {/* A typable field as well as the keypad: keypad-only is a keyboard trap. */}
            <input
              id="amount"
              className="field field-amount"
              inputMode="decimal"
              autoComplete="off"
              value={text}
              onChange={(e) => commit(e.target.value)}
              aria-describedby="amount-words amount-remaining"
              aria-invalid={error ? true : undefined}
            />
          </div>
          <p id="amount-words" className="mt-2 text-lg">
            {cents ? amountInWords(cents) : 'Type an amount, or use the buttons below.'}
          </p>
          <p id="amount-remaining" className="mt-1 text-ink-2">
            {COPY.wizard.steps[2].remaining}:{' '}
            <Money cents={Math.max(0, balance - (cents ?? 0))} />
          </p>
        </div>

        {/* Kept for touch. It is off the desktop mockup only because the mockup
            is desktop. */}
        <div
          className="grid grid-cols-3 gap-3"
          role="group"
          aria-label={COPY.wizard.steps[2].keypadLabel}
        >
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="btn-secondary text-2xl"
              onClick={() => commit(key === '⌫' ? text.slice(0, -1) : `${text}${key}`)}
            >
              <span aria-hidden={key === '⌫' ? 'true' : undefined}>{key}</span>
              {key === '⌫' ? <span className="sr-only">Delete last digit</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <label htmlFor="reason" className="block font-semibold">
          {COPY.wizard.steps[2].reasonLabel}
        </label>
        <p className="mt-1 text-base text-ink-2">{COPY.wizard.steps[2].reasonSubLabel}</p>
        <textarea
          id="reason"
          className="field mt-3 min-h-[130px]"
          value={draft.reasonText}
          onChange={(e) => patch({ reasonText: e.target.value })}
          aria-describedby="reason-help"
          aria-invalid={error === COPY.wizard.steps[2].textHelp ? true : undefined}
        />
        <p id="reason-help" className="mt-1 text-ink-2">
          {COPY.wizard.steps[2].textHelp}{' '}
          {words > 0 && words < CONFIG.vagueReasonChars
            ? COPY.wizard.steps[2].vagueHint
            : null}
        </p>
      </div>

      {error ? (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row">
        <button type="button" className="btn-secondary" onClick={onBack}>
          {COPY.wizard.back}
        </button>
        <button type="button" className="btn-primary flex-1" onClick={next}>
          {COPY.wizard.next}
        </button>
      </div>
    </section>
  );
}

// --- Step 3 ------------------------------------------------------------------

const QUESTIONS = [
  { key: 'contactedFirst', text: COPY.wizard.steps[3].q1 },
  { key: 'askedToKeepSecretOrHurry', text: COPY.wizard.steps[3].q2 },
  { key: 'verifiedOnKnownNumber', text: COPY.wizard.steps[3].q3 },
] as const;

function StepSafety({
  draft,
  heading,
  patch,
  onBack,
  onNext,
}: {
  draft: TransferDraft;
  heading: React.RefObject<HTMLHeadingElement>;
  patch: (changes: Partial<TransferDraft>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [error, setError] = useState('');

  function set(key: (typeof QUESTIONS)[number]['key'], value: boolean) {
    patch({ safetyAnswers: { ...draft.safetyAnswers, [key]: value } });
    setError('');
  }

  function next() {
    const answers = draft.safetyAnswers;
    if (
      answers.contactedFirst === null ||
      answers.askedToKeepSecretOrHurry === null ||
      answers.verifiedOnKnownNumber === null
    ) {
      setError('Please answer all three questions.');
      return;
    }
    onNext();
  }

  return (
    <section className="space-y-5">
      <h2 ref={heading} tabIndex={-1} className="text-3xl">
        {COPY.wizard.steps[3].title}
      </h2>
      <p>{COPY.wizard.steps[3].intro}</p>

      {QUESTIONS.map((question) => (
        <fieldset key={question.key} className="card">
          <legend className="text-[21px] font-semibold">{question.text}</legend>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {[true, false].map((value) => {
              const selected = draft.safetyAnswers[question.key] === value;
              return (
                <label
                  key={String(value)}
                  className={`flex min-h-[68px] cursor-pointer items-center justify-center gap-2
                              rounded-ctl border-2 text-xl transition-colors ${
                                selected
                                  ? 'border-ok font-semibold ring-[3px] ring-ok-border'
                                  : 'border-rule-2 bg-surface hover:bg-paper'
                              }`}
                >
                  <input
                    type="radio"
                    name={question.key}
                    className="sr-only"
                    checked={selected}
                    onChange={() => set(question.key, value)}
                  />
                  {/* Never colour alone: selected is semibold and ticked. */}
                  <span aria-hidden="true" className={selected ? 'text-ok' : 'invisible'}>
                    ✓
                  </span>
                  {value ? COPY.wizard.steps[3].yes : COPY.wizard.steps[3].no}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {error ? (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row">
        <button type="button" className="btn-secondary" onClick={onBack}>
          {COPY.wizard.back}
        </button>
        <button type="button" className="btn-primary flex-1" onClick={next}>
          {COPY.wizard.steps[3].check}
        </button>
      </div>
    </section>
  );
}
