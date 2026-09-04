import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { SenderRiskPanel } from '../../components/RiskPanel';
import { ScamExplainerList } from '../../components/ScamExplainer';
import { ReasonDiff } from '../../components/ReasonDiff';
import { Money } from '../../components/Money';
import { COPY } from '../../copy';
import { CONFIG } from '../../config';
import { iso, now } from '../../clock';
import { amountInWords, formatIban, parseAmountToCents } from '../../format';
import { assessRisk } from '../../risk/assessRisk';
import { useApp } from '../../state/AppStateProvider';
import { emptyDraft, draftIsComplete } from '../../state/reducer';
import { materialisePayee, countryFromIban } from '../../state/payees';
import { riskContextFor, savedPayees, transferById } from '../../state/selectors';
import { copLabel } from '../../data/mockCopDirectory';
import { SELECTABLE_COUNTRIES, COUNTRY_NAMES } from '../../data/highRiskCountries';
import type { ReasonCategory, TransferDraft } from '../../types';

const TOTAL_STEPS = 5;
const CATEGORIES = Object.keys(COPY.categories) as ReasonCategory[];

export function SendWizard() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);

  const draft = state.draft ?? emptyDraft();
  const step = draft.step;

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

  // Assessment is computed and revealed at step 5 only — live scoring reads as
  // surveillance and teaches keyword avoidance.
  const assessment = useMemo(() => {
    if (step !== 5 || !payee || !draftIsComplete(draft)) return null;
    return assessRisk(
      {
        amountCents: draft.amountCents!,
        reasonCategory: draft.reasonCategory!,
        reasonText: draft.reasonText,
        safetyAnswers: draft.safetyAnswers,
        payee,
        createdAtMs: now(),
      },
      riskContextFor(state, now()),
    );
  }, [step, payee, draft, state]);

  const priorTransfer = draft.supersedesTransferId
    ? transferById(state, draft.supersedesTransferId)
    : undefined;

  const balance = state.accounts.margaret.balanceCents ?? 0;

  return (
    <AppShell persona="margaret" title={COPY.sender.sendMoney}>
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="font-semibold text-slate-700">
          {COPY.wizard.stepOf(step, TOTAL_STEPS)}
        </p>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-slate-300"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-label="Progress through sending money"
        >
          <div
            className="h-full bg-blue-800"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {step === 1 ? (
          <StepPayee draft={draft} heading={heading} patch={patch} onNext={() => goTo(2)} />
        ) : null}
        {step === 2 ? (
          <StepAmount
            draft={draft}
            balance={balance}
            heading={heading}
            patch={patch}
            onBack={() => goTo(1)}
            onNext={() => goTo(3)}
          />
        ) : null}
        {step === 3 ? (
          <StepReason
            draft={draft}
            heading={heading}
            patch={patch}
            onBack={() => goTo(2)}
            onNext={() => goTo(4)}
          />
        ) : null}
        {step === 4 ? (
          <StepSafety
            draft={draft}
            heading={heading}
            patch={patch}
            onBack={() => goTo(3)}
            onNext={() => {
              setShowAssessment(false);
              goTo(5);
            }}
          />
        ) : null}
        {step === 5 ? (
          <section className="space-y-5">
            <h2 ref={heading} tabIndex={-1} className="text-3xl">
              {COPY.wizard.steps[5].title} — {COPY.wizard.stepOf(5, TOTAL_STEPS)}
            </h2>

            <dl className="card space-y-3">
              <div>
                <dt className="font-semibold">You are paying</dt>
                <dd className="text-xl">
                  {payee?.displayName ?? '—'}
                  {payee ? (
                    <span className="block text-base text-slate-700">
                      {formatIban(payee.iban)} · {COUNTRY_NAMES[payee.countryCode] ?? payee.countryCode}
                    </span>
                  ) : null}
                  {payee?.copResult ? (
                    <span className="mt-1 block text-base text-slate-700">
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
                <dt className="font-semibold">Your reason</dt>
                <dd>
                  {draft.reasonCategory ? COPY.categories[draft.reasonCategory] : '—'} —{' '}
                  “{draft.reasonText}”
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Safety questions</dt>
                <dd>
                  <ul className="mt-1 space-y-1">
                    <li>
                      {COPY.wizard.steps[4].q1} <b>{yesNo(draft.safetyAnswers.contactedFirst)}</b>
                    </li>
                    <li>
                      {COPY.wizard.steps[4].q2}{' '}
                      <b>{yesNo(draft.safetyAnswers.askedToKeepSecretOrHurry)}</b>
                    </li>
                    <li>
                      {COPY.wizard.steps[4].q3}{' '}
                      <b>{yesNo(draft.safetyAnswers.verifiedOnKnownNumber)}</b>
                    </li>
                  </ul>
                </dd>
              </div>
            </dl>

            {priorTransfer ? (
              <div className="card space-y-3">
                <h3 className="text-xl">You are sending this again</h3>
                <p>
                  David stopped an earlier payment to {priorTransfer.payee.displayName}. He will see
                  both versions of your reason.
                </p>
                <ReasonDiff before={priorTransfer.reasonText} after={draft.reasonText} />
              </div>
            ) : null}

            {!showAssessment ? (
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => setShowAssessment(true)}
                disabled={!draftIsComplete(draft)}
              >
                Check this payment
              </button>
            ) : null}

            {showAssessment && assessment ? (
              <>
                <SenderRiskPanel assessment={assessment} />
                {assessment.band === 'HIGH' || assessment.band === 'CRITICAL' ? (
                  <>
                    <ScamExplainerList patterns={assessment.matchedScamPatterns} />
                    <div className="card">
                      <p className="text-lg font-semibold">
                        Before you go on, ring {COPY.people.approver.first} on a number you already
                        have and talk it through.
                      </p>
                    </div>
                  </>
                ) : null}

                <div className="card space-y-4">
                  <p className="text-xl font-semibold">
                    {outcomeLabel(assessment.requiresApproval, assessment.coolingOffMinutes,
                      assessment.band === 'CRITICAL' && state.settings.blockCriticalOutright)}
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
                        ? COPY.wizard.steps[5].askApproverHold
                        : COPY.wizard.steps[5].askApprover
                      : COPY.wizard.steps[5].sendNow}
                  </button>
                  <div className="flex flex-wrap gap-4">
                    <button type="button" className="btn-secondary" onClick={() => goTo(4)}>
                      {COPY.wizard.back}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        dispatch({ type: 'DRAFT_DISCARD' });
                        navigate('/m');
                      }}
                    >
                      Stop and go home
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {showAssessment && !assessment ? (
              <p role="alert" className="font-semibold text-red-800">
                Something is missing. Please go back and check each step.
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function yesNo(value: boolean | null): string {
  if (value === null) return 'not answered';
  return value ? 'Yes' : 'No';
}

function outcomeLabel(requiresApproval: boolean, hold: number, blocked: boolean): string {
  if (blocked) return COPY.wizard.steps[5].blocked;
  if (!requiresApproval) return 'This can be sent straight away.';
  if (hold > 0)
    return `${COPY.people.approver.first} will check this. If he approves, it waits ${hold} minutes before it goes, so you can still change your mind.`;
  return `${COPY.people.approver.first} will check this before it is sent.`;
}

// --- Step 1 ------------------------------------------------------------------

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
        {COPY.wizard.steps[1].title} — {COPY.wizard.stepOf(1, TOTAL_STEPS)}
      </h2>

      <fieldset className="space-y-3">
        <legend className="sr-only">Choose who you are paying</legend>
        {payees.map((p) => (
          <label
            key={p.id}
            className={`flex min-h-[64px] cursor-pointer items-center gap-4 rounded-xl border-2 bg-white p-4 ${
              draft.payeeId === p.id && mode === 'saved'
                ? 'border-blue-800 ring-2 ring-blue-300'
                : 'border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="payee"
              className="h-6 w-6"
              checked={mode === 'saved' && draft.payeeId === p.id}
              onChange={() => {
                setMode('saved');
                patch({ payeeId: p.id, newPayee: undefined });
              }}
            />
            <span>
              <span className="block text-xl font-semibold">{p.displayName}</span>
              <span className="block text-base text-slate-700">
                {formatIban(p.iban)} · paid {p.timesPaid} time{p.timesPaid === 1 ? '' : 's'}
              </span>
            </span>
          </label>
        ))}

        <label
          className={`flex min-h-[64px] cursor-pointer items-center gap-4 rounded-xl border-2 bg-white p-4 ${
            mode === 'new' ? 'border-blue-800 ring-2 ring-blue-300' : 'border-slate-300'
          }`}
        >
          <input
            type="radio"
            name="payee"
            className="h-6 w-6"
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
          <span className="text-xl font-semibold">{COPY.wizard.steps[1].newPayee}</span>
        </label>
      </fieldset>

      {mode === 'new' ? (
        <div className="card space-y-4">
          <p className="rounded-lg bg-blue-50 p-3">{COPY.wizard.steps[1].newPayeeNote}</p>
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
        <p role="alert" className="font-semibold text-red-800">
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

function StepAmount({
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
    patch({ amountCents: cents });
    onNext();
  }

  return (
    <section className="space-y-5">
      <h2 ref={heading} tabIndex={-1} className="text-3xl">
        {COPY.wizard.steps[2].title} — {COPY.wizard.stepOf(2, TOTAL_STEPS)}
      </h2>

      <div>
        <label htmlFor="amount" className="block font-semibold">
          {COPY.wizard.steps[2].amountLabel}
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-3xl font-bold" aria-hidden="true">
            €
          </span>
          {/* A typable field as well as the keypad: keypad-only is a keyboard trap. */}
          <input
            id="amount"
            className="field text-3xl"
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
        <p id="amount-remaining" className="mt-1 text-slate-700">
          {COPY.wizard.steps[2].remaining}: <Money cents={Math.max(0, balance - (cents ?? 0))} />
        </p>
      </div>

      <div
        className="grid grid-cols-3 gap-3"
        role="group"
        aria-label={COPY.wizard.steps[2].keypadLabel}
      >
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="btn-secondary min-h-[64px] text-2xl"
            onClick={() =>
              commit(key === '⌫' ? text.slice(0, -1) : `${text}${key}`)
            }
          >
            <span aria-hidden={key === '⌫' ? 'true' : undefined}>{key}</span>
            {key === '⌫' ? <span className="sr-only">Delete last digit</span> : null}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="font-semibold text-red-800">
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

function StepReason({
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
  const length = draft.reasonText.trim().length;

  function next() {
    if (!draft.reasonCategory) {
      setError('Please pick the closest reason.');
      return;
    }
    if (length < CONFIG.minReasonChars) {
      setError(COPY.wizard.steps[3].textHelp);
      return;
    }
    setError('');
    onNext();
  }

  return (
    <section className="space-y-5">
      <h2 ref={heading} tabIndex={-1} className="text-3xl">
        {COPY.wizard.steps[3].title} — {COPY.wizard.stepOf(3, TOTAL_STEPS)}
      </h2>

      <fieldset>
        <legend className="font-semibold">{COPY.wizard.steps[3].categoryLabel}</legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {CATEGORIES.map((category) => (
            <label
              key={category}
              className={`chip cursor-pointer ${
                draft.reasonCategory === category
                  ? 'border-blue-800 bg-blue-800 text-white'
                  : 'border-slate-400 bg-white'
              }`}
            >
              <input
                type="radio"
                name="category"
                className="sr-only"
                checked={draft.reasonCategory === category}
                onChange={() => patch({ reasonCategory: category })}
              />
              {COPY.categories[category]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="reason" className="block font-semibold">
          {COPY.wizard.steps[3].textLabel}
        </label>
        <textarea
          id="reason"
          className="field mt-1 min-h-[140px]"
          value={draft.reasonText}
          onChange={(e) => patch({ reasonText: e.target.value })}
          aria-describedby="reason-help"
          aria-invalid={error ? true : undefined}
        />
        <p id="reason-help" className="mt-1 text-slate-700">
          {COPY.wizard.steps[3].textHelp}{' '}
          {draft.reasonCategory === 'other' && length > 0 && length < CONFIG.vagueReasonChars
            ? COPY.wizard.steps[3].vagueHint
            : null}
        </p>
      </div>

      {error ? (
        <p role="alert" className="font-semibold text-red-800">
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

// --- Step 4 ------------------------------------------------------------------

const QUESTIONS = [
  { key: 'contactedFirst', text: COPY.wizard.steps[4].q1 },
  { key: 'askedToKeepSecretOrHurry', text: COPY.wizard.steps[4].q2 },
  { key: 'verifiedOnKnownNumber', text: COPY.wizard.steps[4].q3 },
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
        {COPY.wizard.steps[4].title} — {COPY.wizard.stepOf(4, TOTAL_STEPS)}
      </h2>
      <p>{COPY.wizard.steps[4].intro}</p>

      {QUESTIONS.map((question) => (
        <fieldset key={question.key} className="card">
          <legend className="text-xl font-semibold">{question.text}</legend>
          <div className="mt-3 flex gap-4">
            {[true, false].map((value) => (
              <label
                key={String(value)}
                className={`chip flex-1 cursor-pointer justify-center ${
                  draft.safetyAnswers[question.key] === value
                    ? 'border-blue-800 bg-blue-800 text-white'
                    : 'border-slate-400 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name={question.key}
                  className="sr-only"
                  checked={draft.safetyAnswers[question.key] === value}
                  onChange={() => set(question.key, value)}
                />
                {value ? COPY.wizard.steps[4].yes : COPY.wizard.steps[4].no}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {error ? (
        <p role="alert" className="font-semibold text-red-800">
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
