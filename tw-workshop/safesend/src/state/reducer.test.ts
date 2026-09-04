import { describe, expect, it } from 'vitest';
import { reducer, materialiseTime, emptyDraft, type Action } from './reducer';
import { seedState } from '../data/seed';
import { DAY_MS, HOUR_MS, MINUTE_MS, parse } from '../clock';
import { DEMO_NOW } from '../clock';
import type { AppState, SafetyAnswers, TransferDraft } from '../types';

const NOW = parse(DEMO_NOW);

const REASSURING: SafetyAnswers = {
  contactedFirst: false,
  askedToKeepSecretOrHurry: false,
  verifiedOnKnownNumber: true,
};

function run(state: AppState, actions: Action[]): AppState {
  return actions.reduce(reducer, state);
}

function draft(overrides: Partial<TransferDraft>): TransferDraft {
  return {
    ...emptyDraft(),
    step: 5,
    payeeId: 'payee_energy',
    amountCents: 6_240,
    reasonCategory: 'bill',
    reasonText: 'Monthly electricity bill',
    safetyAnswers: REASSURING,
    ...overrides,
  };
}

function submitted(overrides: Partial<TransferDraft> = {}, base = seedState()) {
  const state = run(base, [
    { type: 'DRAFT_PATCH', patch: draft(overrides) },
    { type: 'SUBMIT_TRANSFER', nowMs: NOW },
  ]);
  return { state, transfer: state.transfers[state.transfers.length - 1] };
}

const COURIER: Partial<TransferDraft> = {
  payeeId: undefined,
  newPayee: {
    displayName: 'Robert Klein',
    iban: 'DE00DEMO55667788',
    countryCode: 'DE',
    save: false,
  },
  amountCents: 450_000,
  reasonCategory: 'other',
  reasonText:
    'Bank fraud department told me to move my money to a safe account today, urgent, do not tell anyone',
  safetyAnswers: {
    contactedFirst: true,
    askedToKeepSecretOrHurry: true,
    verifiedOnKnownNumber: false,
  },
};

describe('submission', () => {
  it('sends an ordinary payment immediately and moves the money', () => {
    const before = seedState().accounts.margaret.balanceCents!;
    const { state, transfer } = submitted();
    expect(transfer.state).toBe('SENT');
    expect(state.accounts.margaret.balanceCents).toBe(before - 6_240);
    expect(state.notifications.some((n) => n.type === 'sent')).toBe(true);
  });

  it('routes a risky payment to the approver and notifies him', () => {
    const { transfer, state } = submitted(COURIER);
    expect(transfer.state).toBe('PENDING_APPROVAL');
    expect(transfer.risk.band).toBe('CRITICAL');
    expect(transfer.expiresAt).toBeDefined();
    const note = state.notifications.find((n) => n.type === 'approval_requested');
    expect(note?.toPersona).toBe('david');
    expect(note?.channels.smsPreview).not.toMatch(/https?:|www\.|\.example|\/a\//);
  });

  it('has no bypass: an unfinished safety check cannot produce a transfer', () => {
    const state = run(seedState(), [
      {
        type: 'DRAFT_PATCH',
        patch: draft({
          safetyAnswers: { contactedFirst: null, askedToKeepSecretOrHurry: null, verifiedOnKnownNumber: null },
        }),
      },
      { type: 'SUBMIT_TRANSFER', nowMs: NOW },
    ]);
    expect(state.transfers).toHaveLength(0);
    expect(state.lastError).toBeTruthy();
  });

  it('has no bypass: a reason shorter than the minimum cannot be submitted', () => {
    const state = run(seedState(), [
      { type: 'DRAFT_PATCH', patch: draft({ reasonText: 'bill' }) },
      { type: 'SUBMIT_TRANSFER', nowMs: NOW },
    ]);
    expect(state.transfers).toHaveLength(0);
  });

  it('blocks outright only when the setting is on, and never silently', () => {
    const base = { ...seedState(), settings: { ...seedState().settings, blockCriticalOutright: true } };
    const { transfer, state } = submitted(COURIER, base);
    expect(transfer.state).toBe('BLOCKED');
    expect(state.notifications.some((n) => n.type === 'blocked')).toBe(true);
  });
});

describe('approval flow', () => {
  it('requires a spoken confirmation before approving HIGH or above', () => {
    const { state, transfer } = submitted(COURIER);
    const attempted = reducer(state, {
      type: 'APPROVE',
      transferId: transfer.id,
      actor: 'david',
      nowMs: NOW,
    });
    expect(attempted.lastError).toBeTruthy();
    expect(attempted.transfers[0].state).toBe('PENDING_APPROVAL');
  });

  it('enters APPROVED_HOLD with a 30-minute wait for CRITICAL', () => {
    const { state, transfer } = submitted(COURIER);
    const approved = reducer(state, {
      type: 'APPROVE',
      transferId: transfer.id,
      actor: 'david',
      nowMs: NOW,
      spokeToSenderConfirmed: true,
    });
    const held = approved.transfers[0];
    expect(held.state).toBe('APPROVED_HOLD');
    expect(parse(held.holdUntil!) - NOW).toBe(30 * MINUTE_MS);

    const stillHeld = materialiseTime(approved, NOW + 29 * MINUTE_MS);
    expect(stillHeld.transfers[0].state).toBe('APPROVED_HOLD');

    const sent = materialiseTime(approved, NOW + 31 * MINUTE_MS);
    expect(sent.transfers[0].state).toBe('SENT');
    expect(sent.audit.some((e) => e.action === 'hold_elapsed')).toBe(true);
  });

  it('lets either party cancel during the hold', () => {
    const { state, transfer } = submitted(COURIER);
    const approved = reducer(state, {
      type: 'APPROVE',
      transferId: transfer.id,
      actor: 'david',
      nowMs: NOW,
      spokeToSenderConfirmed: true,
    });
    for (const actor of ['margaret', 'david'] as const) {
      const cancelled = reducer(approved, {
        type: 'CANCEL_TRANSFER',
        transferId: transfer.id,
        actor,
        nowMs: NOW,
      });
      expect(cancelled.transfers[0].state).toBe('CANCELLED');
    }
  });

  it('requires a reason to reject', () => {
    const { state, transfer } = submitted(COURIER);
    const attempted = reducer(state, {
      type: 'REJECT',
      transferId: transfer.id,
      actor: 'david',
      nowMs: NOW,
      rejectionReason: '',
    });
    expect(attempted.lastError).toBeTruthy();
    expect(attempted.transfers[0].state).toBe('PENDING_APPROVAL');
  });

  it('refuses approval by anyone but the approver', () => {
    const { state, transfer } = submitted(COURIER);
    const attempted = reducer(state, {
      type: 'APPROVE',
      transferId: transfer.id,
      actor: 'margaret',
      nowMs: NOW,
      spokeToSenderConfirmed: true,
    });
    expect(attempted.lastError).toBeTruthy();
    expect(attempted.transfers[0].state).toBe('PENDING_APPROVAL');
  });

  it('rejects illegal transitions with a clear error', () => {
    const { state, transfer } = submitted();
    const attempted = reducer(state, {
      type: 'APPROVE',
      transferId: transfer.id,
      actor: 'david',
      nowMs: NOW,
      spokeToSenderConfirmed: true,
    });
    expect(attempted.lastError).toBeTruthy();
    expect(attempted.transfers[0].state).toBe('SENT');
  });
});

describe('question round trip', () => {
  it('re-scores the reply and never lets the band silently fall', () => {
    const { state, transfer } = submitted({
      payeeId: undefined,
      newPayee: {
        displayName: 'Van Dijk Roofing',
        iban: 'NL00DEMO61200034',
        countryCode: 'NL',
        save: false,
      },
      amountCents: 200_000,
      reasonCategory: 'repairs',
      reasonText: 'Roof repair after the storm, recommended by the neighbours',
    });
    expect(transfer.state).toBe('PENDING_APPROVAL');

    const asked = reducer(state, {
      type: 'ASK_QUESTION',
      transferId: transfer.id,
      actor: 'david',
      nowMs: NOW,
      question: 'How did you find him?',
    });
    expect(asked.transfers[0].state).toBe('INFO_REQUESTED');

    const answered = reducer(asked, {
      type: 'ANSWER_QUESTION',
      transferId: transfer.id,
      actor: 'margaret',
      nowMs: NOW + MINUTE_MS,
      answer: 'He rang me first and said it was urgent, and told me to keep it secret',
    });
    const updated = answered.transfers[0];
    expect(updated.state).toBe('PENDING_APPROVAL');
    expect(updated.priorRisk).toBeDefined();
    expect(updated.risk.score).toBeGreaterThan(updated.priorRisk!.score);
  });

  it('never lowers the band when the reply is reassuring', () => {
    const { state, transfer } = submitted(COURIER);
    const asked = reducer(state, {
      type: 'ASK_QUESTION',
      transferId: transfer.id,
      actor: 'david',
      nowMs: NOW,
      question: 'Who contacted you?',
    });
    const answered = reducer(asked, {
      type: 'ANSWER_QUESTION',
      transferId: transfer.id,
      actor: 'margaret',
      nowMs: NOW + MINUTE_MS,
      answer: 'Nobody, it is fine, please just send it',
    });
    expect(answered.transfers[0].risk.band).toBe('CRITICAL');
  });
});

describe('expiry', () => {
  it('expires an undecided request after 24 hours and tells both people', () => {
    const { state } = submitted(COURIER);
    const expired = materialiseTime(state, NOW + 25 * HOUR_MS);
    expect(expired.transfers[0].state).toBe('EXPIRED');
    expect(expired.notifications.filter((n) => n.type === 'expired')).toHaveLength(2);
  });

  it('is idempotent: materialising twice changes nothing further', () => {
    const { state } = submitted(COURIER);
    const once = materialiseTime(state, NOW + 25 * HOUR_MS);
    const twice = materialiseTime(once, NOW + 25 * HOUR_MS);
    expect(twice).toBe(once);
  });
});

describe('anti-coercion model', () => {
  it('lets the sender lower the checking amount instantly', () => {
    const next = reducer(seedState(), {
      type: 'REQUEST_SETTINGS_CHANGE',
      field: 'approvalThresholdCents',
      value: 20_000,
      actor: 'margaret',
      nowMs: NOW,
    });
    expect(next.settings.approvalThresholdCents).toBe(20_000);
    expect(next.pendingChanges).toHaveLength(0);
  });

  it('does not let the sender raise the checking amount', () => {
    const next = reducer(seedState(), {
      type: 'REQUEST_SETTINGS_CHANGE',
      field: 'approvalThresholdCents',
      value: 200_000,
      actor: 'margaret',
      nowMs: NOW,
    });
    expect(next.settings.approvalThresholdCents).toBe(50_000);
    expect(next.lastError).toBeTruthy();
  });

  it('delays an approver raising the threshold by 24 hours and tells both', () => {
    const next = reducer(seedState(), {
      type: 'REQUEST_SETTINGS_CHANGE',
      field: 'approvalThresholdCents',
      value: 200_000,
      actor: 'david',
      nowMs: NOW,
    });
    expect(next.settings.approvalThresholdCents).toBe(50_000);
    expect(next.pendingChanges).toHaveLength(1);
    expect(parse(next.pendingChanges[0].effectiveAt) - NOW).toBe(24 * HOUR_MS);
    expect(next.notifications.filter((n) => n.type === 'settings_change_pending')).toHaveLength(2);
    expect(next.audit.some((e) => e.action === 'settings_change_requested')).toBe(true);

    const applied = materialiseTime(next, NOW + 25 * HOUR_MS);
    expect(applied.settings.approvalThresholdCents).toBe(200_000);
    expect(applied.notifications.some((n) => n.type === 'settings_change_applied')).toBe(true);
  });

  it('gives the approver NO veto over his own removal', () => {
    const started = reducer(seedState(), {
      type: 'START_CONTACT_CHANGE',
      mode: 'remove',
      actor: 'margaret',
      nowMs: NOW,
    });
    const change = started.pendingChanges[0];
    expect(change.cancellableBy).toEqual(['margaret']);

    const davidTries = reducer(started, {
      type: 'CANCEL_PENDING_CHANGE',
      changeId: change.id,
      actor: 'david',
      nowMs: NOW,
    });
    expect(davidTries.pendingChanges).toHaveLength(1);
    expect(davidTries.lastError).toBeTruthy();

    const applied = materialiseTime(started, NOW + 25 * HOUR_MS);
    expect(applied.contacts.every((c) => !c.active)).toBe(true);
  });

  it('lets the sender cancel her own removal request', () => {
    const started = reducer(seedState(), {
      type: 'START_CONTACT_CHANGE',
      mode: 'remove',
      actor: 'margaret',
      nowMs: NOW,
    });
    const cancelled = reducer(started, {
      type: 'CANCEL_PENDING_CHANGE',
      changeId: started.pendingChanges[0].id,
      actor: 'margaret',
      nowMs: NOW,
    });
    expect(cancelled.pendingChanges).toHaveLength(0);
  });

  it('does not let the approver start a removal or replacement', () => {
    const next = reducer(seedState(), {
      type: 'START_CONTACT_CHANGE',
      mode: 'remove',
      actor: 'david',
      nowMs: NOW,
    });
    expect(next.pendingChanges).toHaveLength(0);
    expect(next.lastError).toBeTruthy();
  });

  it('delays a trusted payee, notifies the sender, and lets her undo it', () => {
    const requested = reducer(seedState(), {
      type: 'ADD_TRUSTED_PAYEE',
      payeeId: 'payee_garden',
      actor: 'david',
      nowMs: NOW,
    });
    expect(requested.pendingChanges).toHaveLength(1);
    expect(requested.notifications.some((n) => n.type === 'trusted_payee_added')).toBe(true);

    const applied = materialiseTime(requested, NOW + 25 * HOUR_MS);
    expect(applied.payees.find((p) => p.id === 'payee_garden')?.status).toBe('trusted');

    const revoked = reducer(applied, {
      type: 'REVOKE_TRUSTED_PAYEE',
      payeeId: 'payee_garden',
      actor: 'margaret',
      nowMs: NOW + 26 * HOUR_MS,
    });
    expect(revoked.payees.find((p) => p.id === 'payee_garden')?.status).not.toBe('trusted');
  });

  it('does not let the approver revoke a trusted payee on the sender’s behalf', () => {
    const next = reducer(seedState(), {
      type: 'REVOKE_TRUSTED_PAYEE',
      payeeId: 'payee_garden',
      actor: 'david',
      nowMs: NOW,
    });
    expect(next.lastError).toBeTruthy();
  });
});

describe('audit log', () => {
  it('writes a monotonic entry for every transition', () => {
    const { state, transfer } = submitted(COURIER);
    const approved = reducer(state, {
      type: 'APPROVE',
      transferId: transfer.id,
      actor: 'david',
      nowMs: NOW,
      spokeToSenderConfirmed: true,
    });
    const sent = materialiseTime(approved, NOW + 31 * MINUTE_MS);
    const seqs = sent.audit.map((e) => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(sent.audit.map((e) => e.action)).toEqual(['created', 'approved', 'hold_elapsed']);
    for (const entry of sent.audit) {
      expect(entry.actor).toBeTruthy();
      expect(entry.timestamp).toBeTruthy();
    }
  });
});

describe('cross-tab revision', () => {
  it('increments the revision on every accepted change', () => {
    const start = seedState();
    const { state } = submitted({}, start);
    expect(state.revision).toBeGreaterThan(start.revision);
  });
});

describe('resubmission', () => {
  it('carries the prior reason text through for the diff', () => {
    const { state, transfer } = submitted(COURIER);
    const rejected = reducer(state, {
      type: 'REJECT',
      transferId: transfer.id,
      actor: 'david',
      nowMs: NOW,
      rejectionReason: 'I think this is a scam',
    });
    const restarted = reducer(rejected, { type: 'DRAFT_START', supersedes: transfer.id });
    expect(restarted.draft?.priorReasonText).toBe(transfer.reasonText);

    const resubmitted = run(restarted, [
      {
        type: 'DRAFT_PATCH',
        patch: { step: 5, reasonText: 'Money for Robert, personal', safetyAnswers: REASSURING },
      },
      { type: 'SUBMIT_TRANSFER', nowMs: NOW + HOUR_MS },
    ]);
    const latest = resubmitted.transfers[resubmitted.transfers.length - 1];
    expect(latest.supersedesTransferId).toBe(transfer.id);
    expect(latest.risk.reasons.some((r) => r.ruleId === 'R19' && !r.gated)).toBe(true);
  });
});

describe('daily limit', () => {
  it('forces approval instead of blocking', () => {
    let state = seedState();
    const big = submitted(
      { payeeId: 'payee_energy', amountCents: 95_000, reasonText: 'Electricity for the quarter' },
      state,
    );
    state = big.state;
    expect(['PENDING_APPROVAL', 'SENT']).toContain(big.transfer.state);

    const second = submitted(
      { payeeId: 'payee_pharmacy', amountCents: 20_000, reasonText: 'Prescriptions for the month' },
      state,
    );
    expect(second.transfer.risk.reasons.some((r) => r.ruleId === 'R18')).toBe(true);
    expect(second.transfer.state).toBe('PENDING_APPROVAL');
  });
});

describe('time materialisation', () => {
  it('does nothing when nothing is due', () => {
    const state = seedState();
    expect(materialiseTime(state, NOW + DAY_MS)).toBe(state);
  });
});
