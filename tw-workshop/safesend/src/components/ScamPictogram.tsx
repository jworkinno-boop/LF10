import type { ScamPattern } from '../types';

/**
 * One line drawing per scam pattern, so the seven panels can be told apart at a
 * glance and recognised again later. Purely decorative: every panel carries the
 * pattern's title as real text right beside it, so these are `aria-hidden` and
 * add nothing for a screen reader.
 *
 * Deliberately NOT amber, green or orange. Those three carry fixed meanings in
 * this app ("needs a person", "settled", "ring them") and a decorative icon
 * must not borrow them. The brand teal has no state meaning, which is exactly
 * what makes it the right accent here.
 *
 * Drawn on a 24x24 grid with strokes only, so they stay crisp at any size and
 * follow `currentColor` into both themes.
 */

const PATHS: Record<ScamPattern, { title: string; paths: string[]; dots?: Array<[number, number]> }> = {
  // The "safe account": a vault, because that is what they claim to offer.
  courier: {
    title: 'the door of a safe',
    paths: ['M4 3.5h16A1.5 1.5 0 0 1 21.5 5v14A1.5 1.5 0 0 1 20 20.5H4A1.5 1.5 0 0 1 2.5 19V5A1.5 1.5 0 0 1 4 3.5Z',
            'M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z',
            // Four spokes on the handle: a plain dial and pointer read as a
            // power button instead of a safe.
            'M14.8 14.8 16 16', 'M9.2 14.8 8 16', 'M9.2 9.2 8 8', 'M14.8 9.2 16 8'],
    dots: [[12, 12]],
  },
  // Someone pretending to be an official: a badge on a lanyard.
  impersonation: {
    title: 'an identity badge',
    paths: ['M6 5.5h12A1.5 1.5 0 0 1 19.5 7v13A1.5 1.5 0 0 1 18 21.5H6A1.5 1.5 0 0 1 4.5 20V7A1.5 1.5 0 0 1 6 5.5Z',
            // A clip above the card, not a lanyard: the V collided with the head.
            'M10.6 2.5h2.8a.8.8 0 0 1 .8.8v2.2h-4.4V3.3a.8.8 0 0 1 .8-.8Z',
            'M12 9.9a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z',
            // sweep=1 left-to-right bows the shoulders up. sweep=0 frowns.
            'M8.2 19.2a3.8 3.8 0 0 1 7.6 0'],
  },
  // The computer support call: a screen shouting at you.
  techSupport: {
    title: 'a screen showing a warning',
    paths: ['M4 4.5h16A1.5 1.5 0 0 1 21.5 6v9A1.5 1.5 0 0 1 20 16.5H4A1.5 1.5 0 0 1 2.5 15V6A1.5 1.5 0 0 1 4 4.5Z',
            'M12 16.5v3.5', 'M9 20h6', 'M12 7.6v3.6'],
    dots: [[12, 13.4]],
  },
  // The too-good return: a line that only ever goes up.
  investment: {
    title: 'a chart climbing steeply',
    paths: ['M3.5 4.5V20h17', 'M6 16.5 10 12.5l3 2 6-7', 'M14.6 8.5H19V13'],
  },
  // Pay a fee to get your prize: the prize.
  advanceFee: {
    title: 'a wrapped prize',
    paths: ['M3.5 9.5h17V20a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20V9.5Z',
            'M3 6.5h18v3H3v-3Z', 'M12 6.5v15',
            'M12 6.5C10.2 3.6 6.6 4 8 6.5', 'M12 6.5C13.8 3.6 17.4 4 16 6.5'],
  },
  // The online friend who needs money: affection, at a distance.
  romance: {
    title: 'a heart in a message bubble',
    paths: ['M5 3.5h14A2.5 2.5 0 0 1 21.5 6v8A2.5 2.5 0 0 1 19 16.5H5A2.5 2.5 0 0 1 2.5 14V6A2.5 2.5 0 0 1 5 3.5Z',
            'M8 16.5v4.5l4.5-4.5',
            'M12 13.4c-3-2.1-4-3.4-4-4.8a2.2 2.2 0 0 1 4-1.3 2.2 2.2 0 0 1 4 1.3c0 1.4-1 2.7-4 4.8Z'],
  },
  // The changed bank details: the old number crossed out, a new one under it.
  invoiceRedirect: {
    title: 'an invoice whose payment is diverted elsewhere',
    paths: ['M5.5 2.5h6L15 6V17.5A1.5 1.5 0 0 1 13.5 19h-8A1.5 1.5 0 0 1 4 17.5V4A1.5 1.5 0 0 1 5.5 2.5Z',
            'M11.5 2.5V6H15', 'M7 9.5h5', 'M7 12.5h4',
            // The payment leaves the invoice and turns off course.
            'M15.5 14.5h3a1.5 1.5 0 0 1 1.5 1.5v3', 'M18.6 17.4 20 18.8l1.4-1.4'],
  },
};

export function ScamPictogram({
  pattern,
  className = 'border-rule bg-surface-2 text-brand-2',
  size = 'h-11 w-11',
}: {
  pattern: ScamPattern;
  /** Plate colours, so a prominent panel can recolour it. */
  className?: string;
  size?: string;
}) {
  const spec = PATHS[pattern];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border ${size} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[62%] w-[62%]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        {spec.paths.map((d) => (
          <path key={d} d={d} />
        ))}
        {spec.dots?.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={0.55} fill="currentColor" stroke="none" />
        ))}
      </svg>
    </span>
  );
}
