import { COPY } from '../copy';
import { formatDateTime } from '../format';
import type { AuditEntry, Transfer } from '../types';

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

export function Timeline({ transfer, entries }: { transfer: Transfer; entries: AuditEntry[] }) {
  const relevant = entries
    .filter((e) => e.transferId === transfer.id)
    .sort((a, b) => a.seq - b.seq);

  return (
    <ol className="space-y-3">
      {relevant.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <span aria-hidden="true" className="mt-2 h-3 w-3 shrink-0 rounded-full bg-blue-800" />
          <div>
            <p className="font-semibold">
              {PLAIN[entry.action] ?? entry.action.replace(/_/g, ' ')}
            </p>
            <p className="text-slate-700">{formatDateTime(entry.timestamp)}</p>
            {entry.note ? <p className="mt-1">{entry.note}</p> : null}
          </div>
        </li>
      ))}
      <li className="flex gap-3">
        <span aria-hidden="true" className="mt-2 h-3 w-3 shrink-0 rounded-full bg-slate-400" />
        <p className="font-semibold">Now: {COPY.states[transfer.state]}</p>
      </li>
    </ol>
  );
}
