import type { ReactNode } from 'react';
import { now, parse } from '../clock';
import { formatCountdown } from '../format';

// The cooling-off ring (handoff §9.2, direction 1h). This is the one place in
// the product worth spending motion on: the payment is already approved and
// the only thing between it and the account is a wait she can still interrupt.
// A line of text saying "29 min" does not convey a thing that is running out.
//
// The demo clock is frozen, so there is deliberately no interval here — the
// ring is a pure function of `now()` and re-renders with the provider's
// existing 15-second MATERIALISE tick, or the moment the demo clock is
// advanced. A one-second timer would spin for nothing.

const SIZE = 200;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function HoldCountdown({
  holdUntil,
  startedAt,
  totalMinutes,
  children,
}: {
  holdUntil: string;
  /** When the wait began — the approval. Falls back to `totalMinutes` before the end. */
  startedAt?: string;
  totalMinutes: number;
  /** The cancel action. It sits directly beneath the ring, by design. */
  children?: ReactNode;
}) {
  const end = parse(holdUntil);
  const start = startedAt ? parse(startedAt) : end - totalMinutes * 60_000;
  const span = Math.max(1, end - start);
  const remaining = Math.max(0, end - now());
  // Sweeps from full to empty as the wait runs down.
  const fraction = Math.min(1, Math.max(0, remaining / span));

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          {/* Twelve o'clock start, running clockwise, like every other clock. */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              className="stroke-rule"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
              /* Amber: this is the "needs a person" stack, and she is the
                 person. The transition is what makes it a sweep rather than a
                 jump; prefers-reduced-motion removes it globally. */
              className="stroke-attend transition-[stroke-dashoffset] duration-700 ease-linear"
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-[34px] leading-none">
            {formatCountdown(holdUntil)}
          </span>
          <span className="mt-2 text-base text-ink-2">until it goes</span>
        </div>
      </div>
      {children}
    </div>
  );
}
