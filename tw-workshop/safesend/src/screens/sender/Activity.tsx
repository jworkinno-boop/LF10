import { Link } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { Money } from '../../components/Money';
import { EmptyState } from '../../components/EmptyState';
import { COPY } from '../../copy';
import { formatDateTime, formatRelative } from '../../format';
import { useApp } from '../../state/AppStateProvider';
import { parse } from '../../clock';
import type { TransferState } from '../../types';

const CHIP: Record<TransferState, string> = {
  DRAFT: 'border-slate-400 bg-slate-50',
  PENDING_APPROVAL: 'border-amber-600 bg-amber-50',
  INFO_REQUESTED: 'border-blue-700 bg-blue-50',
  APPROVED_HOLD: 'border-blue-700 bg-blue-50',
  SENT: 'border-emerald-700 bg-emerald-50',
  REJECTED: 'border-orange-700 bg-orange-50',
  EXPIRED: 'border-amber-600 bg-amber-50',
  CANCELLED: 'border-slate-400 bg-slate-50',
  BLOCKED: 'border-red-700 bg-red-50',
};

export function Activity() {
  const { state } = useApp();
  const transfers = [...state.transfers].sort(
    (a, b) => parse(b.createdAt) - parse(a.createdAt),
  );

  return (
    <AppShell persona="margaret" title="Your payments">
      <div className="space-y-6">
        <h2 className="text-2xl">Payments in this demo</h2>
        {transfers.length === 0 ? (
          <EmptyState title={COPY.empty.noTransfers}>
            <Link to="/m/send" className="link">
              Send your first payment
            </Link>
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {transfers.map((transfer) => (
              <li key={transfer.id} className="card">
                <div className="flex flex-wrap items-baseline gap-3">
                  <Link to={`/m/transfer/${transfer.id}`} className="link text-xl">
                    <Money cents={transfer.amountCents} /> to {transfer.payee.displayName}
                  </Link>
                  <span
                    className={`rounded-full border-2 px-3 py-1 text-base font-semibold ${CHIP[transfer.state]}`}
                  >
                    {COPY.states[transfer.state]}
                  </span>
                </div>
                <p className="mt-1 text-slate-700">{formatDateTime(transfer.createdAt)}</p>
                <p className="mt-1">“{transfer.reasonText}”</p>
              </li>
            ))}
          </ul>
        )}

        <section>
          <h2 className="text-2xl">Before this demo started</h2>
          <ul className="mt-3 space-y-2">
            {state.history.map((item) => (
              <li key={item.id} className="card flex flex-wrap items-baseline gap-x-3">
                <span className="font-semibold">
                  <Money cents={item.amountCents} /> to {item.payeeName}
                </span>
                <span className="text-slate-700">{formatRelative(item.at)}</span>
                <span className="w-full text-slate-800">{item.description}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
