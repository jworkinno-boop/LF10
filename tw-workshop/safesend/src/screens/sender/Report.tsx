import { Link } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { COPY } from '../../copy';
import { CONFIG } from '../../config';

export function Report() {
  return (
    <AppShell persona="margaret" title={COPY.report.heading}>
      <div className="mx-auto w-full max-w-2xl space-y-6 lg:max-w-3xl">
        <h2 className="text-2xl">{COPY.report.heading}</h2>
        <p>{COPY.report.intro}</p>
        <ol className="space-y-3">
          {COPY.report.steps.map((step, index) => (
            <li key={step} className="card flex gap-3">
              <span className="text-xl font-bold text-ink">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="rounded-card border-2 border-attend-border bg-attend-bg p-4">
          <p className="font-semibold">{COPY.report.placeholderNote}</p>
          <p className="mt-2 text-sm">
            Demo contact details only: {CONFIG.bankName}, {CONFIG.appDomain}.
          </p>
        </div>
        <Link to="/m/help" className="link">
          Read about common scams
        </Link>
      </div>
    </AppShell>
  );
}
