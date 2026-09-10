// assessRisk is a pure function. Same inputs, same output, no side effects.
//
// Scoring model (see NOTES.md "Risk engine calibration"):
//   circumstantial = R01..R05, R08..R13, R17, R18      (what the payment looks like)
//   behavioural    = R06, R07, R14, R15, R16, R19      (what happened around it)
//
//   score = clamp(0, 100,
//             min(CIRC_CAP, max(0, circumstantial + mitigation)) + behavioural)
//
// Circumstantial evidence alone therefore never reaches HIGH: an unusual but
// honest payment gets a second look, not a scam warning — and a second look
// does not go to the approver unless the amount or the daily limit says so.

import { CONFIG } from '../config';
import { iso } from '../clock';
import type { RiskAssessment, RiskBand, RiskReason } from '../types';
import { evaluateAdditive, type RuleHit } from './rules';
import { evaluateMitigators, mitigatorGate } from './mitigators';
import { detectScamPatterns } from './scamPatterns';
import type { RiskContext, RiskInput } from './context';

export type { RiskContext, RiskInput } from './context';

export function bandForScore(score: number): RiskBand {
  if (score >= CONFIG.riskBands.CRITICAL.min) return 'CRITICAL';
  if (score >= CONFIG.riskBands.HIGH.min) return 'HIGH';
  if (score >= CONFIG.riskBands.MEDIUM.min) return 'MEDIUM';
  return 'LOW';
}

export const BAND_ORDER: RiskBand[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function bandRank(band: RiskBand): number {
  return BAND_ORDER.indexOf(band);
}

function toReason(hit: RuleHit, gated = false): RiskReason {
  return {
    ruleId: hit.ruleId,
    points: hit.points,
    plainLanguage: hit.plainLanguage,
    technical: hit.technical,
    ...(gated ? { gated: true } : {}),
  };
}

export function assessRisk(input: RiskInput, ctx: RiskContext): RiskAssessment {
  const additive = evaluateAdditive(input, ctx);
  const gate = mitigatorGate(input);
  const mitigators = evaluateMitigators(input, ctx);

  const circumstantial = additive
    .filter((h) => h.group === 'circumstantial')
    .reduce((sum, h) => sum + h.points, 0);
  const behavioural = additive
    .filter((h) => h.group === 'behavioural')
    .reduce((sum, h) => sum + h.points, 0);

  const rawMitigation = mitigators.reduce((sum, h) => sum + h.points, 0);
  const mitigation = gate.gated ? 0 : Math.max(rawMitigation, -CONFIG.caps.mitigation);

  const circNet = Math.max(0, circumstantial + mitigation);
  const circCapped = Math.min(CONFIG.caps.circumstantial, circNet);
  const score = Math.max(0, Math.min(100, circCapped + behavioural));
  const band = bandForScore(score);

  // Ordinary payments go straight out. David is only asked when the payment is
  // above the amount he and Margaret agreed to check, when it breaks the daily
  // limit, or when the engine actually finds it suspicious (HIGH or above).
  // MEDIUM is "worth a second look": Margaret is shown what stood out, and then
  // the payment is hers to send.
  const overThreshold = input.amountCents > ctx.settings.approvalThresholdCents;
  const dailyLimitHit = additive.some((h) => h.ruleId === 'R18');
  const suspicious = bandRank(band) >= bandRank('HIGH');

  const requiresApproval = overThreshold || dailyLimitHit || suspicious;

  const reasons: RiskReason[] = [
    ...additive.map((h) => toReason(h)),
    ...mitigators.map((h) => toReason(h, gate.gated)),
  ].sort((a, b) => Math.abs(b.points) - Math.abs(a.points));

  return {
    score,
    band,
    requiresApproval,
    coolingOffMinutes: band === 'CRITICAL' ? CONFIG.coolingOffMinutes : 0,
    reasons,
    matchedScamPatterns: detectScamPatterns(input),
    mitigatorsGated: gate.gated,
    mitigatorGateReasons: gate.reasons,
    circumstantialCapped: circNet > CONFIG.caps.circumstantial,
    assessedAt: iso(input.createdAtMs),
    engineVersion: CONFIG.engineVersion,
  };
}

/** Reasons the sender is allowed to see: no score, no rule IDs. */
export function senderReasons(assessment: RiskAssessment): RiskReason[] {
  return assessment.reasons.filter((r) => !r.gated && r.points > 0);
}

/** Positive-framing reasons for the sender ("this looked normal because…"). */
export function senderReassurances(assessment: RiskAssessment): RiskReason[] {
  return assessment.reasons.filter((r) => !r.gated && r.points < 0);
}

// --- Ranking the sender's reasons (handoff §5.5) -----------------------------
//
// Thirteen reasons in a flat list are a wall, and a wall is skimmed. Folding
// them into three named groups turns them into a story: what you were told,
// who got in touch, where the money would go. Nothing is removed — the result
// screen still offers every string behind a disclosure. This only ranks.
//
// Amount-and-pattern rules do not carry a story of their own, so they trail the
// third group as one sentence rather than earning a heading.

const GROUP_RULES: Record<SenderReasonGroupKey, readonly string[]> = {
  // What she was told, and what she wrote down because of it.
  told: ['R06', 'R07', 'R15', 'R08'],
  // Who opened the conversation, and whether she checked back on her own number.
  contact: ['R14', 'R16'],
  // Where the money would actually land.
  destination: ['R01', 'R02', 'R11', 'R12', 'R13', 'R17', 'R19'],
};

export type SenderReasonGroupKey = 'told' | 'contact' | 'destination';

export type SenderReasonGroup = {
  key: SenderReasonGroupKey;
  reasons: RiskReason[];
  /** Amount-and-pattern reasons, appended to the third group as a sentence. */
  trailing: RiskReason[];
};

/**
 * The sender's reasons, ranked into the three groups. Groups with nothing in
 * them are dropped, so a payment that only tripped one rule shows one heading
 * rather than three empty ones. Anything outside the named rule families lands
 * in the third group's trailing sentence, which is where the amount-and-pattern
 * rules (R03/R04/R05/R09/R10/R18) belong anyway.
 */
export function groupSenderReasons(assessment: RiskAssessment): SenderReasonGroup[] {
  const reasons = senderReasons(assessment);
  const groups: SenderReasonGroup[] = (
    ['told', 'contact', 'destination'] as SenderReasonGroupKey[]
  ).map((key) => ({
    key,
    reasons: reasons.filter((r) => GROUP_RULES[key].includes(r.ruleId)),
    trailing: [],
  }));

  const named = new Set(Object.values(GROUP_RULES).flat());
  const trailing = reasons.filter((r) => !named.has(r.ruleId));
  // The trailing sentence belongs to "where the money would go" — it is about
  // the shape of the payment, not about anyone she spoke to.
  groups[2].trailing = trailing;

  return groups.filter((g) => g.reasons.length > 0 || g.trailing.length > 0);
}
