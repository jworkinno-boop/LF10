import { describe, expect, it } from 'vitest';
import { assessRisk, bandForScore } from './assessRisk';
import { CONFIG } from '../config';
import { DAY_MS, HOUR_MS, iso } from '../clock';
import { ctx, input, NEUTRAL, newPayee, NOW, payee, REASSURING, ruleIds } from './testUtils';
import type { Transfer } from '../types';

function fired(assessment: ReturnType<typeof assessRisk>, ruleId: string) {
  return assessment.reasons.find((r) => r.ruleId === ruleId && !r.gated);
}

function transfer(overrides: Partial<Transfer>): Transfer {
  return {
    id: 'T1',
    createdAt: iso(NOW - HOUR_MS),
    createdBy: 'margaret',
    payee: payee('payee_garden'),
    amountCents: 48_000,
    currency: 'EUR',
    reasonCategory: 'repairs',
    reasonText: 'Garden work',
    safetyAnswers: REASSURING,
    risk: assessRisk(input(), ctx()),
    state: 'SENT',
    ...overrides,
  } as Transfer;
}

describe('additive rules', () => {
  it('R01 fires on a payee never paid before', () => {
    const a = assessRisk(input({ payee: newPayee() }), ctx());
    expect(fired(a, 'R01')?.points).toBe(20);
  });

  it('R02 fires on a payee added less than 7 days ago', () => {
    const a = assessRisk(
      input({ payee: { ...payee('payee_energy'), addedAt: iso(NOW - 2 * DAY_MS) } }),
      ctx(),
    );
    expect(fired(a, 'R02')?.points).toBe(10);
  });

  it('R02 does not fire on a long-standing payee', () => {
    expect(fired(assessRisk(input(), ctx()), 'R02')).toBeUndefined();
  });

  it('R03 fires above the approval threshold', () => {
    const a = assessRisk(input({ amountCents: 50_001 }), ctx());
    expect(fired(a, 'R03')?.points).toBe(15);
  });

  it('R04 fires above 3x median AND above the 90-day largest', () => {
    // median 8500, largest 34000
    expect(fired(assessRisk(input({ amountCents: 34_001 }), ctx()), 'R04')?.points).toBe(15);
    expect(fired(assessRisk(input({ amountCents: 33_999 }), ctx()), 'R04')).toBeUndefined();
    expect(fired(assessRisk(input({ amountCents: 20_000 }), ctx()), 'R04')).toBeUndefined();
  });

  it('R04 ignores the last 24 hours when building the baseline', () => {
    const recent = transfer({ id: 'T_recent', amountCents: 500_000, createdAt: iso(NOW - HOUR_MS) });
    const a = assessRisk(input({ amountCents: 48_000 }), ctx({ transfers: [recent] }));
    expect(fired(a, 'R04')?.points).toBe(15);
  });

  it('R05 fires at 60% of the balance', () => {
    const a = assessRisk(input({ amountCents: Math.ceil(0.6 * 1_482_055) }), ctx());
    expect(fired(a, 'R05')?.points).toBe(20);
  });

  it('R06 scores 30 per distinct Tier A keyword, capped at 40', () => {
    const one = assessRisk(input({ reasonText: 'Buying bitcoin for my son' }), ctx());
    expect(fired(one, 'R06')?.points).toBe(30);
    const many = assessRisk(
      input({ reasonText: 'Move to a safe account, the fraud department and the police said so' }),
      ctx(),
    );
    expect(fired(many, 'R06')?.points).toBe(CONFIG.caps.tierAKeywords);
  });

  it('R07 scores 15 per distinct Tier B keyword, capped at 25', () => {
    const one = assessRisk(input({ reasonText: 'This is urgent please' }), ctx());
    expect(fired(one, 'R07')?.points).toBe(15);
    const many = assessRisk(
      input({ reasonText: 'Urgent, an emergency, today only, do not tell anyone' }),
      ctx(),
    );
    expect(fired(many, 'R07')?.points).toBe(CONFIG.caps.tierBKeywords);
  });

  it('R06 + R07 are capped at 55 combined', () => {
    const a = assessRisk(
      input({
        reasonText:
          'Safe account, fraud department, police, arrest. Urgent, emergency, today only, do not tell.',
      }),
      ctx(),
    );
    const total = (fired(a, 'R06')?.points ?? 0) + (fired(a, 'R07')?.points ?? 0);
    expect(total).toBe(CONFIG.caps.keywordsCombined);
  });

  it('R08 fires on a vague "other" reason', () => {
    const a = assessRisk(input({ reasonCategory: 'other', reasonText: 'For Rob' }), ctx());
    expect(fired(a, 'R08')?.points).toBe(10);
    const b = assessRisk(
      input({ reasonCategory: 'other', reasonText: 'Repaying the money Rob lent me' }),
      ctx(),
    );
    expect(fired(b, 'R08')).toBeUndefined();
  });

  it('R09 fires on the third payment to the same payee in 24h', () => {
    const two = [
      transfer({ id: 'A', createdAt: iso(NOW - 3 * HOUR_MS) }),
      transfer({ id: 'B', createdAt: iso(NOW - HOUR_MS) }),
    ];
    const a = assessRisk(
      input({ payee: payee('payee_garden'), amountCents: 48_000 }),
      ctx({ transfers: two }),
    );
    expect(fired(a, 'R09')?.points).toBe(15);
  });

  it('R10 fires between midnight and 06:00 local time', () => {
    const nightMs = new Date('2026-09-03T03:15:00+02:00').getTime();
    const a = assessRisk(input({ createdAtMs: nightMs }), ctx({ nowMs: nightMs }));
    expect(fired(a, 'R10')?.points).toBe(10);
    expect(fired(assessRisk(input(), ctx()), 'R10')).toBeUndefined();
  });

  it('R11 fires on a cross-border payee', () => {
    const a = assessRisk(input({ payee: newPayee({ countryCode: 'DE' }) }), ctx());
    expect(fired(a, 'R11')?.points).toBe(15);
  });

  it('R12 fires on the demo high-risk list', () => {
    const a = assessRisk(input({ payee: newPayee({ countryCode: 'XA' }) }), ctx());
    expect(fired(a, 'R12')?.points).toBe(20);
  });

  it('R13 scores each Confirmation of Payee outcome', () => {
    const score = (copResult: 'match' | 'close_match' | 'no_match' | 'unavailable') =>
      fired(assessRisk(input({ payee: newPayee({ copResult }) }), ctx()), 'R13')?.points ?? 0;
    expect(score('no_match')).toBe(25);
    expect(score('close_match')).toBe(15);
    expect(score('unavailable')).toBe(5);
    expect(score('match')).toBe(0);
  });

  it('R14/R15/R16 score the safety answers', () => {
    const a = assessRisk(
      input({
        safetyAnswers: {
          contactedFirst: true,
          askedToKeepSecretOrHurry: true,
          verifiedOnKnownNumber: false,
        },
      }),
      ctx(),
    );
    expect(fired(a, 'R14')?.points).toBe(20);
    expect(fired(a, 'R15')?.points).toBe(35);
    expect(fired(a, 'R16')?.points).toBe(15);
  });

  it('R17 fires on round amounts of EUR 1,000 or more', () => {
    expect(fired(assessRisk(input({ amountCents: 150_000 }), ctx()), 'R17')?.points).toBe(5);
    expect(fired(assessRisk(input({ amountCents: 50_000 }), ctx()), 'R17')).toBeUndefined();
    expect(fired(assessRisk(input({ amountCents: 120_000 }), ctx()), 'R17')).toBeUndefined();
  });

  it('R18 fires when the rolling 24h total passes the daily limit', () => {
    const earlier = transfer({ id: 'C', amountCents: 90_000, createdAt: iso(NOW - 2 * HOUR_MS) });
    const a = assessRisk(
      input({ amountCents: 20_000, payee: payee('payee_pharmacy') }),
      ctx({ transfers: [earlier] }),
    );
    expect(fired(a, 'R18')?.points).toBe(20);
    expect(a.requiresApproval).toBe(true);
  });

  it('R18 forces approval but never blocks', () => {
    const earlier = transfer({ id: 'D', amountCents: 99_000, createdAt: iso(NOW - HOUR_MS) });
    const a = assessRisk(
      input({ amountCents: 5_000, payee: payee('payee_pharmacy') }),
      ctx({ transfers: [earlier] }),
    );
    expect(a.requiresApproval).toBe(true);
    expect(a.band).not.toBe('CRITICAL');
  });

  it('R19 fires on a payee rejected within 72 hours', () => {
    const rejected = transfer({
      id: 'E',
      state: 'REJECTED',
      payee: newPayee({ displayName: 'Robert Klein', iban: 'DE00DEMO55667788', countryCode: 'DE' }),
      approval: {
        decidedBy: 'david',
        decidedAt: iso(NOW - 2 * HOUR_MS),
        decision: 'rejected',
        rejectionReason: 'scam',
      },
    });
    const a = assessRisk(
      input({
        payee: newPayee({
          displayName: 'Robert Klein',
          iban: 'DE00DEMO55667788',
          countryCode: 'DE',
        }),
      }),
      ctx({ transfers: [rejected] }),
    );
    expect(fired(a, 'R19')?.points).toBe(20);
  });
});

describe('mitigators', () => {
  it('M01 applies to a payee paid three or more times', () => {
    const a = assessRisk(input({ payee: payee('payee_pharmacy') }), ctx());
    expect(fired(a, 'M01')?.points).toBe(-15);
  });

  it('M02 applies to a payee paid within 90 days', () => {
    expect(fired(assessRisk(input(), ctx()), 'M02')?.points).toBe(-10);
  });

  it('M03 applies within 20% of a previous payment to that payee', () => {
    const a = assessRisk(input({ amountCents: 8_000 }), ctx());
    expect(fired(a, 'M03')?.points).toBe(-15);
  });

  it('M04 applies when all three safety answers are reassuring', () => {
    expect(fired(assessRisk(input(), ctx()), 'M04')?.points).toBe(-10);
    expect(fired(assessRisk(input({ safetyAnswers: NEUTRAL }), ctx()), 'M04')).toBeUndefined();
  });

  it('total mitigation is capped so mitigators soften but never erase', () => {
    const a = assessRisk(input({ amountCents: 48_000, payee: payee('payee_pharmacy') }), ctx());
    // R04 (15) with M01+M02+M04 = -35, capped to -25 -> floor 0
    expect(a.score).toBe(0);
  });
});

describe('mitigator gate', () => {
  it('is closed by a Tier A keyword', () => {
    const a = assessRisk(input({ reasonText: 'Please move this to a safe account' }), ctx());
    expect(a.mitigatorsGated).toBe(true);
    expect(ruleIds(a.reasons)).not.toContain('M01');
  });

  it('is closed by a no_match name check', () => {
    const a = assessRisk(
      input({ payee: { ...payee('payee_energy'), copResult: 'no_match' } }),
      ctx(),
    );
    expect(a.mitigatorsGated).toBe(true);
  });

  it('is closed when the sender was asked to keep it secret or hurry', () => {
    const a = assessRisk(
      input({ safetyAnswers: { ...REASSURING, askedToKeepSecretOrHurry: true } }),
      ctx(),
    );
    expect(a.mitigatorsGated).toBe(true);
  });

  it('is open on an ordinary payment', () => {
    expect(assessRisk(input(), ctx()).mitigatorsGated).toBe(false);
  });

  it('reports gated mitigators to the approver without scoring them', () => {
    const a = assessRisk(input({ reasonText: 'Move it to a safe account' }), ctx());
    const gated = a.reasons.filter((r) => r.gated);
    expect(gated.length).toBeGreaterThan(0);
    expect(a.score).toBeGreaterThanOrEqual(30);
  });
});

describe('bands', () => {
  it('maps scores to the four bands', () => {
    expect(bandForScore(0)).toBe('LOW');
    expect(bandForScore(24)).toBe('LOW');
    expect(bandForScore(25)).toBe('MEDIUM');
    expect(bandForScore(49)).toBe('MEDIUM');
    expect(bandForScore(50)).toBe('HIGH');
    expect(bandForScore(74)).toBe('HIGH');
    expect(bandForScore(75)).toBe('CRITICAL');
    expect(bandForScore(100)).toBe('CRITICAL');
  });

  it('produces LOW for an ordinary bill', () => {
    expect(assessRisk(input(), ctx()).band).toBe('LOW');
  });

  it('produces MEDIUM for a large payment to a new payee', () => {
    const a = assessRisk(
      input({
        amountCents: 200_000,
        payee: newPayee(),
        reasonCategory: 'repairs',
        reasonText: 'Roof repair after the storm, recommended by the neighbours',
      }),
      ctx(),
    );
    expect(a.band).toBe('MEDIUM');
  });

  it('produces HIGH for a romance-scam pattern', () => {
    const a = assessRisk(
      input({
        amountCents: 90_000,
        payee: newPayee({ iban: 'XA00DEMO90011223', countryCode: 'XA', copResult: 'unavailable' }),
        reasonCategory: 'helping',
        reasonText: 'Helping my friend I met online, he is stuck abroad and needs a hospital fee',
      }),
      ctx(),
    );
    expect(a.band).toBe('HIGH');
  });

  it('produces CRITICAL, capped at 100, for the courier scenario', () => {
    const a = assessRisk(
      input({
        amountCents: 450_000,
        payee: newPayee({
          displayName: 'Robert Klein',
          iban: 'DE00DEMO55667788',
          countryCode: 'DE',
          copResult: 'close_match',
        }),
        reasonCategory: 'other',
        reasonText:
          'Bank fraud department told me to move my money to a safe account today, urgent, do not tell anyone',
        safetyAnswers: {
          contactedFirst: true,
          askedToKeepSecretOrHurry: true,
          verifiedOnKnownNumber: false,
        },
      }),
      ctx(),
    );
    expect(a.score).toBe(100);
    expect(a.band).toBe('CRITICAL');
    expect(a.coolingOffMinutes).toBe(30);
    expect(a.reasons.filter((r) => r.points > 0).length).toBeGreaterThanOrEqual(5);
    expect(a.matchedScamPatterns[0]).toBe('courier');
  });
});

describe('assessment output', () => {
  it('sorts reasons by absolute points, descending', () => {
    const a = assessRisk(
      input({ amountCents: 450_000, payee: newPayee(), reasonText: 'urgent safe account' }),
      ctx(),
    );
    const magnitudes = a.reasons.map((r) => Math.abs(r.points));
    expect([...magnitudes].sort((x, y) => y - x)).toEqual(magnitudes);
  });

  it('stamps the assessment with a time and engine version', () => {
    const a = assessRisk(input(), ctx());
    expect(a.engineVersion).toBe(CONFIG.engineVersion);
    expect(a.assessedAt).toBe(iso(NOW));
  });

  it('gives every reason both plain language and a technical explanation', () => {
    const a = assessRisk(
      input({ amountCents: 450_000, payee: newPayee(), reasonText: 'urgent safe account' }),
      ctx(),
    );
    for (const reason of a.reasons) {
      expect(reason.plainLanguage.length).toBeGreaterThan(0);
      expect(reason.technical.length).toBeGreaterThan(0);
      expect(reason.plainLanguage.split(/\s+/).length).toBeLessThanOrEqual(18);
    }
  });

  it('never blames the sender in plain language', () => {
    const a = assessRisk(
      input({ amountCents: 450_000, payee: newPayee(), reasonText: 'urgent safe account crypto' }),
      ctx(),
    );
    const banned = /you are being scammed|suspicious user|stupid|foolish|victim/i;
    for (const reason of a.reasons) expect(reason.plainLanguage).not.toMatch(banned);
  });

  it('lists multiple scam patterns in priority order', () => {
    const a = assessRisk(
      input({
        reasonText: 'The fraud department says to buy gift cards and move it to a safe account',
      }),
      ctx(),
    );
    expect(a.matchedScamPatterns).toContain('courier');
    expect(a.matchedScamPatterns).toContain('advanceFee');
    expect(a.matchedScamPatterns.indexOf('courier')).toBeLessThan(
      a.matchedScamPatterns.indexOf('advanceFee'),
    );
  });
});

describe('required action', () => {
  it('sends a LOW payment under the threshold without approval', () => {
    expect(assessRisk(input(), ctx()).requiresApproval).toBe(false);
  });

  it('requires approval above the threshold even when LOW', () => {
    const a = assessRisk(input({ amountCents: 60_000 }), ctx());
    expect(a.requiresApproval).toBe(true);
  });

  it('requires approval for a new payee when the setting is on', () => {
    const a = assessRisk(input({ amountCents: 1_000, payee: newPayee() }), ctx());
    expect(a.requiresApproval).toBe(true);
  });

  it('requires approval for a cross-border payee when the setting is on', () => {
    const a = assessRisk(
      input({ amountCents: 1_000, payee: { ...payee('payee_energy'), countryCode: 'DE' } }),
      ctx(),
    );
    expect(a.requiresApproval).toBe(true);
  });

  it('applies a 30-minute hold only at CRITICAL', () => {
    expect(assessRisk(input(), ctx()).coolingOffMinutes).toBe(0);
  });
});
