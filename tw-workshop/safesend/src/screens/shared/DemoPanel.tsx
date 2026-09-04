import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { Money } from '../../components/Money';
import { COPY } from '../../copy';
import { advance, DAY_MS, HOUR_MS, MINUTE_MS, now, reset as resetClock } from '../../clock';
import { formatDateTime } from '../../format';
import { iso } from '../../clock';
import { useApp } from '../../state/AppStateProvider';
import { clearState } from '../../state/persistence';
import { SCENARIOS } from '../../data/scenarios';

const JUMPS = [
  { label: '+5 minutes', ms: 5 * MINUTE_MS },
  { label: '+31 minutes (past a hold)', ms: 31 * MINUTE_MS },
  { label: '+2 hours', ms: 2 * HOUR_MS },
  { label: '+25 hours (past approval expiry)', ms: 25 * HOUR_MS },
  { label: '+3 days', ms: 3 * DAY_MS },
];

export function DemoPanel() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  return (
    <AppShell persona={state.activePersona} title="Demo controls">
      <div className="space-y-6">
        <section className="card">
          <h2 className="text-xl">Demo clock</h2>
          <p className="mt-1">Now: {formatDateTime(iso(now()))}</p>
          <p className="mt-1 text-sm text-slate-700">
            The clock is frozen so seeded data stays stable. Advancing it materialises holds,
            expiries and pending settings changes.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {JUMPS.map((jump) => (
              <button
                key={jump.label}
                type="button"
                className="btn-secondary"
                onClick={() => {
                  advance(jump.ms);
                  dispatch({ type: 'CLOCK_CHANGED', nowMs: now() });
                }}
              >
                {jump.label}
              </button>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                resetClock();
                dispatch({ type: 'CLOCK_CHANGED', nowMs: now() });
              }}
            >
              Reset the clock
            </button>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl">Scenarios</h2>
          <p className="mt-1 text-sm text-slate-700">
            Loading a scenario resets the demo and fills in a payment at step 5, ready to check.
          </p>
          <ul className="mt-3 space-y-3">
            {SCENARIOS.map((scenario) => (
              <li key={scenario.id} className="rounded-lg border border-slate-300 p-3">
                <p className="font-semibold">{scenario.title}</p>
                <p className="text-sm text-slate-700">{scenario.summary}</p>
                <p className="mt-1 text-sm">
                  <b>Expected:</b> {scenario.expected}
                </p>
                <button
                  type="button"
                  className="btn-primary mt-3"
                  onClick={() => {
                    dispatch({ type: 'LOAD_SCENARIO', scenarioId: scenario.id, nowMs: now() });
                    navigate('/m/send');
                  }}
                >
                  Load and open step 5
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="text-xl">State</h2>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="font-semibold">Balance</dt>
              <dd>
                <Money cents={state.accounts.margaret.balanceCents ?? 0} />
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Payments in this demo</dt>
              <dd>{state.transfers.length}</dd>
            </div>
            <div>
              <dt className="font-semibold">Audit entries</dt>
              <dd>{state.audit.length}</dd>
            </div>
            <div>
              <dt className="font-semibold">Revision (cross-tab sync)</dt>
              <dd>{state.revision}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                clearState();
                resetClock();
                dispatch({ type: 'RESET_DEMO' });
                navigate('/');
              }}
            >
              Reset the whole demo
            </button>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl">Switch person</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                dispatch({ type: 'UNLOCK', persona: 'margaret' });
                navigate('/m');
              }}
            >
              Open as {COPY.people.sender.first}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                dispatch({ type: 'UNLOCK', persona: 'david' });
                navigate('/d');
              }}
            >
              Open as {COPY.people.approver.first}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-700">
            On a single device the persona switcher is itself the bypass. Different PINs perform the
            separation between the two roles; they do not provide it. See NOTES.md.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
