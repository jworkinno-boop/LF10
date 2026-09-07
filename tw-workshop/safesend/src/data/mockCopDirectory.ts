// Mock Confirmation of Payee. Keyed by normalised IBAN.
// Unknown IBANs return `unavailable`, never `match`:
// absence of evidence is not evidence of safety.

import type { CopResult } from '../types';

export type CopRecord = { result: CopResult; nameOnAccount?: string };

export function normaliseIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

const DIRECTORY: Record<string, CopRecord> = {
  NL00DEMO00123456: { result: 'match', nameOnAccount: 'Margaret Whitfield' },
  NL00DEMO99001122: { result: 'match', nameOnAccount: 'Northgate Energy' },
  NL00DEMO00887711: { result: 'match', nameOnAccount: 'David Whitfield' },
  NL00DEMO44556677: { result: 'match', nameOnAccount: "Clara's Pharmacy" },
  NL00DEMO33221100: { result: 'match', nameOnAccount: 'Rosewood Garden Care' },
  NL00DEMO77445566: { result: 'match', nameOnAccount: 'Meadowlark Insurance (demo)' },
  // Scenario 3 — a legitimate new tradesperson whose bank does answer.
  NL00DEMO61200034: { result: 'match', nameOnAccount: 'Van Dijk Roofing' },
  // Scenario 4 — courier / "safe account". The name is close but not identical.
  DE00DEMO55667788: { result: 'close_match', nameOnAccount: 'R. Klein' },
  // Scenario 6 — invoice redirect. Right company name, wrong account.
  NL00DEMO12349876: { result: 'no_match', nameOnAccount: 'A. Petrov' },
  // Scenario 5 — romance, account abroad.
  XA00DEMO90011223: { result: 'unavailable' },
};

export function lookupCop(iban: string): CopRecord {
  return DIRECTORY[normaliseIban(iban)] ?? { result: 'unavailable' };
}

export function copLabel(result: CopResult): string {
  switch (result) {
    case 'match':
      return 'Name matches the account';
    case 'close_match':
      return 'Name is similar, but not the same';
    case 'no_match':
      return 'A different name is on this account';
    case 'unavailable':
      return 'Their bank did not answer the name check';
  }
}
