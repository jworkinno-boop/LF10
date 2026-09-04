// Every seeded scenario is loaded, submitted through the real reducer, and
// checked against what the demo panel promises the reviewer they will see.

import { describe, expect, it } from 'vitest';
import { reducer } from '../state/reducer';
import { seedState } from './seed';
import { SCENARIOS } from './scenarios';
import { DEMO_NOW, parse } from '../clock';
import type { AppState, RiskBand, TransferState } from '../types';

const NOW = parse(DEMO_NOW);

function load(scenarioId: string): AppState {
  return reducer(seedState(), { type: 'LOAD_SCENARIO', scenarioId, nowMs: NOW });
}

function submit(state: AppState) {
  const next = reducer(state, { type: 'SUBMIT_TRANSFER', nowMs: NOW });
  return { state: next, transfer: next.transfers[next.transfers.length - 1] };
}

const EXPECTED: Record<string, { band: RiskBand; state: TransferState; rules?: string[] }> = {
  normal_bill: { band: 'LOW', state: 'SENT' },
  large_legitimate: { band: 'MEDIUM', state: 'PENDING_APPROVAL' },
  new_payee_legitimate: { band: 'MEDIUM', state: 'PENDING_APPROVAL' },
  courier: { band: 'CRITICAL', state: 'PENDING_APPROVAL' },
  romance: { band: 'HIGH', state: 'PENDING_APPROVAL' },
  invoice_redirect: { band: 'CRITICAL', state: 'PENDING_APPROVAL', rules: ['R13', 'R07'] },
  splitting: { band: 'MEDIUM', state: 'PENDING_APPROVAL', rules: ['R04', 'R09', 'R18'] },
  tech_support: { band: 'CRITICAL', state: 'PENDING_APPROVAL' },
  resubmission: { band: 'HIGH', state: 'PENDING_APPROVAL', rules: ['R19'] },
};

describe('seeded scenarios', () => {
  it('covers every scenario in the demo panel', () => {
    expect(SCENARIOS.map((s) => s.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const scenario of SCENARIOS) {
    it(`${scenario.title} behaves as the demo panel promises`, () => {
      const loaded = load(scenario.id);
      expect(loaded.draft?.step).toBe(5);

      const { transfer } = submit(loaded);
      const expected = EXPECTED[scenario.id];
      expect(transfer.risk.band).toBe(expected.band);
      expect(transfer.state).toBe(expected.state);

      for (const ruleId of expected.rules ?? []) {
        expect(transfer.risk.reasons.filter((r) => !r.gated).map((r) => r.ruleId)).toContain(ruleId);
      }
    });
  }

  it('stays quiet on the ordinary bill: no scam explainer, no approval', () => {
    const { transfer } = submit(load('normal_bill'));
    expect(transfer.risk.score).toBe(0);
    expect(transfer.risk.matchedScamPatterns).toEqual([]);
    expect(transfer.risk.requiresApproval).toBe(false);
  });

  it('shows no scam explainer for the legitimate new tradesperson', () => {
    const { transfer } = submit(load('new_payee_legitimate'));
    expect(transfer.risk.matchedScamPatterns).toEqual([]);
    expect(transfer.risk.score).toBeLessThan(50);
  });

  it('names the courier pattern first for the safe-account scam', () => {
    const { transfer } = submit(load('courier'));
    expect(transfer.risk.score).toBe(100);
    expect(transfer.risk.matchedScamPatterns[0]).toBe('courier');
    expect(transfer.risk.coolingOffMinutes).toBe(30);
  });

  it('sends the first two splitting payments and stops the third', () => {
    const loaded = load('splitting');
    const already = loaded.transfers.filter((t) => t.state === 'SENT');
    expect(already).toHaveLength(2);
    for (const sent of already) expect(sent.risk.band).toBe('LOW');

    const { transfer } = submit(loaded);
    expect(transfer.state).toBe('PENDING_APPROVAL');
  });

  it('keeps the prior reason text for the resubmission diff', () => {
    const loaded = load('resubmission');
    expect(loaded.draft?.priorReasonText).toMatch(/safe account/);
    const { transfer } = submit(loaded);
    expect(transfer.supersedesTransferId).toBeTruthy();
    expect(transfer.priorReasonText).toMatch(/safe account/);
  });
});
