import { useState } from 'react';
import { AppShell } from '../../components/Layout';
import { EmptyState } from '../../components/EmptyState';
import { COPY } from '../../copy';
import { formatDateTime } from '../../format';
import { useApp } from '../../state/AppStateProvider';

const ACTORS = ['all', 'margaret', 'david', 'system'] as const;

export function AuditLog() {
  const { state } = useApp();
  const [actor, setActor] = useState<(typeof ACTORS)[number]>('all');
  const [query, setQuery] = useState('');

  const entries = [...state.audit]
    .sort((a, b) => b.seq - a.seq)
    .filter((entry) => (actor === 'all' ? true : entry.actor === actor))
    .filter((entry) =>
      query
        ? `${entry.action} ${entry.note ?? ''} ${entry.transferId ?? ''}`
            .toLowerCase()
            .includes(query.toLowerCase())
        : true,
    );

  const name = (value: string) =>
    value === 'margaret'
      ? COPY.people.sender.first
      : value === 'david'
        ? COPY.people.approver.first
        : 'SafeSend';

  return (
    <AppShell persona={state.activePersona} title="What has happened">
      <div className="space-y-5">
        <div>
          <h2 className="text-xl">Everything either of us has done</h2>
          <p className="mt-1 text-slate-700">
            Both people see exactly the same list. Entries are ordered by a sequence number, so two
            things in the same second cannot swap places.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="actor" className="block font-semibold">
              Who
            </label>
            <select
              id="actor"
              className="field mt-1"
              value={actor}
              onChange={(event) => setActor(event.target.value as (typeof ACTORS)[number])}
            >
              {ACTORS.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'Everyone' : name(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="search" className="block font-semibold">
              Search
            </label>
            <input
              id="search"
              className="field mt-1"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Reference, action or note"
            />
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState title={COPY.empty.noAudit} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <caption className="sr-only">Audit log</caption>
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th scope="col" className="py-2 pr-3">#</th>
                  <th scope="col" className="py-2 pr-3">When</th>
                  <th scope="col" className="py-2 pr-3">Who</th>
                  <th scope="col" className="py-2 pr-3">What</th>
                  <th scope="col" className="py-2 pr-3">Payment</th>
                  <th scope="col" className="py-2">Change</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-200 align-top">
                    <td className="py-2 pr-3 font-mono">{entry.seq}</td>
                    <td className="py-2 pr-3">{formatDateTime(entry.timestamp)}</td>
                    <td className="py-2 pr-3">{name(entry.actor)}</td>
                    <td className="py-2 pr-3">
                      {entry.action.replace(/_/g, ' ')}
                      {entry.note ? <span className="block text-slate-700">{entry.note}</span> : null}
                    </td>
                    <td className="py-2 pr-3 font-mono">{entry.transferId ?? '—'}</td>
                    <td className="py-2">
                      {entry.fromState || entry.toState
                        ? `${entry.fromState ?? '—'} → ${entry.toState ?? '—'}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
