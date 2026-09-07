import { useTheme } from '../theme';

/**
 * One switch: light or dark.
 *
 * `role="switch"` rather than a checkbox or two radios, because that is what a
 * single on/off control is, and it lets the accessible name stay the fixed
 * "Dark mode" while `aria-checked` carries the state — a label that flips
 * between "Dark mode"/"Light mode" makes a screen reader announce the thing
 * that just changed as if it were still a request.
 *
 * The app always starts light (see src/theme.tsx), so this switch is a plain
 * two-state control with no "match device" third option.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      // 52px tall like every other target in the app; the track itself is
      // smaller, so the padding is what carries the hit area.
      className={`group inline-flex min-h-[52px] items-center gap-[10px] rounded-ctl px-2
                  text-sm font-semibold text-ink-2 transition-colors hover:text-ink ${className}`}
    >
      <span className="whitespace-nowrap">Dark mode</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-[28px] w-[52px] shrink-0 items-center rounded-full
                    border-[1.5px] transition-colors
                    ${dark ? 'border-ok bg-ok' : 'border-rule-2 bg-surface-2'}`}
      >
        {/* The knob carries the sun/moon, so the state is not colour alone.
            Geometry: the track's 1.5px border leaves a 49x25 inner box, so a
            21px knob sits at 2px from whichever edge it is resting against. */}
        <span
          className={`absolute top-[2px] flex h-[21px] w-[21px] items-center justify-center
                      rounded-full text-[12px] leading-none transition-[left]
                      ${dark ? 'left-[26px] bg-on-ok text-ok' : 'left-[2px] bg-surface text-ink-2'}`}
        >
          {dark ? '☾' : '☀'}
        </span>
      </span>
    </button>
  );
}
