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
// honest payment gets an approval request, not a scam warning.

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

  const overThreshold = input.amountCents > ctx.settings.approvalThresholdCents;
  const dailyLimitHit = additive.some((h) => h.ruleId === 'R18');
  const isNewPayee = input.payee.timesPaid === 0;
  const isCrossBorder = input.payee.countryCode !== ctx.accountCountry;

  const requiresApproval =
    band !== 'LOW' ||
    overThreshold ||
    dailyLimitHit ||
    (ctx.settings.alwaysApproveNewPayees && isNewPayee) ||
    (ctx.settings.alwaysApproveCrossBorder && isCrossBorder);

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
