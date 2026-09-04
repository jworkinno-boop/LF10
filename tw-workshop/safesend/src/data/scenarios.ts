// Seeded demo scenarios. Loading one resets the demo and pre-fills a draft at
// step 5 (plus any prior transfers the scenario needs), so a reviewer can see
// the outcome in a single click.

import { HOUR_MS, iso } from '../clock';
import { assessRisk } from '../risk/assessRisk';
import { riskContextFor } from '../state/selectors';
import { materialisePayee } from '../state/payees';
import { referenceCode } from '../ids';
import type { AppState, Payee, ReasonCategory, SafetyAnswers, Transfer } from '../types';

export type Scenario = {
  id: string;
  title: string;
  summary: string;
  expected: string;
  build: (state: AppState, nowMs: number) => AppState;
};

const REASSURING: SafetyAnswers = {
  contactedFirst: false,
  askedToKeepSecretOrHurry: false,
  verifiedOnKnownNumber: true,
};

type DraftSpec = {
  payeeId?: string;
  newPayee?: { displayName: string; iban: string; countryCode: string };
  amountCents: number;
  reasonCategory: ReasonCategory;
  reasonText: string;
  safetyAnswers: SafetyAnswers;
  supersedesTransferId?: string;
  priorReasonText?: string;
};

function withDraft(state: AppState, spec: DraftSpec): AppState {
  return {
    ...state,
    activePersona: 'margaret',
    unlocked: ['margaret', 'david'],
    draft: {
      step: 5,
      payeeId: spec.payeeId,
      newPayee: spec.newPayee ? { ...spec.newPayee, save: false } : undefined,
      amountCents: spec.amountCents,
      reasonCategory: spec.reasonCategory,
      reasonText: spec.reasonText,
      safetyAnswers: spec.safetyAnswers,
      supersedesTransferId: spec.supersedesTransferId,
      priorReasonText: spec.priorReasonText,
    },
  };
}

function payeeOf(state: AppState, spec: DraftSpec, atIso: string): Payee {
  if (spec.payeeId) {
    const found = state.payees.find((p) => p.id === spec.payeeId);
    if (found) return found;
  }
  return materialisePayee({ ...spec.newPayee!, addedAt: atIso });
}

/** Create an already-decided transfer directly, for scenarios that need history. */
function seedTransfer(
  state: AppState,
  spec: DraftSpec,
  atMs: number,
  finalState: Transfer['state'],
  approval?: Transfer['approval'],
): { state: AppState; transfer: Transfer } {
  const atIso = iso(atMs);
  const payee = payeeOf(state, spec, atIso);
  const risk = assessRisk(
    {
      amountCents: spec.amountCents,
      reasonCategory: spec.reasonCategory,
      reasonText: spec.reasonText,
      safetyAnswers: spec.safetyAnswers,
      payee,
      createdAtMs: atMs,
    },
    riskContextFor(state, atMs),
  );
  const transfer: Transfer = {
    id: referenceCode(4),
    createdAt: atIso,
    createdBy: 'margaret',
    payee,
    amountCents: spec.amountCents,
    currency: 'EUR',
    reasonCategory: spec.reasonCategory,
    reasonText: spec.reasonText,
    safetyAnswers: spec.safetyAnswers,
    risk,
    state: finalState,
    ...(finalState === 'SENT' ? { sentAt: atIso } : {}),
    ...(approval ? { approval } : {}),
  };

  let next: AppState = { ...state, transfers: [...state.transfers, transfer] };
  next = {
    ...next,
    seq: next.seq + 1,
    audit: [
      ...next.audit,
      {
        id: `aud_seed_${next.seq + 1}`,
        seq: next.seq + 1,
        transferId: transfer.id,
        actor: 'margaret',
        action: 'created',
        fromState: 'DRAFT',
        toState: finalState,
        timestamp: atIso,
        note: 'Seeded by a demo scenario.',
      },
    ],
  };
  if (finalState === 'SENT') {
    const account = next.accounts.margaret;
    next = {
      ...next,
      accounts: {
        ...next.accounts,
        margaret: { ...account, balanceCents: (account.balanceCents ?? 0) - spec.amountCents },
      },
      payees: next.payees.map((p) =>
        p.iban === payee.iban
          ? { ...p, timesPaid: p.timesPaid + 1, lastPaidAt: atIso }
          : p,
      ),
    };
  }
  return { state: next, transfer };
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'normal_bill',
    title: '1. Normal bill',
    summary: 'EUR 62.40 to Northgate Energy, "Monthly electricity bill".',
    expected: 'LOW, score 0. Sends immediately. Proves the layer is not annoying.',
    build: (state) =>
      withDraft(state, {
        payeeId: 'payee_energy',
        amountCents: 6_240,
        reasonCategory: 'bill',
        reasonText: 'Monthly electricity bill',
        safetyAnswers: REASSURING,
      }),
  },
  {
    id: 'large_legitimate',
    title: '2. Legitimate large payment',
    summary: 'EUR 1,850 to Rosewood Garden Care for a new fence and gate.',
    expected: 'MEDIUM. Approval required, decided in two clicks.',
    build: (state) =>
      withDraft(state, {
        payeeId: 'payee_garden',
        amountCents: 185_000,
        reasonCategory: 'repairs',
        reasonText: 'New fence and gate, quoted in writing',
        safetyAnswers: REASSURING,
      }),
  },
  {
    id: 'new_payee_legitimate',
    title: '3. Legitimate new payee',
    summary: 'EUR 2,000 to a new tradesperson, honest reason, reassuring answers.',
    expected: 'MEDIUM, approval required, no scam explainer. The false-positive test.',
    build: (state) =>
      withDraft(state, {
        newPayee: {
          displayName: 'Van Dijk Roofing',
          iban: 'NL00DEMO61200034',
          countryCode: 'NL',
        },
        amountCents: 200_000,
        reasonCategory: 'repairs',
        reasonText: 'Roof repair after the storm, he came recommended by the neighbours',
        safetyAnswers: REASSURING,
      }),
  },
  {
    id: 'courier',
    title: '4. Courier / "safe account" scam',
    summary: 'EUR 4,500 to a new payee abroad, told to move money to a safe account.',
    expected: 'CRITICAL (100). Approval + 30-minute hold + courier explainer.',
    build: (state) =>
      withDraft(state, {
        newPayee: {
          displayName: 'Robert Klein',
          iban: 'DE00DEMO55667788',
          countryCode: 'DE',
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
      }),
  },
  {
    id: 'romance',
    title: '5. Romance scam',
    summary: 'EUR 900 to a new payee in a high-risk country, met online.',
    expected: 'HIGH. Approval required, romance explainer.',
    build: (state) =>
      withDraft(state, {
        newPayee: {
          displayName: 'Andre Costa',
          iban: 'XA00DEMO90011223',
          countryCode: 'XA',
        },
        amountCents: 90_000,
        reasonCategory: 'helping',
        reasonText:
          'Helping my friend I met online, he is stuck abroad and needs a hospital fee',
        safetyAnswers: REASSURING,
      }),
  },
  {
    id: 'invoice_redirect',
    title: '6. Invoice redirect',
    summary: 'EUR 1,200 to "Northgate Energy" at a different account number.',
    expected: 'Name check fails (no_match) plus changed-details wording. HIGH or above.',
    build: (state) =>
      withDraft(state, {
        newPayee: {
          displayName: 'Northgate Energy',
          iban: 'NL00DEMO12349876',
          countryCode: 'NL',
        },
        amountCents: 120_000,
        reasonCategory: 'bill',
        reasonText: 'They emailed me new bank details for the energy account',
        safetyAnswers: {
          contactedFirst: true,
          askedToKeepSecretOrHurry: false,
          verifiedOnKnownNumber: false,
        },
      }),
  },
  {
    id: 'splitting',
    title: '7. Threshold splitting',
    summary: 'Three EUR 480 payments to a known payee within three hours.',
    expected: 'The first two send. The third fires R04 + R09 + R18 and needs approval.',
    build: (state, nowMs) => {
      const spec: DraftSpec = {
        payeeId: 'payee_garden',
        amountCents: 48_000,
        reasonCategory: 'repairs',
        reasonText: 'Part payment for the new fence',
        safetyAnswers: REASSURING,
      };
      let next = seedTransfer(state, spec, nowMs - 3 * HOUR_MS, 'SENT').state;
      next = seedTransfer(next, spec, nowMs - HOUR_MS, 'SENT').state;
      return withDraft(next, spec);
    },
  },
  {
    id: 'tech_support',
    title: '8. Tech support scam',
    summary: 'EUR 2,000 refund fee after "Microsoft support" used remote access.',
    expected: 'CRITICAL. Approval + hold + tech support explainer.',
    build: (state) =>
      withDraft(state, {
        newPayee: {
          displayName: 'Support Refunds Ltd',
          iban: 'NL00DEMO88990011',
          countryCode: 'NL',
        },
        amountCents: 200_000,
        reasonCategory: 'other',
        reasonText:
          'Microsoft support helped me with my computer, they need a refund fee via AnyDesk',
        safetyAnswers: {
          contactedFirst: true,
          askedToKeepSecretOrHurry: false,
          verifiedOnKnownNumber: false,
        },
      }),
  },
  {
    id: 'resubmission',
    title: '9. Resubmission after a rejection',
    summary: 'The courier payment is rejected, then sent again with softer wording.',
    expected: 'R19 fires. The approval page shows the rejection and a reason diff.',
    build: (state, nowMs) => {
      const original: DraftSpec = {
        newPayee: {
          displayName: 'Robert Klein',
          iban: 'DE00DEMO55667788',
          countryCode: 'DE',
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
      const seeded = seedTransfer(state, original, nowMs - 2 * HOUR_MS, 'REJECTED', {
        decidedBy: 'david',
        decidedAt: iso(nowMs - HOUR_MS),
        decision: 'rejected',
        rejectionReason: 'I think this is a scam',
        note: 'Rang Mum — she had a call from someone claiming to be the bank.',
      });
      return withDraft(seeded.state, {
        newPayee: original.newPayee,
        amountCents: 450_000,
        reasonCategory: 'other',
        reasonText: 'Money for Robert, personal',
        safetyAnswers: {
          contactedFirst: false,
          askedToKeepSecretOrHurry: false,
          verifiedOnKnownNumber: true,
        },
        supersedesTransferId: seeded.transfer.id,
        priorReasonText: original.reasonText,
      });
    },
  },
];

export function applyScenario(state: AppState, scenarioId: string, nowMs: number): AppState {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return state;
  return scenario.build(state, nowMs);
}
