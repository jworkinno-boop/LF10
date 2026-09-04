import { formatMoney } from '../format';

/** The only way money is rendered. Integer cents in, en-GB EUR out. */
export function Money({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={className} translate="no">
      {formatMoney(cents)}
    </span>
  );
}
