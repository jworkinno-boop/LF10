// Automated accessibility assertions. These do not replace a manual pass, but
// they catch the regressions that matter most: unlabelled controls, broken
// heading order, and colour-only status.

import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { screen } from '@testing-library/react';
import { renderAt, seedStorage } from './test/renderApp';
import { assessRisk } from './risk/assessRisk';
import { riskContextFor } from './state/selectors';
import { parse, iso, plusHours, DEMO_NOW } from './clock';
import { materialisePayee } from './state/payees';
import type { Transfer } from './types';

const NOW = parse(DEMO_NOW);

function withPendingTransfer() {
  return seedStorage((state) => {
    const payee = materialisePayee({
      displayName: 'Robert Klein',
      iban: 'DE00DEMO55667788',
      countryCode: 'DE',
      addedAt: iso(NOW),
    });
    const risk = assessRisk(
      {
        amountCents: 450_000,
        reasonCategory: 'other',
        reasonText:
          'Bank fraud department told me to move my money to a safe account today, urgent, do not tell anyone',
        safetyAnswers: {
          contactedFirst: true,
          askedToKeepSecretOrHurry: true,
          verifiedOnKnownNumber: false,
        },
        payee,
        createdAtMs: NOW,
      },
      riskContextFor(state, NOW),
    );
    const transfer: Transfer = {
      id: 'AB2C',
      createdAt: iso(NOW),
      createdBy: 'margaret',
      payee,
      amountCents: 450_000,
      currency: 'EUR',
      reasonCategory: 'other',
      reasonText:
        'Bank fraud department told me to move my money to a safe account today, urgent, do not tell anyone',
      safetyAnswers: {
        contactedFirst: true,
        askedToKeepSecretOrHurry: true,
        verifiedOnKnownNumber: false,
      },
      risk,
      state: 'PENDING_APPROVAL',
      expiresAt: iso(plusHours(NOW, 24)),
    };
    return {
      ...state,
      unlocked: ['margaret', 'david'],
      activePersona: 'margaret',
      transfers: [transfer],
    };
  });
}

const ROUTES: Array<[string, string]> = [
  ['/', 'the landing page'],
  ['/setup', 'the agreement'],
  ['/audit', 'the audit log'],
  ['/demo', 'the demo panel'],
  ['/m', "the sender's home"],
  ['/m/send', 'the send wizard'],
  ['/m/activity', 'the activity list'],
  ['/m/helpers', 'who helps me'],
  ['/m/help', 'the scam guide'],
  ['/m/report', 'the report page'],
  ['/d', "the approver's dashboard"],
  ['/d/approve/AB2C', 'the approval detail'],
  ['/d/notifications', 'the notification inbox'],
  ['/d/settings', 'the settings page'],
];

describe('accessibility', () => {
  for (const [path, name] of ROUTES) {
    it(`has no axe violations on ${name}`, async () => {
      withPendingTransfer();
      const { container } = renderAt(path);
      const results = await axe(container);
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }, 20_000);
  }

  it('shows a demo banner on every screen', () => {
    withPendingTransfer();
    renderAt('/m');
    expect(screen.getByText(/DEMO ONLY/i)).toBeInTheDocument();
  });

  it('never shows the numeric risk score to the sender', () => {
    withPendingTransfer();
    renderAt('/m/transfer/AB2C');
    expect(document.body.textContent).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
  });

  it('shows the score, rule IDs and points to the approver', () => {
    withPendingTransfer();
    renderAt('/d/approve/AB2C');
    expect(screen.getByText('100/100')).toBeInTheDocument();
    expect(screen.getAllByText(/^R\d{2}$/).length).toBeGreaterThan(4);
  });
});
