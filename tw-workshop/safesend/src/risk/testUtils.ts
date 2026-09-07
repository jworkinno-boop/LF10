// Shared fixtures for the risk-engine test suites.
import { DEMO_NOW, iso, parse } from '../clock';
import { CONFIG } from '../config';
import { ACCOUNTS, seedHistory, seedPayees } from '../data/seed';
import { materialisePayee } from '../state/payees';
import type { Payee, SafetyAnswers, Transfer } from '../types';
import type { RiskContext, RiskInput } from './context';

export const NOW = parse(DEMO_NOW);

export const REASSURING: SafetyAnswers = {
  contactedFirst: false,
  askedToKeepSecretOrHurry: false,
  verifiedOnKnownNumber: true,
};

export const NEUTRAL: SafetyAnswers = {
  contactedFirst: false,
  askedToKeepSecretOrHurry: false,
  verifiedOnKnownNumber: false,
};

export function payee(id: string): Payee {
  const found = seedPayees().find((p) => p.id === id);
  if (!found) throw new Error(`No seeded payee ${id}`);
  return found;
}

export function newPayee(overrides: Partial<Payee> = {}): Payee {
  // Build from the overridden IBAN so the mock CoP lookup stays consistent.
  const base = materialisePayee({
    displayName: overrides.displayName ?? 'Van Dijk Roofing',
    iban: overrides.iban ?? 'NL00DEMO61200034',
    countryCode: overrides.countryCode ?? 'NL',
    addedAt: overrides.addedAt ?? iso(NOW),
  });
  return { ...base, ...overrides };
}

export function ctx(overrides: Partial<RiskContext> = {}): RiskContext {
  return {
    nowMs: NOW,
    balanceCents: ACCOUNTS.margaret.balanceCents!,
    accountCountry: 'NL',
    settings: { ...CONFIG.defaults },
    history: seedHistory(),
    transfers: [] as Transfer[],
    ...overrides,
  };
}

export function input(overrides: Partial<RiskInput> = {}): RiskInput {
  return {
    amountCents: 6240,
    reasonCategory: 'bill',
    reasonText: 'Monthly electricity bill',
    safetyAnswers: REASSURING,
    payee: payee('payee_energy'),
    createdAtMs: NOW,
    ...overrides,
  };
}

export function ruleIds(reasons: { ruleId: string; gated?: boolean }[]): string[] {
  return reasons.filter((r) => !r.gated).map((r) => r.ruleId);
}
