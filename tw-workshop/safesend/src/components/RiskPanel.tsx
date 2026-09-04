import { useEffect, useRef, useState } from 'react';
import { COPY } from '../copy';
import { senderReassurances, senderReasons } from '../risk/assessRisk';
import { RiskBadge, BAND_PANEL_STYLES } from './RiskBadge';
import type { RiskAssessment } from '../types';

/**
 * The sender's view. It never shows the numeric score: "100/100" is meaningless
 * to her and reads as a judgement of her, not of the payment.
 *
 * Announcements are polite (assertive interrupts mid-sentence), fire only on a
 * band change, are debounced 500ms, and focus moves to the heading on reveal.
 */
export function SenderRiskPanel({
  assessment,
  autoFocus = true,
}: {
  assessment: RiskAssessment;
  autoFocus?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const lastBand = useRef<string | null>(null);

  useEffect(() => {
    if (lastBand.current === assessment.band) return;
    lastBand.current = assessment.band;
    const timer = setTimeout(
      () => setAnnouncement(`${COPY.risk.senderHeading}: ${COPY.risk.bandLabel[assessment.band]}`),
      500,
    );
    return () => clearTimeout(timer);
  }, [assessment.band]);

  useEffect(() => {
    if (autoFocus) heading.current?.focus();
  }, [autoFocus]);

  const reasons = senderReasons(assessment);
  const reassurances = senderReassurances(assessment);

  return (
    <section
      className={`rounded-xl border-2 p-5 ${BAND_PANEL_STYLES[assessment.band]}`}
      aria-labelledby="risk-heading"
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="risk-heading" ref={heading} tabIndex={-1} className="text-2xl">
          {COPY.risk.senderHeading}
        </h2>
        <RiskBadge band={assessment.band} />
      </div>

      {reasons.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {reasons.map((reason) => (
            <li key={reason.ruleId} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{reason.plainLanguage}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4">{COPY.risk.noReasons}</p>
      )}

      {reassurances.length > 0 ? (
        <div className="mt-4 rounded-lg bg-white/70 p-3">
          <p className="font-semibold">What looked normal</p>
          <ul className="mt-1 space-y-1">
            {reassurances.map((reason) => (
              <li key={reason.ruleId}>{reason.plainLanguage}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 border-t border-current/20 pt-3 text-base">
        {COPY.app.riskDisclaimer}
      </p>
    </section>
  );
}

/** The approver's view: score, rule IDs and points, including gated mitigators. */
export function ApproverRiskPanel({ assessment }: { assessment: RiskAssessment }) {
  const applied = assessment.reasons.filter((r) => !r.gated);
  const gated = assessment.reasons.filter((r) => r.gated);

  return (
    <section className="card" aria-labelledby="risk-report-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="risk-report-heading">{COPY.risk.approverHeading}</h2>
        <div className="flex items-center gap-3">
          <RiskBadge band={assessment.band} />
          <span className="rounded bg-slate-900 px-2 py-1 font-mono text-sm text-white">
            {assessment.score}/100
          </span>
        </div>
      </div>

      <table className="mt-4 w-full text-left text-sm">
        <caption className="sr-only">Rules that contributed to this score</caption>
        <thead>
          <tr className="border-b border-slate-300 text-slate-700">
            <th scope="col" className="py-2 pr-2 font-semibold">Rule</th>
            <th scope="col" className="py-2 pr-2 font-semibold">Points</th>
            <th scope="col" className="py-2 font-semibold">Detail</th>
          </tr>
        </thead>
        <tbody>
          {applied.map((reason) => (
            <tr key={reason.ruleId} className="border-b border-slate-200 align-top">
              <td className="py-2 pr-2 font-mono">{reason.ruleId}</td>
              <td
                className={`py-2 pr-2 font-mono ${reason.points < 0 ? 'text-emerald-800' : 'text-slate-900'}`}
              >
                {reason.points > 0 ? `+${reason.points}` : reason.points}
              </td>
              <td className="py-2">{reason.technical}</td>
            </tr>
          ))}
          {applied.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-2 text-slate-700">
                No rules fired.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {gated.length > 0 ? (
        <div className="mt-4 rounded-lg border-2 border-slate-400 bg-slate-50 p-3">
          <p className="font-semibold">Mitigators calculated but ignored</p>
          <p className="mt-1 text-sm text-slate-700">
            Gated because {assessment.mitigatorGateReasons.join('; ')}.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {gated.map((reason) => (
              <li key={reason.ruleId} className="font-mono">
                <s>
                  {reason.ruleId} {reason.points}
                </s>{' '}
                <span className="font-sans">{reason.technical}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {assessment.circumstantialCapped ? (
        <p className="mt-3 text-sm text-slate-700">{COPY.risk.circumstantialCapped}</p>
      ) : null}

      <p className="mt-3 text-sm text-slate-700">
        Engine {assessment.engineVersion}. Assessed at submission and frozen since.
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800">{COPY.app.riskDisclaimer}</p>
    </section>
  );
}
