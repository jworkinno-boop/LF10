// Mitigating rules. These stop the engine crying wolf on ordinary life — but
// they are gated, so familiarity can never suppress a real scam signal.

import { CONFIG } from '../config';
import { DAY_MS, parse } from '../clock';
import { formatMoney } from '../format';
import { matchTierA } from './keywords';
import {
  amountsPaidToPayee,
  reasonCorpus,
  type RiskContext,
  type RiskInput,
} from './context';
import type { RuleHit } from './rules';

const mit = (
  ruleId: string,
  points: number,
  plainLanguage: string,
  technical: string,
): RuleHit => ({ ruleId, points, plainLanguage, technical, group: 'circumstantial' });

export function evaluateMitigators(input: RiskInput, ctx: RiskContext): RuleHit[] {
  const hits: RuleHit[] = [];

  // M01 — an established payee.
  if (input.payee.timesPaid >= 3) {
    hits.push(
      mit(
        'M01',
        -15,
        'You have paid this person several times before.',
        `Payee paid ${input.payee.timesPaid} times.`,
      ),
    );
  }

  // M02 — paid recently.
  if (input.payee.lastPaidAt) {
    const age = ctx.nowMs - parse(input.payee.lastPaidAt);
    if (age >= 0 && age <= CONFIG.patternWindowDays * DAY_MS) {
      hits.push(
        mit(
          'M02',
          -10,
          'You paid this person recently.',
          `Payee last paid within ${CONFIG.patternWindowDays} days.`,
        ),
      );
    }
  }

  // M03 — looks like a recurring amount for this payee.
  const previous = amountsPaidToPayee(ctx, input.payee);
  const recurring = previous.find(
    (amount) => Math.abs(amount - input.amountCents) <= 0.2 * amount,
  );
  if (recurring !== undefined) {
    hits.push(
      mit(
        'M03',
        -15,
        'This is about the same as what you usually pay them.',
        `Amount within +/-20% of a previous payment to this payee (${formatMoney(recurring)}).`,
      ),
    );
  }

  // M04 — all three safety answers reassuring.
  const a = input.safetyAnswers;
  if (
    a.contactedFirst === false &&
    a.askedToKeepSecretOrHurry === false &&
    a.verifiedOnKnownNumber === true
  ) {
    hits.push(
      mit(
        'M04',
        -10,
        'Your answers to the safety questions were reassuring.',
        'Safety answers: no / no / yes.',
      ),
    );
  }

  return hits;
}

export type MitigatorGate = { gated: boolean; reasons: string[] };

/**
 * Mitigators are ignored entirely when a real scam signal is present.
 * Without this, a compromised trusted payee or a coached sender gets their
 * score suppressed by familiarity.
 */
export function mitigatorGate(input: RiskInput): MitigatorGate {
  const reasons: string[] = [];
  if (matchTierA(reasonCorpus(input)).length > 0) {
    reasons.push('a high-risk phrase was used in the reason (R06)');
  }
  if (input.payee.copResult === 'no_match') {
    reasons.push('the name check on the account did not match (R13)');
  }
  if (input.safetyAnswers.askedToKeepSecretOrHurry === true) {
    reasons.push('the sender was asked to keep it secret or to hurry (R15)');
  }
  return { gated: reasons.length > 0, reasons };
}
