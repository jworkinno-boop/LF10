import { Link } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { Money } from '../../components/Money';
import { EmptyState } from '../../components/EmptyState';
import { COPY } from '../../copy';
import { formatDateTime, formatRelative } from '../../format';
import { useApp } from '../../state/AppStateProvider';
import { historyAndTransfers } from '../../state/selectors';
import type { TransferState } from '../../types';

// Warm equivalents of the old cool chips. Never colour alone: the chip carries
// the state in words.
const CHIP: Record<TransferState, string> = {
  DRAFT: 'border-rule-2 bg-surface-2 text-ink-2',
  PENDING_APPROVAL: 'border-attend-border bg-attend-bg text-attend',
  INFO_REQUESTED: 'border-attend-border bg-attend-bg text-attend',
  APPROVED_HOLD: 'border-attend-border bg-attend-bg text-attend',
  SENT: 'border-ok bg-ok-bg text-ok',
  REJECTED: 'border-danger bg-danger-bg text-danger',
  EXPIRED: 'border-attend-border bg-attend-bg text-attend',
  CANCELLED: 'border-rule-2 bg-surface-2 text-ink-2',
  BLOCKED: 'border-danger bg-danger-bg text-danger',
};

export function Activity() {
  const { state } = useApp();
  // One ledger: this demo's payments and the ones from before it started.
  const items = historyAndTransfers(state);

  return (
    <AppShell persona="margaret" title="Your payments">
      <div className="w-full space-y-6">
        <div className="mx-auto max-w-[46rem]">
          <h2 className="text-2xl">{COPY.sender.recentPayments}</h2>
          <p className="mt-1 text-ink-2">Newest first.</p>
        </div>
        {items.length === 0 ? (
          <div className="mx-auto max-w-[26rem]">
            <EmptyState title={COPY.empty.noTransfers}>
            <Link to="/m/send" className="link">
              Send your first payment
            </Link>
            </EmptyState>
          </div>
        ) : (
          /* One column, newest at the top, each payment directly under the
             last. A wrapping grid made the reading order depend on the window
             width, which is the one thing a statement must never do.
             `historyAndTransfers` has already sorted newest-first. */
          <ol className="relative mx-auto max-w-[46rem] space-y-4">
            {/* The rail carries the chronology visually; it is decorative, the
                dates below are the real answer. */}
            <span
              aria-hidden="true"
              className="absolute bottom-3 left-[7px] top-3 w-[2px] bg-rule"
            />
            {items.map((item, index) => (
              <li key={`${item.kind}-${item.id}`} className="relative pl-8">
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-[22px] h-4 w-4 rounded-full border-2 border-surface
                              ${index === 0 ? 'bg-ok-dot' : 'bg-rule-2'}`}
                />
                {item.kind === 'transfer' ? (
                  <div className="card">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <Link to={`/m/transfer/${item.id}`} className="link text-xl">
                        <Money cents={item.amountCents} /> to {item.payeeName}
                      </Link>
                      <span
                        className={`rounded-full border-[1.5px] px-3 py-1 text-base font-semibold ${
                          CHIP[item.transfer.state]
                        }`}
                      >
                        {COPY.states[item.transfer.state]}
                      </span>
                    </div>
                    <p className="mt-1 text-ink-3">{formatDateTime(item.at)}</p>
                    <p className="mt-1 max-w-[62ch]">“{item.transfer.reasonText}”</p>
                  </div>
                ) : (
                  /* Before this demo started: no state, because nothing is pending. */
                  <div className="card">
                    <p className="text-xl font-semibold">
                      <Money cents={item.amountCents} /> to {item.payeeName}
                    </p>
                    <p className="mt-1 text-ink-3">
                      {formatDateTime(item.at)} · {formatRelative(item.at)}
                    </p>
                    <p className="mt-1 max-w-[62ch]">{item.history.description}</p>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  );
}
