import { COPY } from '../copy';
import { Link } from 'react-router-dom';

/** Shown to both parties after a scam rejection. Scammers escalate after a block. */
export function AftermathCard({ showReportLink = true }: { showReportLink?: boolean }) {
  return (
    /* `card-high`, not `card-attend`: amber means "this needs a person" and
       something is already waiting. This card is the register past that — the
       scam did not end when the payment was stopped, and the next call is the
       one to be ready for. */
    <section className="card-high" aria-labelledby="aftermath-heading">
      <h2 id="aftermath-heading" className="text-xl font-bold text-high">
        {COPY.aftermath.heading}
      </h2>
      <ul className="mt-3 space-y-2 text-ink">
        {COPY.aftermath.points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
      {showReportLink ? (
        <Link to="/m/report" className="link mt-3 inline-block">
          How to report a concern
        </Link>
      ) : null}
    </section>
  );
}
