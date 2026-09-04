import { COPY } from '../copy';
import type { ScamPattern } from '../types';

export function ScamExplainer({
  pattern,
  prominent = false,
}: {
  pattern: ScamPattern;
  prominent?: boolean;
}) {
  const content = COPY.scamPatterns[pattern];
  return (
    <section
      className={
        prominent
          ? 'rounded-xl border-2 border-red-700 bg-red-50 p-5 text-red-950'
          : 'rounded-xl border border-slate-300 bg-white p-4'
      }
      aria-labelledby={`scam-${pattern}`}
    >
      <h3 id={`scam-${pattern}`} className="text-xl font-bold">
        {content.title}
      </h3>
      <dl className="mt-3 space-y-2">
        <div>
          <dt className="font-semibold">How it starts</dt>
          <dd>{content.howItStarts}</dd>
        </div>
        <div>
          <dt className="font-semibold">What they say</dt>
          <dd>{content.whatTheySay}</dd>
        </div>
        <div>
          <dt className="font-semibold">What to do</dt>
          <dd>{content.whatToDo}</dd>
        </div>
      </dl>
    </section>
  );
}

export function ScamExplainerList({ patterns }: { patterns: ScamPattern[] }) {
  if (patterns.length === 0) return null;
  const [first, ...rest] = patterns;
  return (
    <div className="space-y-4">
      <ScamExplainer pattern={first} prominent />
      {rest.length > 0 ? (
        <details className="rounded-xl border border-slate-300 bg-white p-4">
          <summary className="cursor-pointer font-semibold">
            This also matches {rest.length} other pattern{rest.length === 1 ? '' : 's'}
          </summary>
          <div className="mt-3 space-y-3">
            {rest.map((pattern) => (
              <ScamExplainer key={pattern} pattern={pattern} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
