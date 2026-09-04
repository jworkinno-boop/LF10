import { lookupCop, normaliseIban } from '../data/mockCopDirectory';
import { id } from '../ids';
import type { Payee } from '../types';

/**
 * Turn a typed-in name/IBAN into a full Payee, including the mock
 * Confirmation-of-Payee result. Ad-hoc payees are `new` and unsaved.
 */
export function materialisePayee(args: {
  displayName: string;
  iban: string;
  countryCode: string;
  addedAt: string;
  isSaved?: boolean;
}): Payee {
  const cop = lookupCop(args.iban);
  return {
    id: id('payee'),
    displayName: args.displayName.trim(),
    iban: normaliseIban(args.iban),
    countryCode: args.countryCode.toUpperCase(),
    status: 'new',
    isSaved: args.isSaved ?? false,
    addedAt: args.addedAt,
    timesPaid: 0,
    copResult: cop.result,
    copNameOnAccount: cop.nameOnAccount,
  };
}

/** Country implied by an IBAN prefix, falling back to the given default. */
export function countryFromIban(iban: string, fallback = 'NL'): string {
  const normalised = normaliseIban(iban);
  const prefix = normalised.slice(0, 2);
  return /^[A-Z]{2}$/.test(prefix) ? prefix : fallback;
}
