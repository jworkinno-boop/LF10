import { Link } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { Money } from '../../components/Money';
import { COPY } from '../../copy';
import { CONFIG } from '../../config';
import { formatDate } from '../../format';
import { useApp } from '../../state/AppStateProvider';

/**
 * The consent artefact. The brief calls this arrangement consent-based, so
 * consent exists here as a readable object in the product, not just a claim.
 */
export function Agreement() {
  const { state } = useApp();
  const active = state.contacts.filter((c) => c.active);

  return (
    <AppShell persona={state.activePersona} title={COPY.agreement.heading}>
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="card">
          <h2 className="text-2xl">{COPY.agreement.heading}</h2>
          <p className="mt-2">{COPY.agreement.intro}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-semibold">Made on</dt>
              <dd>{formatDate(state.agreementMadeAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Between</dt>
              <dd>
                {COPY.people.sender.full} ({COPY.roles.sender}) and{' '}
                {active.map((c) => c.name).join(', ') || 'nobody at the moment'} (
                {COPY.roles.approver})
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Payments checked above</dt>
              <dd>
                <Money cents={state.settings.approvalThresholdCents} />
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Daily amount</dt>
              <dd>
                <Money cents={state.settings.dailyLimitCents} />
              </dd>
            </div>
          </dl>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="card">
            <h3 className="text-xl font-bold">{COPY.people.sender.first} can</h3>
            <ul className="mt-2 space-y-2">
              {COPY.agreement.senderCan.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
            <h3 className="mt-4 text-xl font-bold">She cannot</h3>
            <ul className="mt-2 space-y-2">
              {COPY.agreement.senderCannot.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h3 className="text-xl font-bold">{COPY.people.approver.first} can</h3>
            <ul className="mt-2 space-y-2">
              {COPY.agreement.approverCan.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
            <h3 className="mt-4 text-xl font-bold">He cannot</h3>
            <ul className="mt-2 space-y-2">
              {COPY.agreement.approverCannot.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card">
          <h3 className="text-xl font-bold">Who can change what</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th scope="col" className="py-2 pr-3">Change</th>
                  <th scope="col" className="py-2 pr-3">Who can start it</th>
                  <th scope="col" className="py-2 pr-3">Delay</th>
                  <th scope="col" className="py-2">Who can cancel it</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Raise the checking amount', COPY.people.approver.first, '24 hours', 'Both'],
                  ['Lower the checking amount', 'Either', 'None', '—'],
                  ['Add a trusted payee', COPY.people.approver.first, '24 hours', `${COPY.people.sender.first} can undo it at any time`],
                  ['Change or remove the trusted contact', COPY.people.sender.first, '24 hours', `${COPY.people.sender.first} only`],
                  ['Add a second trusted contact', COPY.people.sender.first, '24 hours', `${COPY.people.sender.first} only`],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-slate-200">
                    {row.map((cell, index) => (
                      <td key={index} className="py-2 pr-3 align-top">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-slate-700">
            Protection can always be made stronger straight away, and weaker only after{' '}
            {CONFIG.settingsDelayHours} hours with both people told.
          </p>
        </section>

        <p>
          <Link to="/audit" className="link">
            Every action either of us has taken
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
