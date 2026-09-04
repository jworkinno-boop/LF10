import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { BigButton } from '../../components/BigButton';
import { Money } from '../../components/Money';
import { EmptyState } from '../../components/EmptyState';
import { COPY } from '../../copy';
import { iso, now } from '../../clock';
import { formatCountdown, formatDateTime, formatRelative } from '../../format';
import { useApp } from '../../state/AppStateProvider';
import { openForSender, recentTransfers } from '../../state/selectors';

export function SenderHome() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const open = openForSender(state);
  const expired = state.transfers.filter((t) => t.state === 'EXPIRED');
  const questions = state.transfers.filter((t) => t.state === 'INFO_REQUESTED');
  const recent = recentTransfers(state, 5);
  const balance = state.accounts.margaret.balanceCents ?? 0;

  return (
    <AppShell persona="margaret" title={COPY.sender.homeGreeting}>
      <div className="space-y-8">
        <section className="card">
          <h2 className="text-2xl">{COPY.sender.homeGreeting}</h2>
          <p className="mt-2 text-lg text-slate-700">{COPY.sender.balanceLabel}</p>
          <p className="text-4xl font-bold">
            <Money cents={balance} />
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

        {questions.length > 0 ? (
          <section className="rounded-xl border-2 border-blue-800 bg-blue-50 p-5">
            <h2 className="text-2xl text-blue-950">{COPY.sender.questionHeading}</h2>
            <ul className="mt-3 space-y-3">
              {questions.map((transfer) => (
                <li key={transfer.id}>
                  <p>“{transfer.infoRequest?.question}”</p>
                  <Link to={`/m/transfer/${transfer.id}`} className="link">
                    Reply about your payment of <Money cents={transfer.amountCents} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {expired.length > 0 ? (
          <section className="rounded-xl border-2 border-amber-600 bg-amber-50 p-5">
            <h2 className="text-2xl text-amber-950">{COPY.sender.expiredHeading}</h2>
            <ul className="mt-3 space-y-3">
              {expired.map((transfer) => (
                <li key={transfer.id} className="flex flex-wrap items-center gap-3">
                  <span>
                    <Money cents={transfer.amountCents} /> to {transfer.payee.displayName}
                  </span>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      dispatch({ type: 'DRAFT_START', supersedes: transfer.id });
                      navigate('/m/send');
                    }}
                  >
                    Send it again
                  </button>
                  {state.contacts.some((c) => !c.active && c.id === 'contact_jean') ? (
                    <Link to="/m/helpers" className="link">
                      Or ask {COPY.people.secondContact.first} instead
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="text-2xl">
            {COPY.sender.pendingHeading}
          </h2>
          {open.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="Nothing is waiting.">
                <p>When a payment needs checking, it will appear here.</p>
              </EmptyState>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {open.map((transfer) => (
                <li key={transfer.id} className="card">
                  <Link to={`/m/transfer/${transfer.id}`} className="link text-xl">
                    <Money cents={transfer.amountCents} /> to {transfer.payee.displayName}
                  </Link>
                  <p className="mt-1">{COPY.states[transfer.state]}</p>
                  {transfer.state === 'APPROVED_HOLD' && transfer.holdUntil ? (
                    <p className="mt-1 font-semibold" aria-live="polite">
                      Goes in {formatCountdown(transfer.holdUntil)} — you can still cancel.
                    </p>
                  ) : null}
                  {transfer.state === 'PENDING_APPROVAL' && transfer.expiresAt ? (
                    <p className="mt-1 text-slate-700">
                      Waiting since {formatRelative(transfer.createdAt)}. Expires{' '}
                      {formatRelative(transfer.expiresAt)}.
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="recent-heading" className="text-2xl">
              {COPY.sender.recentPayments}
            </h2>
            <Link to="/m/activity" className="link">
              {COPY.sender.seeAll}
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={COPY.sender.noRecentPayments} />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {recent.map((transfer) => (
                <li key={transfer.id} className="card flex flex-wrap items-baseline gap-x-3">
                  <Link to={`/m/transfer/${transfer.id}`} className="link">
                    <Money cents={transfer.amountCents} /> to {transfer.payee.displayName}
                  </Link>
                  <span className="text-slate-700">{formatDateTime(transfer.createdAt)}</span>
                  <span className="ml-auto font-semibold">{COPY.states[transfer.state]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-2xl">
            Before this demo started
          </h2>
          <ul className="mt-3 space-y-2">
            {state.history.slice(0, 5).map((item) => (
              <li key={item.id} className="card flex flex-wrap items-baseline gap-x-3">
                <span className="font-semibold">
                  <Money cents={item.amountCents} /> to {item.payeeName}
                </span>
                <span className="text-slate-700">{formatRelative(item.at)}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-sm text-slate-700">Demo time is {formatDateTime(iso(now()))}.</p>
      </div>
    </AppShell>
  );
}
