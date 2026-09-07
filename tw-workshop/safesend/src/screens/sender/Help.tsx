import { Link } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { ScamExplainer } from '../../components/ScamExplainer';
import { COPY } from '../../copy';
import { PATTERN_PRIORITY } from '../../risk/scamPatterns';

export function Help() {
  return (
    <AppShell persona="margaret" title={COPY.sender.isThisAScam}>
      <div className="w-full space-y-6">
        <h2 className="text-2xl">{COPY.sender.isThisAScam}</h2>
        <p className="mx-auto max-w-[62ch]">
          These are the tricks people use most often. None of them is your fault, and being asked
          does not mean you did anything wrong.
        </p>
        {/* Panels wrap across the available width and never stretch past a
            readable measure. */}
        <div className="grid items-start justify-center gap-4 grid-cols-[repeat(auto-fill,minmax(min(22rem,100%),30rem))]">
          {PATTERN_PRIORITY.map((pattern) => (
            <ScamExplainer key={pattern} pattern={pattern} />
          ))}
        </div>
        <div className="card mx-auto max-w-[34rem]">
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
