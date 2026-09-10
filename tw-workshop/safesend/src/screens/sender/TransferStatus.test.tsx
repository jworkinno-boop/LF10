// The sender's view of one payment. These cover the states the handoff left
// undrawn (§9.2 the cooling-off ring, §9.3 rejected and blocked) — the parts
// where getting the tone wrong turns a calm page into an alarm.

import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { screen } from '@testing-library/react';
import { renderAt, seedStorage } from '../../test/renderApp';
import { assessRisk } from '../../risk/assessRisk';
import { riskContextFor } from '../../state/selectors';
import { COPY } from '../../copy';
import { parse, iso, plusMinutes, DEMO_NOW } from '../../clock';
import { materialisePayee } from '../../state/payees';
import type { AppState, Transfer, TransferState } from '../../types';

const NOW = parse(DEMO_NOW);

function withTransfer(overrides: Partial<Transfer> & { state: TransferState }): AppState {
  return seedStorage((state) => {
    const payee = materialisePayee({
      displayName: 'Robert Klein',
      iban: 'DE00DEMO55667788',
      countryCode: 'DE',
      addedAt: iso(NOW),
    });
    const shared = {
      amountCents: 450_000,
      reasonCategory: 'other' as const,
      reasonText: 'For the boiler repair, they said it had to be today',
      safetyAnswers: {
        contactedFirst: true,
        askedToKeepSecretOrHurry: true,
        verifiedOnKnownNumber: false,
      },
      payee,
    };
    const risk = assessRisk({ ...shared, createdAtMs: NOW }, riskContextFor(state, NOW));
    const transfer: Transfer = {
      id: 'AB2C',
      createdAt: iso(NOW),
      createdBy: 'margaret',
      currency: 'EUR',
      risk,
      ...shared,
      ...overrides,
    };
    return {
      ...state,
      unlocked: ['margaret', 'david'],
      activePersona: 'margaret',
      transfers: [transfer],
    };
  });
}

describe("the sender's payment page", () => {
  it('shows the cooling-off wait as a ring, with the way out directly beneath it', async () => {
    withTransfer({
      state: 'APPROVED_HOLD',
      holdUntil: iso(plusMinutes(NOW, 18)),
      approval: {
        decision: 'approved',
        decidedAt: iso(plusMinutes(NOW, -12)),
        decidedBy: 'david',
      },
    });
    const { container } = renderAt('/m/transfer/AB2C');

    expect(screen.getByText('18 min 00 sec')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: COPY.sender.holdCancel })).toBeInTheDocument();
    // One cancel, not two: the ring owns it while the wait is running.
    expect(
      screen.queryByRole('button', { name: COPY.sender.cancelPayment }),
    ).not.toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);
  });

  it('offers ringing him and cancelling while a payment waits, and reassures', async () => {
    withTransfer({ state: 'PENDING_APPROVAL', expiresAt: iso(plusMinutes(NOW, 60 * 24)) });
    renderAt('/m/transfer/AB2C');

    expect(screen.getByText('Nothing has left your account.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.sender.ringApprover })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: COPY.sender.cancelPayment })).toBeInTheDocument();
  });

  it('states a rejection plainly, with his reason and no way to resend it', async () => {
    withTransfer({
      state: 'REJECTED',
      approval: {
        decision: 'rejected',
        decidedAt: iso(NOW),
        decidedBy: 'david',
        rejectionReason: COPY.approver.rejectionReasons.scam,
        note: 'Ring me before you do anything else.',
      },
    });
    const { container } = renderAt('/m/transfer/AB2C');

    expect(screen.getByText(COPY.states.REJECTED)).toBeInTheDocument();
    expect(screen.getByText('Nothing left your account.')).toBeInTheDocument();
    expect(screen.getByText(/Ring me before you do anything else/)).toBeInTheDocument();
    // After a scam rejection the scammer rings back: she is told what to expect.
    expect(screen.getByRole('heading', { name: COPY.aftermath.heading })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Send it again/ })).not.toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);
  });

  it('explains a block without blaming her', async () => {
    withTransfer({ state: 'BLOCKED' });
    const { container } = renderAt('/m/transfer/AB2C');

    expect(screen.getByText(COPY.states.BLOCKED)).toBeInTheDocument();
    expect(screen.getByText('Nothing left your account.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect((await axe(container)).violations).toEqual([]);
  });

  it('lets her send an expired payment again', async () => {
    withTransfer({ state: 'EXPIRED', expiresAt: iso(NOW) });
    renderAt('/m/transfer/AB2C');

    expect(screen.getByRole('button', { name: 'Send it again' })).toBeInTheDocument();
    expect(screen.getByText('Nothing left your account.')).toBeInTheDocument();
  });
});
