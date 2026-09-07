/** @type {import('tailwindcss').Config} */

// Every colour resolves through a CSS custom property so that one stylesheet
// (src/index.css) owns both themes and no component needs a `dark:` variant.
// The vars hold bare `R G B` triples, which is what lets Tailwind keep working
// with opacity modifiers such as `bg-ok/10`.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

// Self-hosted variable font; see the @font-face block at the top of
// src/index.css. The fallbacks are real stacks, not decoration: the woff2
// covers latin and latin-ext, so symbols outside those ranges come from here.
const DM_SANS = [
  '"DM Sans Variable"',
  'system-ui',
  '-apple-system',
  'Segoe UI',
  'Roboto',
  'Helvetica',
  'Arial',
  'sans-serif',
];

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Themes are driven by `data-theme` on <html>, set before first paint by the
  // inline script in index.html. `dark:` is available for the rare case where a
  // token cannot express the difference.
  darkMode: ['variant', ':is([data-theme="dark"] &)'],
  theme: {
    extend: {
      // Semantic, not colour names: the same classes survive a palette change.
      colors: {
        paper: token('paper'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        'ink-3': token('ink-3'),
        rule: token('rule'),
        'rule-2': token('rule-2'),

        // Trustpay brand: deep indigo, teal, green.
        brand: token('brand'),
        'brand-2': token('brand-2'),
        'brand-3': token('brand-3'),

        // settled · protected · go
        ok: token('ok'),
        'ok-ink': token('ok-ink'),
        'ok-2': token('ok-2'),
        'ok-dot': token('ok-dot'), // indicators and dots ONLY, never text
        'ok-bg': token('ok-bg'),
        'ok-border': token('ok-border'),
        'ok-hover': token('ok-hover'),
        'ok-soft': token('ok-soft'),
        'ok-soft-ink': token('ok-soft-ink'),
        // Text drawn on a filled `ok` surface. White in light mode, near-black
        // in dark mode — which is why `text-white` must not be used on buttons.
        'on-ok': token('on-ok'),

        // needs a person
        attend: token('attend'),
        'attend-bg': token('attend-bg'),
        'attend-border': token('attend-border'),

        // one step past "needs a person": ring them
        high: token('high'),
        'high-bg': token('high-bg'),
        'high-border': token('high-border'),

        danger: token('danger'),
        'danger-bg': token('danger-bg'),
        'danger-border': token('danger-border'),

        link: token('link'),
        'link-hover': token('link-hover'),
      },
      fontFamily: {
        // DM Sans throughout. `display` is kept as a separate token, pointing at
        // the same family, so headings and figures can be given their own face
        // again later without touching every component.
        sans: DM_SANS,
        display: DM_SANS,
      },
      borderRadius: { card: '12px', ctl: '10px' },
      boxShadow: {
        card: '0 1px 2px var(--c-shadow), 0 1px 12px -6px var(--c-shadow)',
        lift: '0 2px 4px var(--c-shadow), 0 12px 28px -12px var(--c-shadow)',
      },
      backgroundImage: {
        // The brand gradient, used sparingly: hero wash and the header rule.
        'brand-sweep': 'linear-gradient(96deg, var(--c-brand-grad-a), var(--c-brand-grad-b), var(--c-brand-grad-c))',
      },
    },
  },
  plugins: [],
};
