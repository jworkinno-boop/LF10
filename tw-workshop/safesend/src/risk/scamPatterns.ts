import type { ScamPattern } from '../types';
import { matchKeywords } from './keywords';
import { reasonCorpus, type RiskInput } from './context';

/** Highest priority first — the top match gets the prominent explainer. */
export const PATTERN_PRIORITY: ScamPattern[] = [
  'courier',
  'impersonation',
  'techSupport',
  'investment',
  'advanceFee',
  'romance',
  'invoiceRedirect',
];

const PATTERN_KEYWORDS: Record<ScamPattern, string[]> = {
  courier: ['safe account', 'bank security', 'fraud department', 'mule', 'arrest'],
  impersonation: [
    'fraud department', 'bank security', 'police', 'hmrc', 'tax refund',
    'microsoft support', 'arrest',
  ],
  techSupport: ['microsoft support', 'remote access', 'anydesk', 'teamviewer'],
  investment: [
    'crypto', 'bitcoin', 'ethereum', 'wallet', 'guaranteed return',
    'double your money', 'escrow',
  ],
  advanceFee: [
    'customs fee', 'release fee', 'lottery', 'prize', 'winnings', 'inheritance',
    'fee to receive', 'gift card', 'voucher', 'itunes', 'steam', 'google play',
  ],
  romance: ['met online', 'love', 'stuck abroad', 'hospital fee'],
  invoiceRedirect: ['new bank details', 'changed account'],
};

export function detectScamPatterns(input: RiskInput): ScamPattern[] {
  const text = reasonCorpus(input);
  const matched = new Set<ScamPattern>();

  for (const pattern of PATTERN_PRIORITY) {
    if (matchKeywords(text, PATTERN_KEYWORDS[pattern]).length > 0) matched.add(pattern);
  }

  // A name mismatch on an account you are told is an existing supplier is the
  // signature of an invoice redirect, with or without the wording.
  if (input.payee.copResult === 'no_match') matched.add('invoiceRedirect');

  return PATTERN_PRIORITY.filter((p) => matched.has(p));
}
