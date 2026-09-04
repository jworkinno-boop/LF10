import { Link } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { Money } from '../../components/Money';
import { RiskBadge } from '../../components/RiskBadge';
import { EmptyState } from '../../components/EmptyState';
import { COPY } from '../../copy';
import { CONFIG } from '../../config';
import { MINUTE_MS, now, parse } from '../../clock';
import { formatCountdown, formatDateTime, formatRelative } from '../../format';
import { useApp } from '../../state/AppStateProvider';
import {
  monthlyPattern,
  pendingForApprover,
  recentTransfers,
  spendSummary,
  unreadCount,
} from '../../state/selectors';

export function ApproverDashboard() {
  const { state } = useApp();
  const pending = pendingForApprover(state);
  const unread = unreadCount(state, 'david');
  const spend = spendSummary(state, now());
  const pattern = monthlyPattern(state, now());
  const maxBar = Math.max(1, ...pattern.map((p) => p.total));
  const holds = state.transfers.filter((t) => t.state === 'APPROVED_HOLD');

  // Escalation safety valve: a CRITICAL rejection the sender has not looked at.
  const nudges = state.transfers.filter(
    (t) =>
      t.state === 'REJECTED' &&
      t.risk.band === 'CRITICAL' &&
      t.approval &&
      now() - parse(t.approval.decidedAt) > CONFIG.escalationNudgeMinutes * MINUTE_MS,
  );

  return (
    <AppShell persona="david" title={COPY.approver.dashboard}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Waiting for you
            </p>
            <p className="text-3xl font-bold">{pending.length}</p>
          </div>
          <div className="card">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Unread messages
            </p>
            <p className="text-3xl font-bold">{unread}</p>
          </div>
          <div className="card">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Last 30 days
            </p>
            <p className="text-3xl font-bold">
              <Money cents={spend.thisMonthCents} />
            </p>
            <p className="text-sm text-slate-700">
              Usual month <Money cents={spend.usualMonthCents} />
            </p>
          </div>
        </div>

        {nudges.length > 0 ? (
          <section className="rounded-xl border-2 border-orange-700 bg-orange-50 p-4">
            <h2 className="text-xl font-bold text-orange-950">{COPY.approver.callNow}</h2>
            <p className="mt-1 text-orange-950">
              You stopped a payment flagged as a likely scam{' '}
              {formatRelative(nudges[0].approval!.decidedAt)} and {COPY.people.sender.first} has not
              opened SafeSend since. A phone call is worth more than anything this app can do.
            </p>
            <p className="mt-2 font-semibold">{state.accounts.margaret.phone}</p>
          </section>
        ) : null}

        {holds.length > 0 ? (
          <section className="rounded-xl border-2 border-blue-800 bg-blue-50 p-4">
            <h2 className="text-xl font-bold text-blue-950">Waiting to send</h2>
            <ul className="mt-2 space-y-2">
              {holds.map((transfer) => (
                <li key={transfer.id} aria-live="polite">
                  <Money cents={transfer.amountCents} /> to {transfer.payee.displayName} — sends in{' '}
                  {formatCountdown(transfer.holdUntil!)}.{' '}
                  <Link to={`/d/approve/${transfer.id}`} className="link">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="text-xl">
            {COPY.approver.pending}
          </h2>
          {pending.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={COPY.approver.noPending}>
                <p>Requests appear here as soon as {COPY.people.sender.first} sends one.</p>
              </EmptyState>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {pending.map((transfer) => (
                <li key={transfer.id} className="card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link to={`/d/approve/${transfer.id}`} className="link text-lg">
                        <Money cents={transfer.amountCents} /> to {transfer.payee.displayName}
                      </Link>
                      <p className="text-sm text-slate-700">
                        Ref {transfer.id} · {formatDateTime(transfer.createdAt)} · expires{' '}
                        {transfer.expiresAt ? formatRelative(transfer.expiresAt) : '—'}
                      </p>
                    </div>
                    <RiskBadge band={transfer.risk.band} />
                  </div>
                  <p className="mt-2">“{transfer.reasonText}”</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="pattern-heading">
          <h2 id="pattern-heading" className="text-xl">
            {COPY.people.sender.first}’s 90-day pattern
          </h2>
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
          <p className="mt-3 text-sm text-slate-700">
            This 90-day summary is all you can see. Day-to-day spending stays private.
          </p>
        </section>

        <section aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="text-xl">
            Recent activity
          </h2>
          <ul className="mt-3 space-y-2">
            {recentTransfers(state, 8).map((transfer) => (
              <li key={transfer.id} className="card flex flex-wrap items-baseline gap-3">
                <Link to={`/d/approve/${transfer.id}`} className="link">
                  <Money cents={transfer.amountCents} /> to {transfer.payee.displayName}
                </Link>
                <span className="text-sm text-slate-700">{formatDateTime(transfer.createdAt)}</span>
                <span className="ml-auto font-semibold">{COPY.states[transfer.state]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
