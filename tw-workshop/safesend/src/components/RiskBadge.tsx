import { COPY } from '../copy';
import type { RiskBand } from '../types';

// Never colour alone: every band carries an icon AND a text label.
// The border is the text colour, and every band keeps its icon and label so
// colour is never alone. LOW shares the green that means "settled", because
// "looks normal" is the settled state.
const STYLES: Record<RiskBand, string> = {
  LOW: 'border-ok bg-ok-bg text-ok',
  MEDIUM: 'border-attend bg-attend-bg text-attend',
  HIGH: 'border-high bg-high-bg text-high',
  CRITICAL: 'border-danger bg-danger-bg text-danger',
};

export function RiskBadge({ band, className = '' }: { band: RiskBand; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border-[1.5px] px-3 py-1 text-base font-bold ${STYLES[band]} ${className}`}
    >
      <span aria-hidden="true">{COPY.risk.bandIcon[band]}</span>
      <span>{COPY.risk.bandLabel[band]}</span>
    </span>
  );
}

export const BAND_PANEL_STYLES = STYLES;
