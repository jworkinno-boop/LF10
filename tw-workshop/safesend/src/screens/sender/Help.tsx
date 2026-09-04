import { Link } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { ScamExplainer } from '../../components/ScamExplainer';
import { COPY } from '../../copy';
import { PATTERN_PRIORITY } from '../../risk/scamPatterns';

export function Help() {
  return (
    <AppShell persona="margaret" title={COPY.sender.isThisAScam}>
      <div className="mx-auto max-w-2xl space-y-6">
        <h2 className="text-2xl">{COPY.sender.isThisAScam}</h2>
        <p>
          These are the tricks people use most often. None of them is your fault, and being asked
          does not mean you did anything wrong.
        </p>
        <div className="space-y-4">
          {PATTERN_PRIORITY.map((pattern) => (
            <ScamExplainer key={pattern} pattern={pattern} />
          ))}
        </div>
        <div className="card">
          <p className="text-lg font-semibold">Worried about a payment right now?</p>
          <p className="mt-2">
            Stop. Nothing has to happen this minute. Ring {COPY.people.approver.first} on a number
            you already have, or read{' '}
            <Link to="/m/report" className="link">
              how to report a concern
            </Link>
            .
          </p>
        </div>
      </div>
    </AppShell>
  );
}
