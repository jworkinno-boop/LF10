import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { Money } from '../../components/Money';
import { Timeline } from '../../components/Timeline';
import { SenderRiskPanel } from '../../components/RiskPanel';
import { ScamExplainerList } from '../../components/ScamExplainer';
import { AftermathCard } from '../../components/AftermathCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { COPY } from '../../copy';
import { now } from '../../clock';
import { formatCountdown, formatIban } from '../../format';
import { useApp } from '../../state/AppStateProvider';
import { transferById } from '../../state/selectors';

export function TransferStatus() {
  const { id } = useParams();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [reply, setReply] = useState('');

  const transfer = id ? transferById(state, id) : undefined;

  if (!transfer) {
    return (
      <AppShell persona="margaret" title="Payment">
        <EmptyState title="We could not find that payment.">
          <Link to="/m" className="link">
            Go back to your home page
          </Link>
        </EmptyState>
      </AppShell>
    );
  }

  const canCancel =
    transfer.state === 'PENDING_APPROVAL' ||
    transfer.state === 'INFO_REQUESTED' ||
    transfer.state === 'APPROVED_HOLD';

  return (
    <AppShell persona="margaret" title="Your payment">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="card">
          <p className="text-slate-700">Reference {transfer.id}</p>
          <h2 className="text-3xl">
            <Money cents={transfer.amountCents} /> to {transfer.payee.displayName}
          </h2>
          <p className="mt-1 text-slate-700">{formatIban(transfer.payee.iban)}</p>
          <p className="mt-3 text-xl font-semibold">{COPY.states[transfer.state]}</p>

          {transfer.state === 'APPROVED_HOLD' && transfer.holdUntil ? (
            <p className="mt-2 text-lg font-semibold" aria-live="polite">
              This goes in {formatCountdown(transfer.holdUntil)}. You can still cancel it.
            </p>
          ) : null}

          {transfer.state === 'REJECTED' ? (
            <div className="mt-3 rounded-lg border-2 border-amber-600 bg-amber-50 p-4">
              <p className="font-semibold">
                {COPY.people.approver.first} stopped this payment. Nothing left your account.
              </p>
              <p className="mt-1">Reason he gave: {transfer.approval?.rejectionReason}</p>
              {transfer.approval?.note ? <p className="mt-1">“{transfer.approval.note}”</p> : null}
              <Link to="/m/help" className="link mt-2 inline-block">
                Read about how these scams work
              </Link>
            </div>
          ) : null}

          {transfer.state === 'BLOCKED' ? (
            <div className="mt-3 rounded-lg border-2 border-red-700 bg-red-50 p-4">
              <p className="font-semibold">
                This payment was not sent, because it matched a well-known scam pattern.
              </p>
              <p className="mt-1">
                Nothing left your account. Ring {COPY.people.approver.first} on a number you already
                have and talk it through — he can help you decide what to do next.
              </p>
            </div>
          ) : null}

          {transfer.state === 'EXPIRED' ? (
            <div className="mt-3 rounded-lg border-2 border-amber-600 bg-amber-50 p-4">
              <p className="font-semibold">
                Nobody decided within 24 hours, so this payment expired. Nothing left your account.
              </p>
              <button
                type="button"
                className="btn-primary mt-3"
                onClick={() => {
                  dispatch({ type: 'DRAFT_START', supersedes: transfer.id });
                  navigate('/m/send');
                }}
              >
                Send it again
              </button>
            </div>
          ) : null}
        </section>

        {transfer.state === 'INFO_REQUESTED' ? (
          <section className="card space-y-3">
            <h2 className="text-2xl">{COPY.sender.questionHeading}</h2>
            <p className="rounded-lg bg-blue-50 p-3">“{transfer.infoRequest?.question}”</p>
            <label htmlFor="reply" className="block font-semibold">
              Your reply
            </label>
            <textarea
              id="reply"
              className="field min-h-[120px]"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
            />
            <p className="text-slate-700">
              We will check the payment again with your reply included.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                dispatch({
                  type: 'ANSWER_QUESTION',
                  transferId: transfer.id,
                  actor: 'margaret',
                  nowMs: now(),
                  answer: reply,
                })
              }
            >
              Send my reply
            </button>
          </section>
        ) : null}

        <SenderRiskPanel assessment={transfer.risk} autoFocus={false} />

        {transfer.risk.band === 'HIGH' || transfer.risk.band === 'CRITICAL' ? (
          <ScamExplainerList patterns={transfer.risk.matchedScamPatterns} />
        ) : null}

        {transfer.state === 'REJECTED' &&
        transfer.approval?.rejectionReason === COPY.approver.rejectionReasons.scam ? (
          <AftermathCard />
        ) : null}

        <section className="card">
          <h2 className="text-2xl">What has happened</h2>
          <div className="mt-3">
            <Timeline transfer={transfer} entries={state.audit} />
          </div>
        </section>

        {canCancel ? (
          <button type="button" className="btn-danger w-full" onClick={() => setConfirming(true)}>
            {COPY.sender.cancelPayment}
          </button>
        ) : null}

        <ConfirmDialog
          open={confirming}
          title="Cancel this payment?"
          confirmLabel="Yes, cancel it"
          destructive
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            dispatch({
              type: 'CANCEL_TRANSFER',
              transferId: transfer.id,
              actor: 'margaret',
              nowMs: now(),
            });
            setConfirming(false);
          }}
        >
          <p>
            Nothing will leave your account. You can always start it again later.
          </p>
        </ConfirmDialog>
      </div>
    </AppShell>
  );
}
