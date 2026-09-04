import { COPY } from '../copy';
import type { RiskBand } from '../types';

// Never colour alone: every band carries an icon AND a text label.
const STYLES: Record<RiskBand, string> = {
  LOW: 'border-emerald-700 bg-emerald-50 text-emerald-900',
  MEDIUM: 'border-amber-600 bg-amber-50 text-amber-900',
  HIGH: 'border-orange-700 bg-orange-50 text-orange-900',
  CRITICAL: 'border-red-700 bg-red-50 text-red-900',
};

export function RiskBadge({ band, className = '' }: { band: RiskBand; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-base font-bold ${STYLES[band]} ${className}`}
    >
      <span aria-hidden="true">{COPY.risk.bandIcon[band]}</span>
      <span>{COPY.risk.bandLabel[band]}</span>
    </span>
  );
}

export const BAND_PANEL_STYLES = STYLES;
