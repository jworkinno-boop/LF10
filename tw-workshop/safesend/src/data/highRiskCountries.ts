// A fictional demo list. It exists to exercise R12 and is NOT a statement about
// any real country's fraud risk.
export const HIGH_RISK_COUNTRIES: string[] = ['XA', 'XB', 'XC'];

/** Display names for the demo-only country codes plus the ordinary ones we seed. */
export const COUNTRY_NAMES: Record<string, string> = {
  NL: 'Netherlands',
  DE: 'Germany',
  ES: 'Spain',
  FR: 'France',
  BE: 'Belgium',
  IE: 'Ireland',
  XA: 'Demoland A (demo high-risk)',
  XB: 'Demoland B (demo high-risk)',
  XC: 'Demoland C (demo high-risk)',
};

export const SELECTABLE_COUNTRIES = ['NL', 'BE', 'DE', 'FR', 'ES', 'IE', 'XA'];
