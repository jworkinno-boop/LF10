// The calibration suite. An engine that never fires is useless; an engine that
// fires on ordinary life trains the sender to click through warnings.
// These are the brief's calibration targets, expressed as tests.

import { describe, expect, it } from 'vitest';
import { assessRisk } from './assessRisk';
import { HOUR_MS, iso } from '../clock';
import { ctx, input, newPayee, NOW, payee, REASSURING } from './testUtils';
import type { Transfer } from '../types';

describe('ordinary life stays quiet', () => {
  it('EUR 62.40 electricity bill to a known payee: LOW, score 0, sends immediately', () => {
    const a = assessRisk(
      input({
        amountCents: 6_240,
        payee: payee('payee_energy'),
        reasonCategory: 'bill',
        reasonText: 'Monthly electricity bill',
      }),
      ctx(),
    );
    expect(a.score).toBe(0);
    expect(a.band).toBe('LOW');
    expect(a.requiresApproval).toBe(false);
    expect(a.matchedScamPatterns).toEqual([]);
  });

  it('EUR 340 annual insurance renewal to a known payee: LOW', () => {
    const a = assessRisk(
      input({
        amountCents: 34_000,
        payee: payee('payee_insurance'),
        reasonCategory: 'bill',
        reasonText: 'Annual home insurance renewal',
      }),
      ctx(),
    );
    expect(a.band).toBe('LOW');
    expect(a.requiresApproval).toBe(false);
  });

  it('EUR 96.20 pharmacy repeat: LOW', () => {
    const a = assessRisk(
      input({
        amountCents: 9_620,
        payee: payee('payee_pharmacy'),
        reasonCategory: 'medical',
        reasonText: 'Prescription and vitamins for the month',
      }),
      ctx(),
    );
    expect(a.band).toBe('LOW');
    expect(a.requiresApproval).toBe(false);
  });

  it('EUR 2,000 to a new tradesperson with an honest reason: MEDIUM, not HIGH', () => {
    const a = assessRisk(
      input({
        amountCents: 200_000,
        payee: newPayee(),
        reasonCategory: 'repairs',
        reasonText:
          'Roof repair after the storm, he came recommended by the neighbours',
        safetyAnswers: REASSURING,
      }),
      ctx(),
    );
    expect(a.band).toBe('MEDIUM');
    expect(a.score).toBeLessThan(50);
    expect(a.requiresApproval).toBe(true);
    expect(a.matchedScamPatterns).toEqual([]);
  });

  it('EUR 1,200 holiday deposit to a new payee abroad: MEDIUM, not HIGH', () => {
    const a = assessRisk(
      input({
        amountCents: 120_000,
        payee: newPayee({
          displayName: 'Casa Almendro',
          iban: 'ES00DEMO40012345',
          countryCode: 'ES',
        }),
        reasonCategory: 'shopping',
        reasonText: 'Deposit for our holiday cottage, booked over the phone with the owner',
        safetyAnswers: REASSURING,
      }),
      ctx(),
    );
    expect(a.band).toBe('MEDIUM');
    expect(a.matchedScamPatterns).toEqual([]);
  });

  it("EUR 900 to a grandchild's new account: MEDIUM, not HIGH", () => {
    const a = assessRisk(
      input({
        amountCents: 90_000,
        payee: newPayee({
          displayName: 'Sophie Whitfield',
          iban: 'NL00DEMO70055443',
          countryCode: 'NL',
        }),
        reasonCategory: 'family',
        reasonText: 'Birthday, first payment to her new bank',
        safetyAnswers: REASSURING,
      }),
      ctx(),
    );
    expect(a.band).toBe('MEDIUM');
    expect(a.matchedScamPatterns).toEqual([]);
  });

  it('a large but ordinary payment never reaches a scam warning on circumstance alone', () => {
    const a = assessRisk(
      input({
        amountCents: 1_000_000,
        payee: newPayee({ countryCode: 'DE', iban: 'DE00DEMO10203040' }),
        reasonCategory: 'rent_care',
        reasonText: 'Care home fees for the year, invoice arrived by post',
        safetyAnswers: REASSURING,
      }),
      ctx(),
    );
    expect(a.band).toBe('MEDIUM');
    expect(a.circumstantialCapped).toBe(true);
    expect(a.requiresApproval).toBe(true);
  });
});

describe('the engine still fires when it should', () => {
  it('threshold splitting: the third EUR 480 payment forces approval', () => {
    const garden = payee('payee_garden');
    const base = (id: string, createdAt: string, timesPaid: number): Transfer =>
      ({
        id,
        createdAt,
        createdBy: 'margaret',
        payee: { ...garden, timesPaid },
        amountCents: 48_000,
        currency: 'EUR',
        reasonCategory: 'repairs',
        reasonText: 'Part payment for the new fence',
        safetyAnswers: REASSURING,
        risk: assessRisk(input(), ctx()),
        state: 'SENT',
      }) as Transfer;

    const draft = (transfers: Transfer[], timesPaid: number) =>
      assessRisk(
        input({
          amountCents: 48_000,
          payee: { ...garden, timesPaid },
          reasonCategory: 'repairs',
          reasonText: 'Part payment for the new fence',
        }),
        ctx({ transfers }),
      );

    const first = draft([], 2);
    expect(first.band).toBe('LOW');
    expect(first.requiresApproval).toBe(false);

    const t1 = base('S1', iso(NOW - 3 * HOUR_MS), 2);
    const second = draft([t1], 3);
    expect(second.band).toBe('LOW');
    expect(second.requiresApproval).toBe(false);

    const t2 = base('S2', iso(NOW - HOUR_MS), 3);
    const third = draft([t1, t2], 4);
    const ids = third.reasons.filter((r) => !r.gated).map((r) => r.ruleId);
    expect(ids).toContain('R04');
    expect(ids).toContain('R09');
    expect(ids).toContain('R18');
    expect(third.band).toBe('MEDIUM');
    expect(third.requiresApproval).toBe(true);
  });

  it('tech support scam reaches CRITICAL', () => {
    const a = assessRisk(
      input({
        amountCents: 200_000,
        payee: newPayee({ displayName: 'Support Refunds', iban: 'NL00DEMO88990011' }),
        reasonCategory: 'other',
        reasonText:
          'Microsoft support helped me with my computer, they need a refund fee via AnyDesk',
        safetyAnswers: {
          contactedFirst: true,
          askedToKeepSecretOrHurry: false,
          verifiedOnKnownNumber: false,
        },
      }),
      ctx(),
    );
    expect(a.band).toBe('CRITICAL');
    expect(a.matchedScamPatterns).toContain('techSupport');
  });

  it('invoice redirect is caught by the name check plus the wording', () => {
    const a = assessRisk(
      input({
        amountCents: 120_000,
        payee: newPayee({
          displayName: 'Northgate Energy',
          iban: 'NL00DEMO12349876',
          countryCode: 'NL',
        }),
        reasonCategory: 'bill',
        reasonText: 'They emailed me new bank details for the energy account',
        safetyAnswers: {
          contactedFirst: true,
          askedToKeepSecretOrHurry: false,
          verifiedOnKnownNumber: false,
        },
      }),
      ctx(),
    );
    const ids = a.reasons.filter((r) => !r.gated).map((r) => r.ruleId);
    expect(ids).toContain('R13');
    expect(ids).toContain('R07');
    expect(a.matchedScamPatterns).toContain('invoiceRedirect');
    expect(['HIGH', 'CRITICAL']).toContain(a.band);
    expect(a.mitigatorsGated).toBe(true);
  });

  it('a coached resubmission after a rejection is caught by R19', () => {
    const klein = newPayee({
      displayName: 'Robert Klein',
      iban: 'DE00DEMO55667788',
      countryCode: 'DE',
      copResult: 'close_match',
    });
    const rejected = {
      id: 'REJ1',
      createdAt: iso(NOW - 3 * HOUR_MS),
      createdBy: 'margaret',
      payee: klein,
      amountCents: 450_000,
      currency: 'EUR',
      reasonCategory: 'other',
      reasonText: 'Bank fraud department said to move it to a safe account',
      safetyAnswers: REASSURING,
      risk: assessRisk(input(), ctx()),
      state: 'REJECTED',
      approval: {
        decidedBy: 'david',
        decidedAt: iso(NOW - 2 * HOUR_MS),
        decision: 'rejected',
        rejectionReason: 'scam',
      },
    } as Transfer;

    const a = assessRisk(
      input({
        amountCents: 450_000,
        payee: klein,
        reasonCategory: 'other',
        reasonText: 'Money for Robert, personal',
      }),
      ctx({ transfers: [rejected] }),
    );
    const ids = a.reasons.filter((r) => !r.gated).map((r) => r.ruleId);
    expect(ids).toContain('R19');
    expect(a.requiresApproval).toBe(true);
    expect(['HIGH', 'CRITICAL']).toContain(a.band);
  });
});
