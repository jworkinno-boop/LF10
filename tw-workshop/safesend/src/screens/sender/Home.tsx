import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { BigButton } from '../../components/BigButton';
import { Money } from '../../components/Money';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { COPY } from '../../copy';
import { iso, localHour, now } from '../../clock';
import { formatCountdown, formatDate, formatDateTime, formatRelative } from '../../format';
import { useApp } from '../../state/AppStateProvider';
import { activeContact, historyAndTransfers, openForSender } from '../../state/selectors';
import type { Transfer } from '../../types';

/** Derived from the demo clock, not the wall clock. */
function greeting(nowMs: number): string {
  const hour = localHour(nowMs);
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const WORDS = [
  'no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve',
];

function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/** One plain sentence of consequence. The reassurance is not optional. */
function consequence(transfer: Transfer): string {
  switch (transfer.state) {
    case 'PENDING_APPROVAL':
      return [
        `Sent to ${COPY.people.approver.first} ${formatRelative(transfer.createdAt)}.`,
        transfer.expiresAt ? `His time to answer runs out ${formatRelative(transfer.expiresAt)}.` : null,
        'Nothing has left your account.',
      ]
        .filter(Boolean)
        .join(' ');
    case 'INFO_REQUESTED':
      return `${COPY.people.approver.first} has asked you something about this. Nothing has left your account until you answer.`;
    case 'APPROVED_HOLD':
      return transfer.holdUntil
        ? `${COPY.people.approver.first} said yes. It goes in ${formatCountdown(transfer.holdUntil)} and you can still stop it.`
        : `${COPY.people.approver.first} said yes. You can still stop it.`;
    case 'EXPIRED':
      return `${COPY.people.approver.first} did not answer in time, so this one stopped by itself. Nothing left your account.`;
    default:
      return 'Nothing has left your account.';
  }
}

export function SenderHome() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<string | null>(null);

  const questions = state.transfers.filter((t) => t.state === 'INFO_REQUESTED');
  const expired = state.transfers.filter((t) => t.state === 'EXPIRED');
  const open = openForSender(state).filter((t) => t.state !== 'INFO_REQUESTED');
  // Two answers and nothing else: "how much have I got" and "what needs me".
  const attention = [...questions, ...expired, ...open];

  const balance = state.accounts.margaret.balanceCents ?? 0;
  const contact = activeContact(state);
  const payments = historyAndTransfers(state);
  const latest = payments[0];
  // Anything still open, rejected, cancelled or expired means "all of them
  // went through" would be a lie, so the green line is suppressed.
  const allSettled = payments.every(
    (item) => item.kind === 'history' || item.transfer.state === 'SENT',
  );

  return (
    <AppShell persona="margaret" title={COPY.sender.homeGreeting}>
      <div className="mx-auto w-full max-w-[80rem] space-y-8">
        <section>
          {/* NOT a <p>, and not a heading either.
              - Not a heading: AppShell already renders the greeting as this
                page's sr-only h1, so an h1/h2 here would compete with it.
              - Not a <p>: `.simple-mode p` in index.css is a class + element
                selector (specificity 0,1,1) and so outranks any single utility
                class (0,1,0) whatever the source order. A font size set with
                `text-[...]` on a <p> inside .simple-mode silently loses to its
                18px and there is no visible clue why.
              clamp() rather than breakpoints: the floor keeps it inside a 320px
              viewport and at 400% zoom (where vw collapses), the ceiling stops
              it running away on a wide monitor. */}
          <div className="font-display text-[clamp(2.75rem,8.5vw,5.5rem)] leading-[1.02]
                          tracking-[-0.03em]">
            {greeting(now())}, {COPY.people.sender.first}
          </div>
          <p className="mt-5 text-[15px] text-ink-2">{COPY.sender.balanceLabel}</p>
          {/* Also a <div> for the reason above: as a <p> this rendered at 18px
              rather than the size written here. */}
          <div className="font-display text-[clamp(2.25rem,4.5vw,3.25rem)] leading-[1.05]
                          tracking-[-0.02em]">
            <Money cents={balance} />
          </div>
          {/* The counterweight to the whole product: the safety layer is not
              in her way, said before she is told about anything that is. */}
          <p className="mt-3 inline-flex items-start gap-2 rounded-card border border-ok-border
                        bg-ok-bg px-4 py-2 text-[15px] font-semibold text-ok">
            <span className="tick-ok mt-[2px] h-5 w-5 text-[12px]" aria-hidden="true">
              ✓
            </span>
            <span>
              Your everyday payments go straight through.
              {contact ? (
                <>
                  {' '}
                  {contact.name.split(' ')[0]} only checks over{' '}
                  <Money cents={state.settings.approvalThresholdCents} />.
                </>
              ) : null}
            </span>
          </p>
        </section>

        <BigButton
          onClick={() => {
            dispatch({ type: 'DRAFT_START' });
            navigate('/m/send');
          }}
        >
          {COPY.sender.sendMoney}
        </BigButton>

        {/* Empty on purpose when nothing needs her: no section exists to say a
            section is empty. */}
        {attention.length > 0 ? (
          <section aria-labelledby="attention-heading" className="space-y-4">
            <h2 id="attention-heading" className="sr-only">
              Payments that need you
            </h2>
            {attention.map((transfer) => (
              <article key={transfer.id} className="card-attend">
                <p className="eyebrow-attend">{COPY.states[transfer.state]}</p>
                <h3 className="mt-2 font-display text-[26px]">
                  <Money cents={transfer.amountCents} /> to {transfer.payee.displayName}
                </h3>
                {transfer.state === 'INFO_REQUESTED' && transfer.infoRequest ? (
                  <p className="mt-2 max-w-[62ch]">“{transfer.infoRequest.question}”</p>
                ) : null}
                <p
                  className="mt-2 max-w-[62ch]"
                  aria-live={transfer.state === 'APPROVED_HOLD' ? 'polite' : undefined}
                >
                  {consequence(transfer)}
                </p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <Link to={`/m/transfer/${transfer.id}`} className="btn-secondary">
                    See this payment
                  </Link>
                  {transfer.state === 'EXPIRED' ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        dispatch({ type: 'DRAFT_START', supersedes: transfer.id });
                        navigate('/m/send');
                      }}
                    >
                      Send it again
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setConfirming(transfer.id)}
                    >
                      Cancel it
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : null}

        <section className="row-split" aria-labelledby="payments-heading">
          <div>
            <h2 id="payments-heading" className="flex items-center gap-2 text-lg font-semibold">
              <span
                className="h-[9px] w-[9px] shrink-0 rounded-full bg-ok-dot"
                aria-hidden="true"
              />
              {COPY.sender.recentPayments}
            </h2>
            <p className="mt-1 text-[15px] text-ink-3">
              {latest ? (
                <>
                  <Money cents={latest.amountCents} /> to {latest.payeeName},{' '}
                  {formatRelative(latest.at)}
                  {payments.length > 1 ? ` — and ${payments.length - 1} more` : null}
                </>
              ) : (
                COPY.sender.noRecentPayments
              )}
            </p>
            {/* Only when every one of them really did settle: this line must
                never overstate. */}
            {allSettled && payments.length > 0 ? (
              <p className="mt-1 text-[15px] font-semibold text-ok">
                {payments.length === 1
                  ? 'It went through with no fuss.'
                  : `All ${countWord(payments.length)} went through with no fuss.`}
              </p>
            ) : null}
          </div>
          <Link to="/m/activity" className="link shrink-0">
            See all
          </Link>
        </section>

        {/* Green only while something really is protected: with no active
            contact this is the neutral card, not a green one. */}
        <section
          className={contact ? 'card-ok' : 'card'}
          aria-labelledby="arrangement-heading"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {contact ? (
                <span
                  className="tick-ok mt-[3px] h-[22px] w-[22px] text-[13px]"
                  aria-hidden="true"
                >
                  ✓
                </span>
              ) : null}
              <div>
                <h2
                  id="arrangement-heading"
                  className={`text-lg font-semibold ${contact ? 'text-ok-ink' : ''}`}
                >
                  {contact
                    ? `${contact.name.split(' ')[0]} is helping you`
                    : 'Nobody is checking your payments at the moment.'}
                </h2>
                <p className={`mt-1 text-[15px] ${contact ? 'text-ok-2' : 'text-ink-3'}`}>
                  {contact ? (
                    <>
                      {contact.relationship} · helping since {formatDate(contact.since)} · no
                      access to your money
                    </>
                  ) : (
                    <>
                      Payments over <Money cents={state.settings.approvalThresholdCents} /> would
                      be checked with someone, if you asked them.
                    </>
                  )}
                </p>
              </div>
            </div>
            <Link to="/m/helpers" className="link shrink-0">
              Change
            </Link>
          </div>
        </section>

        <p className="text-sm text-ink-3">Demo time is {formatDateTime(iso(now()))}.</p>
      </div>

      <ConfirmDialog
        open={confirming !== null}
        title="Cancel this payment?"
        confirmLabel="Yes, cancel it"
        destructive
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) {
            dispatch({
              type: 'CANCEL_TRANSFER',
              transferId: confirming,
              actor: 'margaret',
              nowMs: now(),
            });
          }
          setConfirming(null);
        }}
      >
        <p>Nothing will leave your account. You can always start it again later.</p>
      </ConfirmDialog>
    </AppShell>
  );
}
