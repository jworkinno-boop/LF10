// The additive rule table. Every rule is a pure function of (input, ctx).
// Plain language is written for the sender: <= 18 words, no jargon, no blame.

import { CONFIG } from '../config';
import { DAY_MS, localHour, parse } from '../clock';
import { formatMoney } from '../format';
import { HIGH_RISK_COUNTRIES } from '../data/highRiskCountries';
import { matchTierA, matchTierB } from './keywords';
import {
  amountsPaidToPayee,
  largest,
  median,
  patternAmounts,
  reasonCorpus,
  recentRejection,
  rolling24hTotal,
  transfersToPayeeIn24h,
  type RiskContext,
  type RiskInput,
} from './context';

export type RuleGroup = 'circumstantial' | 'behavioural';

export type RuleHit = {
  ruleId: string;
  points: number;
  plainLanguage: string;
  technical: string;
  group: RuleGroup;
};

type Rule = (input: RiskInput, ctx: RiskContext) => RuleHit | RuleHit[] | null;

const circ = (
  ruleId: string,
  points: number,
  plainLanguage: string,
  technical: string,
): RuleHit => ({ ruleId, points, plainLanguage, technical, group: 'circumstantial' });

const behav = (
  ruleId: string,
  points: number,
  plainLanguage: string,
  technical: string,
): RuleHit => ({ ruleId, points, plainLanguage, technical, group: 'behavioural' });

export const R01: Rule = (input) =>
  input.payee.timesPaid === 0
    ? circ(
        'R01',
        20,
        'This is your first payment to this person.',
        'Payee has never been paid before (timesPaid = 0).',
      )
    : null;

export const R02: Rule = (input, ctx) =>
  ctx.nowMs - parse(input.payee.addedAt) < 7 * DAY_MS
    ? circ(
        'R02',
        10,
        'This person was added to your address book very recently.',
        'Payee added less than 7 days ago.',
      )
    : null;

export const R03: Rule = (input, ctx) =>
  input.amountCents > ctx.settings.approvalThresholdCents
    ? circ(
        'R03',
        15,
        `This is above the amount you and David agreed to check together.`,
        `Amount above approval threshold (${formatMoney(ctx.settings.approvalThresholdCents)}).`,
      )
    : null;

export const R04: Rule = (input, ctx) => {
  const amounts = patternAmounts(ctx, input.createdAtMs);
  if (amounts.length === 0) return null;
  const med = median(amounts);
  const max = largest(amounts);
  return input.amountCents > 3 * med && input.amountCents > max
    ? circ(
        'R04',
        15,
        'This is much larger than your usual payments.',
        `Amount ${formatMoney(input.amountCents)} > 3x 90-day median (${formatMoney(med)}) and > 90-day largest (${formatMoney(max)}). Baseline excludes the last 24h.`,
      )
    : null;
};

export const R05: Rule = (input, ctx) =>
  ctx.balanceCents > 0 && input.amountCents >= 0.6 * ctx.balanceCents
    ? circ(
        'R05',
        20,
        'This would use up most of the money in your account.',
        `Amount is >= 60% of the current balance (${formatMoney(ctx.balanceCents)}).`,
      )
    : null;

export const R06: Rule = (input) => {
  const matches = matchTierA(reasonCorpus(input));
  if (matches.length === 0) return null;
  const points = Math.min(matches.length * 30, CONFIG.caps.tierAKeywords);
  return behav(
    'R06',
    points,
    'Your reason mentions something scammers very often say.',
    `Tier A keywords matched: ${matches.join(', ')} (${matches.length} x 30, capped at ${CONFIG.caps.tierAKeywords}).`,
  );
};

export const R07: Rule = (input) => {
  const matches = matchTierB(reasonCorpus(input));
  if (matches.length === 0) return null;
  const points = Math.min(matches.length * 15, CONFIG.caps.tierBKeywords);
  return behav(
    'R07',
    points,
    'Your reason mentions something worth a closer look.',
    `Tier B keywords matched: ${matches.join(', ')} (${matches.length} x 15, capped at ${CONFIG.caps.tierBKeywords}).`,
  );
};

export const R08: Rule = (input) =>
  input.reasonCategory === 'other' && input.reasonText.trim().length < CONFIG.vagueReasonChars
    ? circ(
        'R08',
        10,
        'A little more detail would help David understand this payment.',
        `Category "other" with fewer than ${CONFIG.vagueReasonChars} characters of detail.`,
      )
    : null;

export const R09: Rule = (input, ctx) => {
  const count = transfersToPayeeIn24h(ctx, input.payee, input.createdAtMs).length + 1;
  return count >= 3
    ? circ(
        'R09',
        15,
        'This is your third payment to this person today.',
        `${count} transfers to this payee in the rolling 24h window (including this one).`,
      )
    : null;
};

export const R10: Rule = (input) => {
  const hour = localHour(input.createdAtMs);
  return hour >= 0 && hour < 6
    ? circ(
        'R10',
        10,
        'This payment was started in the middle of the night.',
        `Created at local hour ${String(hour).padStart(2, '0')} (00:00-06:00).`,
      )
    : null;
};

export const R11: Rule = (input, ctx) =>
  input.payee.countryCode !== ctx.accountCountry
    ? circ(
        'R11',
        15,
        'This account is in another country.',
        `Payee country ${input.payee.countryCode} differs from account country ${ctx.accountCountry}.`,
      )
    : null;

export const R12: Rule = (input) =>
  HIGH_RISK_COUNTRIES.includes(input.payee.countryCode)
    ? circ(
        'R12',
        20,
        'Payments to this country are often used by scammers.',
        `Payee country ${input.payee.countryCode} is on the demo high-risk list.`,
      )
    : null;

export const R13: Rule = (input) => {
  const result = input.payee.copResult ?? 'unavailable';
  const onAccount = input.payee.copNameOnAccount;
  switch (result) {
    case 'no_match':
      return circ(
        'R13',
        25,
        'The name on this account is not the name you typed.',
        `Confirmation of Payee: no_match${onAccount ? ` (account name: ${onAccount})` : ''}.`,
      );
    case 'close_match':
      return circ(
        'R13',
        15,
        'The name on this account is close, but not the same.',
        `Confirmation of Payee: close_match${onAccount ? ` (account name: ${onAccount})` : ''}.`,
      );
    case 'unavailable':
      return circ(
        'R13',
        5,
        'We could not check the name on this account.',
        'Confirmation of Payee: unavailable (the receiving bank did not respond).',
      );
    default:
      return null;
  }
};

export const R14: Rule = (input) =>
  input.safetyAnswers.contactedFirst === true
    ? behav(
        'R14',
        20,
        'Someone contacted you first about this payment.',
        'Safety answer: contactedFirst = yes.',
      )
    : null;

export const R15: Rule = (input) =>
  input.safetyAnswers.askedToKeepSecretOrHurry === true
    ? behav(
        'R15',
        35,
        'You were asked to keep this secret or to hurry. That is a warning sign.',
        'Safety answer: askedToKeepSecretOrHurry = yes.',
      )
    : null;

export const R16: Rule = (input) =>
  input.safetyAnswers.verifiedOnKnownNumber === false
    ? behav(
        'R16',
        15,
        'You have not spoken to them on a number you already had.',
        'Safety answer: verifiedOnKnownNumber = no.',
      )
    : null;

export const R17: Rule = (input) =>
  input.amountCents >= 100_000 && input.amountCents % 50_000 === 0
    ? circ(
        'R17',
        5,
        'This is a large, exactly round amount.',
        'Round amount: multiple of EUR 500 and at least EUR 1,000.',
      )
    : null;

export const R18: Rule = (input, ctx) => {
  const total = rolling24hTotal(ctx, input.createdAtMs) + input.amountCents;
  return total > ctx.settings.dailyLimitCents
    ? circ(
        'R18',
        20,
        'Together with today’s other payments, this goes over your daily amount.',
        `Rolling 24h total ${formatMoney(total)} exceeds the daily limit ${formatMoney(ctx.settings.dailyLimitCents)}. Forces approval; never a hard block.`,
      )
    : null;
};

export const R19: Rule = (input, ctx) => {
  const rejected = recentRejection(ctx, input.payee, input.createdAtMs);
  return rejected
    ? behav(
        'R19',
        20,
        'David stopped a payment to this person very recently.',
        `Payee was rejected within the last ${CONFIG.rejectionWindowHours}h (transfer ${rejected.id}, reason: ${rejected.approval?.rejectionReason ?? 'n/a'}).`,
      )
    : null;
};

export const ADDITIVE_RULES: Rule[] = [
  R01, R02, R03, R04, R05, R06, R07, R08, R09, R10,
  R11, R12, R13, R14, R15, R16, R17, R18, R19,
];

/** Applies the Tier A / Tier B combined cap of 55 across R06 + R07. */
export function applyKeywordCombinedCap(hits: RuleHit[]): RuleHit[] {
  const a = hits.find((h) => h.ruleId === 'R06');
  const b = hits.find((h) => h.ruleId === 'R07');
  if (!a || !b) return hits;
  const total = a.points + b.points;
  if (total <= CONFIG.caps.keywordsCombined) return hits;
  const overflow = total - CONFIG.caps.keywordsCombined;
  const reducedB = Math.max(0, b.points - overflow);
  const stillOver = overflow - (b.points - reducedB);
  return hits.map((h) => {
    if (h.ruleId === 'R07') {
      return {
        ...h,
        points: reducedB,
        technical: `${h.technical} Reduced by the combined keyword cap (${CONFIG.caps.keywordsCombined}).`,
      };
    }
    if (h.ruleId === 'R06' && stillOver > 0) {
      return { ...h, points: Math.max(0, h.points - stillOver) };
    }
    return h;
  });
}

export function evaluateAdditive(input: RiskInput, ctx: RiskContext): RuleHit[] {
  const hits: RuleHit[] = [];
  for (const rule of ADDITIVE_RULES) {
    const result = rule(input, ctx);
    if (!result) continue;
    if (Array.isArray(result)) hits.push(...result);
    else hits.push(result);
  }
  return applyKeywordCombinedCap(hits).filter((h) => h.points !== 0);
}

export { amountsPaidToPayee };
