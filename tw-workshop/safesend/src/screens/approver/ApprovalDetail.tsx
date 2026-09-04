import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { Money } from '../../components/Money';
import { ApproverRiskPanel } from '../../components/RiskPanel';
import { ScamExplainerList } from '../../components/ScamExplainer';
import { TalkAboutIt } from '../../components/TalkAboutIt';
import { AftermathCard } from '../../components/AftermathCard';
import { ReasonDiff } from '../../components/ReasonDiff';
import { Timeline } from '../../components/Timeline';
import { EmptyState } from '../../components/EmptyState';
import { RiskBadge } from '../../components/RiskBadge';
import { COPY } from '../../copy';
import { now } from '../../clock';
import { formatCountdown, formatDateTime, formatIban } from '../../format';
import { bandRank } from '../../risk/assessRisk';
import { useApp } from '../../state/AppStateProvider';
import { monthlyPattern, transferById } from '../../state/selectors';
import { copLabel } from '../../data/mockCopDirectory';
import { COUNTRY_NAMES } from '../../data/highRiskCountries';

const REJECTION_REASONS = Object.values(COPY.approver.rejectionReasons);

export function ApprovalDetail() {
  const { id } = useParams();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [spoke, setSpoke] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<'none' | 'reject' | 'ask'>('none');

  const transfer = id ? transferById(state, id) : undefined;

  if (!transfer) {
    return (
      <AppShell persona="david" title="Approval">
        <EmptyState title="That request could not be found.">
          <Link to="/d" className="link">
            Back to approvals
          </Link>
        </EmptyState>
      </AppShell>
    );
  }

  const decidable = transfer.state === 'PENDING_APPROVAL';
  const needsSpokeConfirm = bandRank(transfer.risk.band) >= bandRank('HIGH');
  const priorRejection = state.transfers.find(
    (t) => t.id === transfer.supersedesTransferId && t.state === 'REJECTED',
  );
  const pattern = monthlyPattern(state, now());
  const maxBar = Math.max(1, ...pattern.map((p) => p.total));
  const savedPayee = state.payees.find((p) => p.iban === transfer.payee.iban);

  return (
    <AppShell persona="david" title="Approval request">
      <div className="space-y-6">
        <section className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-700">Reference {transfer.id}</p>
              <h2 className="text-2xl">
                <Money cents={transfer.amountCents} /> to {transfer.payee.displayName}
              </h2>
              <p className="text-sm text-slate-700">
                Requested {formatDateTime(transfer.createdAt)}
                {transfer.expiresAt ? ` · expires ${formatDateTime(transfer.expiresAt)}` : ''}
              </p>
            </div>
            <RiskBadge band={transfer.risk.band} />
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-semibold">Account</dt>
              <dd className="font-mono">{formatIban(transfer.payee.iban)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Country</dt>
              <dd>{COUNTRY_NAMES[transfer.payee.countryCode] ?? transfer.payee.countryCode}</dd>
            </div>
            <div>
              <dt className="font-semibold">Paid before</dt>
              <dd>
                {transfer.payee.timesPaid === 0
                  ? 'Never — first payment to this account'
                  : `${transfer.payee.timesPaid} times`}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Confirmation of Payee</dt>
              <dd>
                {copLabel(transfer.payee.copResult ?? 'unavailable')}
                {transfer.payee.copNameOnAccount
                  ? ` — account name "${transfer.payee.copNameOnAccount}"`
                  : ''}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2 className="text-xl">Her stated reason, word for word</h2>
          <blockquote className="mt-2 border-l-4 border-slate-400 pl-4 text-lg">
            “{transfer.reasonText}”
          </blockquote>
          <p className="mt-2 text-sm text-slate-700">
            Category: {COPY.categories[transfer.reasonCategory]}
          </p>

          <h3 className="mt-4 font-semibold">Safety check answers, word for word</h3>
          <dl className="mt-2 space-y-2">
            <div>
              <dt>{COPY.wizard.steps[4].q1}</dt>
              <dd className="font-bold">{answer(transfer.safetyAnswers.contactedFirst)}</dd>
            </div>
            <div>
              <dt>{COPY.wizard.steps[4].q2}</dt>
              <dd className="font-bold">
                {answer(transfer.safetyAnswers.askedToKeepSecretOrHurry)}
              </dd>
            </div>
            <div>
              <dt>{COPY.wizard.steps[4].q3}</dt>
              <dd className="font-bold">{answer(transfer.safetyAnswers.verifiedOnKnownNumber)}</dd>
            </div>
          </dl>
        </section>

        {priorRejection ? (
          <section className="rounded-xl border-2 border-orange-700 bg-orange-50 p-5">
            <h2 className="text-xl font-bold text-orange-950">
              You already stopped a payment to this account
            </h2>
            <p className="mt-1 text-orange-950">
              {formatDateTime(priorRejection.approval!.decidedAt)} — “
              {priorRejection.approval?.rejectionReason}”
              {priorRejection.approval?.note ? ` (${priorRejection.approval.note})` : ''}
            </p>
            <div className="mt-3">
              <ReasonDiff before={priorRejection.reasonText} after={transfer.reasonText} />
            </div>
          </section>
        ) : null}

        {transfer.priorRisk ? (
          <section className="rounded-xl border-2 border-amber-600 bg-amber-50 p-4">
            <h2 className="text-lg font-bold text-amber-950">Re-checked after her reply</h2>
            <p className="mt-1 text-amber-950">
              Before: {transfer.priorRisk.band} ({transfer.priorRisk.score}/100). After:{' '}
              {transfer.risk.band} ({transfer.risk.score}/100).
            </p>
            {transfer.infoRequest?.answer ? (
              <p className="mt-2 text-amber-950">Her reply: “{transfer.infoRequest.answer}”</p>
            ) : null}
          </section>
        ) : null}

        <ApproverRiskPanel assessment={transfer.risk} />

        {transfer.risk.matchedScamPatterns.length > 0 ? (
          <ScamExplainerList patterns={transfer.risk.matchedScamPatterns} />
        ) : null}

        {bandRank(transfer.risk.band) >= bandRank('MEDIUM') ? <TalkAboutIt /> : null}

        <section className="card">
          <h2 className="text-xl">Her 90-day pattern</h2>
          <ul className="mt-3 space-y-2">
            {pattern.map((bucket) => (
              <li key={bucket.label} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm text-slate-700">{bucket.label}</span>
                <span
                  className="h-5 rounded bg-blue-800"
                  style={{ width: `${Math.round((bucket.total / maxBar) * 100)}%` }}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold">
                  <Money cents={bucket.total} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        {decidable ? (
          <section className="card space-y-4">
            <h2 className="text-xl">Your decision</h2>

            <div>
              <label htmlFor="note" className="block font-semibold">
                Note (optional) — {COPY.people.sender.first} will see this
              </label>
              <textarea
                id="note"
                className="field mt-1 min-h-[80px]"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            {needsSpokeConfirm ? (
              <label className="flex items-start gap-3 rounded-lg border-2 border-orange-700 bg-orange-50 p-3">
                <input
                  type="checkbox"
                  className="mt-1 h-6 w-6"
                  checked={spoke}
                  onChange={(event) => setSpoke(event.target.checked)}
                />
                <span className="font-semibold text-orange-950">{COPY.approver.spokeConfirm}</span>
              </label>
            ) : null}

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  dispatch({
                    type: 'APPROVE',
                    transferId: transfer.id,
                    actor: 'david',
                    nowMs: now(),
                    note: note || undefined,
                    spokeToSenderConfirmed: spoke,
                  })
                }
              >
                {COPY.approver.approve}
                {transfer.risk.coolingOffMinutes > 0
                  ? ` (with a ${transfer.risk.coolingOffMinutes}-minute wait)`
                  : ''}
              </button>
              <button type="button" className="btn-danger" onClick={() => setMode('reject')}>
                {COPY.approver.reject}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setMode('ask')}>
                {COPY.approver.askQuestion}
              </button>
              {savedPayee && savedPayee.status !== 'trusted' ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    dispatch({
                      type: 'ADD_TRUSTED_PAYEE',
                      payeeId: savedPayee.id,
                      actor: 'david',
                      nowMs: now(),
                    })
                  }
                >
                  {COPY.approver.addTrusted}
                </button>
              ) : null}
            </div>

            {mode === 'reject' ? (
              <fieldset className="rounded-lg border-2 border-slate-400 p-4">
                <legend className="font-semibold">Why are you stopping this?</legend>
                <div className="mt-2 space-y-2">
                  {REJECTION_REASONS.map((reason) => (
                    <label key={reason} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="rejection"
                        className="h-5 w-5"
                        checked={rejectionReason === reason}
                        onChange={() => setRejectionReason(reason)}
                      />
                      {reason}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-danger mt-4"
                  onClick={() =>
                    dispatch({
                      type: 'REJECT',
                      transferId: transfer.id,
                      actor: 'david',
                      nowMs: now(),
                      rejectionReason,
                      note: note || undefined,
                    })
                  }
                >
                  Confirm and stop this payment
                </button>
              </fieldset>
            ) : null}

            {mode === 'ask' ? (
              <div className="rounded-lg border-2 border-slate-400 p-4">
                <label htmlFor="question" className="block font-semibold">
                  What do you want to ask?
                </label>
                <textarea
                  id="question"
                  className="field mt-1 min-h-[80px]"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary mt-3"
                  onClick={() =>
                    dispatch({
                      type: 'ASK_QUESTION',
                      transferId: transfer.id,
                      actor: 'david',
                      nowMs: now(),
                      question,
                    })
                  }
                >
                  Send the question
                </button>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="card">
            <h2 className="text-xl">Decision</h2>
            <p className="mt-2 font-semibold">{COPY.states[transfer.state]}</p>
            {transfer.approval ? (
              <p className="mt-1">
                {transfer.approval.decision === 'approved' ? 'Approved' : 'Rejected'}{' '}
                {formatDateTime(transfer.approval.decidedAt)}
                {transfer.approval.rejectionReason
                  ? ` — ${transfer.approval.rejectionReason}`
                  : ''}
              </p>
            ) : null}
            {transfer.state === 'APPROVED_HOLD' && transfer.holdUntil ? (
              <>
                <p className="mt-2 font-semibold" aria-live="polite">
                  Sends in {formatCountdown(transfer.holdUntil)}.
                </p>
                <button
                  type="button"
                  className="btn-danger mt-3"
                  onClick={() =>
                    dispatch({
                      type: 'CANCEL_TRANSFER',
                      transferId: transfer.id,
                      actor: 'david',
                      nowMs: now(),
                    })
                  }
                >
                  Cancel it before it sends
                </button>
              </>
            ) : null}
          </section>
        )}

        {transfer.state === 'REJECTED' &&
        transfer.approval?.rejectionReason === COPY.approver.rejectionReasons.scam ? (
          <AftermathCard showReportLink={false} />
        ) : null}

        <section className="card">
          <h2 className="text-xl">History</h2>
          <div className="mt-3">
            <Timeline transfer={transfer} entries={state.audit} />
          </div>
        </section>

        <button type="button" className="btn-secondary" onClick={() => navigate('/d')}>
          Back to approvals
        </button>
      </div>
    </AppShell>
  );
}

function answer(value: boolean | null): string {
  if (value === null) return 'Not answered';
  return value ? 'Yes' : 'No';
}
