import { COPY } from '../copy';
import { formatDateTime } from '../format';
import type { AuditEntry, Transfer, TransferState } from '../types';

const PLAIN: Record<string, string> = {
  created: 'You started this payment',
  approved: 'David approved it',
  rejected: 'David stopped it',
  asked_question: 'David asked a question',
  answered_question: 'You replied',
  cancelled: 'It was cancelled',
  hold_elapsed: 'The short wait finished and it was sent',
  expired: 'Nobody decided in time, so it expired',
};

/** How the last node reads: still running, finished well, or stopped. */
function endTone(state: TransferState): 'live' | 'settled' | 'stopped' {
  switch (state) {
    case 'PENDING_APPROVAL':
    case 'INFO_REQUESTED':
    case 'APPROVED_HOLD':
      return 'live';
    case 'SENT':
      return 'settled';
    default:
      return 'stopped';
  }
}

/**
 * A payment's own history (handoff §1.1: "What has happened" is not a
 * destination, it is part of each payment). Steps that happened are green
 * because they are settled; the one still running is amber and breathes.
 */
export function Timeline({ transfer, entries }: { transfer: Transfer; entries: AuditEntry[] }) {
  const relevant = entries
    .filter((e) => e.transferId === transfer.id)
    .sort((a, b) => a.seq - b.seq);

  const tone = endTone(transfer.state);
  const endDot =
    tone === 'live'
      ? 'bg-attend motion-safe:animate-breathe'
      : tone === 'settled'
        ? 'bg-ok'
        : 'bg-danger';

  return (
    <ol className="space-y-0">
      {relevant.map((entry, index) => (
        <li key={entry.id} className="flex gap-4">
          {/* The dot and the 2px connector that joins it to the next one. The
              connector is on every node but the last, which is why the "Now"
              node below is rendered separately rather than folded in. */}
          <div className="flex flex-col items-center" aria-hidden="true">
            <span className="mt-[7px] h-[14px] w-[14px] shrink-0 rounded-full bg-ok" />
            <span className="w-[2px] flex-1 bg-rule" />
          </div>
          <div className={index === relevant.length - 1 ? 'pb-5' : 'pb-6'}>
            <p className="font-semibold">
              {PLAIN[entry.action] ?? entry.action.replace(/_/g, ' ')}
            </p>
            <p className="text-ink-2">{formatDateTime(entry.timestamp)}</p>
            {entry.note ? <p className="mt-1">{entry.note}</p> : null}
          </div>
        </li>
      ))}
      <li className="flex gap-4">
        <div className="flex flex-col items-center" aria-hidden="true">
          <span className={`mt-[7px] h-[14px] w-[14px] shrink-0 rounded-full ${endDot}`} />
        </div>
        <p className="font-semibold">Now: {COPY.states[transfer.state]}</p>
      </li>
    </ol>
  );
}
