import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { Money } from '../../components/Money';
import { Timeline } from '../../components/Timeline';
import { HoldCountdown } from '../../components/HoldCountdown';
import { SenderRiskPanel } from '../../components/RiskPanel';
import { ScamExplainerList } from '../../components/ScamExplainer';
import { AftermathCard } from '../../components/AftermathCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { COPY } from '../../copy';
import { CONFIG } from '../../config';
import { now } from '../../clock';
import { formatIban, formatRelative } from '../../format';
import { useApp } from '../../state/AppStateProvider';
import { activeContact, transferById } from '../../state/selectors';
import type { Transfer, TransferState } from '../../types';

type Tone = 'attend' | 'settled' | 'stopped';

/** One hue per state, and each hue means exactly one thing (handoff §1.4). */
function toneOf(state: TransferState): Tone {
  switch (state) {
    case 'PENDING_APPROVAL':
    case 'INFO_REQUESTED':
    case 'APPROVED_HOLD':
    case 'EXPIRED':
      return 'attend';
    case 'SENT':
      return 'settled';
    default:
      return 'stopped';
  }
}

const CARD: Record<Tone, string> = {
  attend: 'card-attend',
  settled: 'card-ok',
  stopped: 'card-stopped',
};

const EYEBROW: Record<Tone, string> = {
  attend: 'eyebrow-attend',
  settled: 'eyebrow text-ok',
  stopped: 'eyebrow text-danger',
};

/**
 * One sentence of consequence, ending in the reassurance. The reassurance is
 * not decoration — it is the whole reason this page reads as calm rather than
 * as an alarm, and it is why every branch here ends the same way.
 */
function consequence(transfer: Transfer): { sentence: string; reassurance: string | null } {
  const david = COPY.people.approver.first;
  switch (transfer.state) {
    case 'PENDING_APPROVAL':
      return {
        sentence: [
          `Sent to ${david} ${formatRelative(transfer.createdAt)}.`,
          transfer.expiresAt ? `His time to answer runs out ${formatRelative(transfer.expiresAt)}.` : '',
        ]
          .filter(Boolean)
          .join(' '),
        reassurance: 'Nothing has left your account.',
      };
    case 'INFO_REQUESTED':
      return {
        sentence: `${david} has asked you something about this payment.`,
        reassurance: 'Nothing has left your account until you answer.',
      };
    case 'APPROVED_HOLD':
      return {
        sentence: `${david} said yes. There is a short wait before it goes, so you can still change your mind.`,
        reassurance: null,
      };
    case 'SENT':
      return { sentence: 'This payment went through.', reassurance: null };
    case 'EXPIRED':
      return {
        sentence: `Nobody decided within ${CONFIG.approvalExpiryHours} hours, so this payment stopped by itself.`,
        reassurance: 'Nothing left your account.',
      };
    case 'CANCELLED':
      return { sentence: 'This payment was cancelled.', reassurance: 'Nothing left your account.' };
    case 'REJECTED':
      return {
        sentence: `${david} stopped this payment.`,
        reassurance: 'Nothing left your account.',
      };
    case 'BLOCKED':
      return {
        sentence: 'This payment was not sent, because it matched a well-known scam pattern.',
        reassurance: 'Nothing left your account.',
      };
    default:
      return { sentence: '', reassurance: 'Nothing has left your account.' };
  }
}

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

  const tone = toneOf(transfer.state);
  const { sentence, reassurance } = consequence(transfer);
  const contact = activeContact(state);
  const canCancel =
    transfer.state === 'PENDING_APPROVAL' ||
    transfer.state === 'INFO_REQUESTED' ||
    transfer.state === 'APPROVED_HOLD';

  const cancelButton = (label: string) => (
    <button type="button" className="btn-danger w-full" onClick={() => setConfirming(true)}>
      {label}
    </button>
  );

  return (
    <AppShell persona="margaret" title="Your payment">
      <div className="mx-auto w-full max-w-2xl space-y-6 lg:max-w-3xl">
        <section className={CARD[tone]}>
          <p className={EYEBROW[tone]}>{COPY.states[transfer.state]}</p>
          <h2 className="mt-2 font-display text-[30px] leading-[1.1]">
            <Money cents={transfer.amountCents} /> to {transfer.payee.displayName}
          </h2>
          <p className="mt-2 text-ink-2">
            {formatIban(transfer.payee.iban)} · reference {transfer.id}
          </p>
          {sentence ? <p className="mt-3 max-w-[62ch]">{sentence}</p> : null}
          {reassurance ? <p className="mt-1 max-w-[62ch] font-semibold">{reassurance}</p> : null}

          {transfer.state === 'REJECTED' && transfer.approval ? (
            <div className="mt-4 border-t border-rule pt-4">
              <p>Reason he gave: {transfer.approval.rejectionReason}</p>
              {transfer.approval.note ? <p className="mt-1">“{transfer.approval.note}”</p> : null}
              <Link to="/m/help" className="link mt-2 inline-block">
                Read about how these scams work
              </Link>
            </div>
          ) : null}

          {transfer.state === 'BLOCKED' ? (
            <p className="mt-3 max-w-[62ch]">
              Ring {COPY.people.approver.first} on a number you already have and talk it through —
              he can help you decide what to do next.
            </p>
          ) : null}

          {transfer.state === 'EXPIRED' ? (
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => {
                dispatch({ type: 'DRAFT_START', supersedes: transfer.id });
                navigate('/m/send');
              }}
            >
              Send it again
            </button>
          ) : null}
        </section>

        {/* The cooling-off wait: a ring she can watch, with the way out of it
            directly underneath. Nothing else in the product animates. */}
        {transfer.state === 'APPROVED_HOLD' && transfer.holdUntil ? (
          <section className="card" aria-labelledby="hold-heading">
            <h2 id="hold-heading" className="sr-only">
              Time left before this payment goes
            </h2>
            <p className="sr-only" aria-live="polite">
              {COPY.states[transfer.state]}.
            </p>
            <HoldCountdown
              holdUntil={transfer.holdUntil}
              startedAt={transfer.approval?.decidedAt}
              totalMinutes={CONFIG.coolingOffMinutes}
            >
              <div className="w-full max-w-sm">{cancelButton(COPY.sender.holdCancel)}</div>
            </HoldCountdown>
          </section>
        ) : null}

        {transfer.state === 'INFO_REQUESTED' ? (
          <section className="card-attend space-y-3">
            <h2 className="text-2xl">{COPY.sender.questionHeading}</h2>
            <p className="rounded-ctl bg-attend-bg p-3">“{transfer.infoRequest?.question}”</p>
            <label htmlFor="reply" className="block font-semibold">
              Your reply
            </label>
            <textarea
              id="reply"
              className="field min-h-[130px]"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
            />
            <p className="text-ink-2">
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
          <div className="mt-4">
            <Timeline transfer={transfer} entries={state.audit} />
          </div>
        </section>

        {/* Ink, not green: ringing him is urgent, but it is not a "go". The
            cancel sits with the ring above when there is one, so it is not
            repeated here. */}
        {canCancel ? (
          <div className="flex flex-col gap-4">
            {contact ? (
              <a
                href={`tel:${contact.phone.replace(/\s/g, '')}`}
                className="btn-neutral w-full !min-h-[76px]"
              >
                {COPY.sender.ringApprover}
              </a>
            ) : null}
            {transfer.state === 'APPROVED_HOLD' ? null : cancelButton(COPY.sender.cancelPayment)}
          </div>
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
          <p>Nothing will leave your account. You can always start it again later.</p>
        </ConfirmDialog>
      </div>
    </AppShell>
  );
}
