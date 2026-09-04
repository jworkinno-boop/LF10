// The reducer is the only place transfer states change. Illegal transitions are
// rejected with a clear error, and EVERY transition writes an audit entry.
//
// Two rules the reducer must never break:
//   1. The sender has no bypass of the safety check or the approval requirement.
//   2. The approver has no veto over their own removal.

import { CONFIG } from '../config';
import { COPY } from '../copy';
import { iso, parse, plusHours, plusMinutes } from '../clock';
import { formatMoney } from '../format';
import { id, referenceCode } from '../ids';
import { assessRisk, bandRank } from '../risk/assessRisk';
import { materialisePayee } from './payees';
import { buildNotification } from './notifications';
import { riskContextFor } from './selectors';
import { seedState } from '../data/seed';
import { applyScenario } from '../data/scenarios';
import type {
  AppState,
  AuditEntry,
  NotificationType,
  Payee,
  Persona,
  SettingsField,
  TransferDraft,
  Transfer,
  TransferState,
} from '../types';

export type Action =
  | { type: 'SELECT_PERSONA'; persona: Persona | null }
  | { type: 'UNLOCK'; persona: Persona }
  | { type: 'LOCK'; persona: Persona }
  | { type: 'DRAFT_START'; supersedes?: string }
  | { type: 'DRAFT_PATCH'; patch: Partial<TransferDraft> }
  | { type: 'DRAFT_DISCARD' }
  | { type: 'SUBMIT_TRANSFER'; nowMs: number }
  | { type: 'CANCEL_TRANSFER'; transferId: string; actor: Persona; nowMs: number }
  | {
      type: 'APPROVE';
      transferId: string;
      actor: Persona;
      nowMs: number;
      note?: string;
      spokeToSenderConfirmed?: boolean;
    }
  | {
      type: 'REJECT';
      transferId: string;
      actor: Persona;
      nowMs: number;
      rejectionReason: string;
      note?: string;
    }
  | { type: 'ASK_QUESTION'; transferId: string; actor: Persona; nowMs: number; question: string }
  | { type: 'ANSWER_QUESTION'; transferId: string; actor: Persona; nowMs: number; answer: string }
  | { type: 'ADD_TRUSTED_PAYEE'; payeeId: string; actor: Persona; nowMs: number }
  | { type: 'REVOKE_TRUSTED_PAYEE'; payeeId: string; actor: Persona; nowMs: number }
  | {
      type: 'REQUEST_SETTINGS_CHANGE';
      field: SettingsField;
      value: unknown;
      actor: Persona;
      nowMs: number;
    }
  | { type: 'CANCEL_PENDING_CHANGE'; changeId: string; actor: Persona; nowMs: number }
  | {
      type: 'START_CONTACT_CHANGE';
      mode: 'remove' | 'replace' | 'activate_second';
      actor: Persona;
      nowMs: number;
      replacementContactId?: string;
    }
  | { type: 'MARK_NOTIFICATIONS_READ'; persona: Persona; nowMs: number }
  | { type: 'MATERIALISE'; nowMs: number }
  | { type: 'ADOPT'; state: AppState }
  | { type: 'RESET_DEMO' }
  | { type: 'LOAD_SCENARIO'; scenarioId: string; nowMs: number }
  | { type: 'CLOCK_CHANGED'; nowMs: number }
  | { type: 'CLEAR_ERROR' };

// --- small helpers -----------------------------------------------------------

export function emptyDraft(supersedes?: string): TransferDraft {
  return {
    step: 1,
    amountCents: null,
    reasonCategory: null,
    reasonText: '',
    safetyAnswers: {
      contactedFirst: null,
      askedToKeepSecretOrHurry: null,
      verifiedOnKnownNumber: null,
    },
    supersedesTransferId: supersedes,
  };
}

function bump(state: AppState): AppState {
  return { ...state, revision: state.revision + 1, lastError: null };
}

function audit(
  state: AppState,
  entry: Omit<AuditEntry, 'id' | 'seq'>,
): { state: AppState; entry: AuditEntry } {
  const seq = state.seq + 1;
  const full: AuditEntry = { id: id('aud'), seq, ...entry };
  return { state: { ...state, seq, audit: [...state.audit, full] }, entry: full };
}

function notify(
  state: AppState,
  args: {
    type: NotificationType;
    toPersona: Persona;
    createdAt: string;
    transfer?: Transfer;
    detail?: string;
  },
): AppState {
  return {
    ...state,
    notifications: [...state.notifications, buildNotification(args)],
  };
}

function fail(state: AppState, message: string): AppState {
  return { ...state, lastError: message };
}

function replaceTransfer(state: AppState, transfer: Transfer): AppState {
  return {
    ...state,
    transfers: state.transfers.map((t) => (t.id === transfer.id ? transfer : t)),
  };
}

/** Commit the money movement (mock) and update the payee's history. */
function applySend(state: AppState, transfer: Transfer, atIso: string): AppState {
  const account = state.accounts.margaret;
  const nextAccounts = {
    ...state.accounts,
    margaret: {
      ...account,
      balanceCents: (account.balanceCents ?? 0) - transfer.amountCents,
    },
  };
  const key = transfer.payee.iban;
  const known = state.payees.some((p) => p.iban === key);
  const nextPayees = known
    ? state.payees.map((p) =>
        p.iban === key
          ? { ...p, timesPaid: p.timesPaid + 1, lastPaidAt: atIso, status: p.status === 'new' ? 'known' : p.status }
          : p,
      )
    : [
        ...state.payees,
        { ...transfer.payee, timesPaid: 1, lastPaidAt: atIso, status: 'known' as const },
      ];
  return { ...state, accounts: nextAccounts, payees: nextPayees };
}

const NOT_FOUND = 'That payment could not be found.';

// --- time materialisation ----------------------------------------------------

/**
 * Pure and idempotent. There is no server, so time-driven transitions are
 * materialised lazily whenever the app looks at the clock.
 */
export function materialiseTime(state: AppState, nowMs: number): AppState {
  let next = state;
  let changed = false;
  const atIso = iso(nowMs);

  for (const transfer of state.transfers) {
    if (transfer.state === 'APPROVED_HOLD' && transfer.holdUntil && nowMs >= parse(transfer.holdUntil)) {
      const sent: Transfer = { ...transfer, state: 'SENT', sentAt: atIso };
      next = replaceTransfer(next, sent);
      next = applySend(next, sent, atIso);
      next = audit(next, {
        transferId: sent.id,
        actor: 'system',
        action: 'hold_elapsed',
        fromState: 'APPROVED_HOLD',
        toState: 'SENT',
        timestamp: atIso,
        note: 'The 30-minute wait finished.',
      }).state;
      next = notify(next, { type: 'sent', toPersona: 'margaret', createdAt: atIso, transfer: sent });
      next = notify(next, { type: 'sent', toPersona: 'david', createdAt: atIso, transfer: sent });
      changed = true;
    }

    if (
      transfer.state === 'PENDING_APPROVAL' &&
      transfer.expiresAt &&
      nowMs >= parse(transfer.expiresAt)
    ) {
      const expired: Transfer = { ...transfer, state: 'EXPIRED' };
      next = replaceTransfer(next, expired);
      next = audit(next, {
        transferId: expired.id,
        actor: 'system',
        action: 'expired',
        fromState: 'PENDING_APPROVAL',
        toState: 'EXPIRED',
        timestamp: atIso,
        note: 'No decision within 24 hours.',
      }).state;
      next = notify(next, { type: 'expired', toPersona: 'margaret', createdAt: atIso, transfer: expired });
      next = notify(next, { type: 'expired', toPersona: 'david', createdAt: atIso, transfer: expired });
      changed = true;
    }
  }

  const due = state.pendingChanges.filter((c) => nowMs >= parse(c.effectiveAt));
  for (const change of due) {
    next = commitPendingChange(next, change.id, atIso);
    changed = true;
  }

  return changed ? { ...next, revision: next.revision + 1 } : state;
}

function commitPendingChange(state: AppState, changeId: string, atIso: string): AppState {
  const change = state.pendingChanges.find((c) => c.id === changeId);
  if (!change) return state;
  let next: AppState = {
    ...state,
    pendingChanges: state.pendingChanges.filter((c) => c.id !== changeId),
  };

  if (change.field === 'approverRemoved') {
    next = {
      ...next,
      contacts: next.contacts.map((c) => (c.active ? { ...c, active: false } : c)),
    };
  } else if (change.field === 'approverReplaced') {
    const replacementId = String(change.newValue);
    next = {
      ...next,
      contacts: next.contacts.map((c) => ({ ...c, active: c.id === replacementId })),
    };
  } else if (change.field === 'secondContactActivated') {
    next = {
      ...next,
      contacts: next.contacts.map((c) =>
        c.id === 'contact_jean' ? { ...c, active: true } : c,
      ),
      settings: { ...next.settings, secondContactActive: true },
    };
  } else if (change.field === 'trustedPayeeAdded') {
    const payeeId = String(change.newValue);
    next = {
      ...next,
      payees: next.payees.map((p) =>
        p.id === payeeId ? { ...p, status: 'trusted', addedByApproverAt: atIso } : p,
      ),
    };
  } else {
    next = {
      ...next,
      settings: { ...next.settings, [change.field]: change.newValue } as AppState['settings'],
    };
  }

  next = audit(next, {
    actor: 'system',
    action: 'settings_change_applied',
    fromState: String(change.currentValue),
    toState: String(change.newValue),
    timestamp: atIso,
    note: change.label,
  }).state;
  next = notify(next, {
    type: 'settings_change_applied',
    toPersona: 'margaret',
    createdAt: atIso,
    detail: change.label,
  });
  next = notify(next, {
    type: 'settings_change_applied',
    toPersona: 'david',
    createdAt: atIso,
    detail: change.label,
  });
  return next;
}

// --- settings change policy --------------------------------------------------

type ChangePolicy = {
  allowed: Persona[];
  delayed: boolean;
  cancellableBy: Persona[];
  label: string;
};

/**
 * Protection can always be STRENGTHENED instantly and WEAKENED only on a delay.
 * Removing the trusted contact is the sender's decision alone — the approver
 * gets no veto, because most financial abuse of older adults is by family.
 */
export function changePolicy(
  field: SettingsField,
  currentValue: unknown,
  newValue: unknown,
): ChangePolicy {
  switch (field) {
    case 'approvalThresholdCents': {
      const raising = Number(newValue) > Number(currentValue);
      return raising
        ? {
            allowed: ['david'],
            delayed: true,
            cancellableBy: ['margaret', 'david'],
            label: `Raise the checking amount from ${formatMoney(Number(currentValue))} to ${formatMoney(Number(newValue))}`,
          }
        : {
            allowed: ['margaret', 'david'],
            delayed: false,
            cancellableBy: [],
            label: `Lower the checking amount to ${formatMoney(Number(newValue))}`,
          };
    }
    case 'dailyLimitCents': {
      const raising = Number(newValue) > Number(currentValue);
      return raising
        ? {
            allowed: ['david'],
            delayed: true,
            cancellableBy: ['margaret', 'david'],
            label: `Raise the daily amount to ${formatMoney(Number(newValue))}`,
          }
        : {
            allowed: ['margaret', 'david'],
            delayed: false,
            cancellableBy: [],
            label: `Lower the daily amount to ${formatMoney(Number(newValue))}`,
          };
    }
    case 'alwaysApproveNewPayees':
    case 'alwaysApproveCrossBorder': {
      const weakening = newValue === false;
      const name =
        field === 'alwaysApproveNewPayees' ? 'always check new payees' : 'always check payments abroad';
      return weakening
        ? {
            allowed: ['david'],
            delayed: true,
            cancellableBy: ['margaret', 'david'],
            label: `Turn off "${name}"`,
          }
        : {
            allowed: ['margaret', 'david'],
            delayed: false,
            cancellableBy: [],
            label: `Turn on "${name}"`,
          };
    }
    case 'blockCriticalOutright': {
      const strengthening = newValue === true;
      return strengthening
        ? {
            allowed: ['margaret', 'david'],
            delayed: false,
            cancellableBy: [],
            label: 'Turn on "block the riskiest payments outright"',
          }
        : {
            allowed: ['david'],
            delayed: true,
            cancellableBy: ['margaret', 'david'],
            label: 'Turn off "block the riskiest payments outright"',
          };
    }
    case 'trustedPayeeAdded':
      return {
        allowed: ['david'],
        delayed: true,
        cancellableBy: ['margaret', 'david'],
        label: 'Add a payee to the trusted list',
      };
    case 'approverRemoved':
      return {
        allowed: ['margaret'],
        delayed: true,
        cancellableBy: ['margaret'],
        label: `Stop asking ${COPY.people.approver.first} to check payments`,
      };
    case 'approverReplaced':
      return {
        allowed: ['margaret'],
        delayed: true,
        cancellableBy: ['margaret'],
        label: 'Change who helps with payments',
      };
    case 'secondContactActivated':
      return {
        allowed: ['margaret'],
        delayed: true,
        cancellableBy: ['margaret'],
        label: `Also ask ${COPY.people.secondContact.first} to help`,
      };
    default:
      return { allowed: ['david'], delayed: true, cancellableBy: ['margaret', 'david'], label: 'Change a setting' };
  }
}

// --- submission --------------------------------------------------------------

function resolvePayee(state: AppState, draft: TransferDraft, atIso: string): Payee | null {
  if (draft.payeeId) return state.payees.find((p) => p.id === draft.payeeId) ?? null;
  if (draft.newPayee) {
    return materialisePayee({
      displayName: draft.newPayee.displayName,
      iban: draft.newPayee.iban,
      countryCode: draft.newPayee.countryCode,
      addedAt: atIso,
      isSaved: draft.newPayee.save,
    });
  }
  return null;
}

export function draftIsComplete(draft: TransferDraft): boolean {
  const a = draft.safetyAnswers;
  return Boolean(
    (draft.payeeId || draft.newPayee) &&
      draft.amountCents &&
      draft.amountCents > 0 &&
      draft.reasonCategory &&
      draft.reasonText.trim().length >= CONFIG.minReasonChars &&
      a.contactedFirst !== null &&
      a.askedToKeepSecretOrHurry !== null &&
      a.verifiedOnKnownNumber !== null,
  );
}

function submit(state: AppState, nowMs: number): AppState {
  const draft = state.draft;
  if (!draft) return fail(state, 'There is no payment to send.');
  // No bypass: an incomplete safety check can never produce a transfer.
  if (!draftIsComplete(draft)) return fail(state, 'Please finish all five steps first.');

  const atIso = iso(nowMs);
  const payee = resolvePayee(state, draft, atIso);
  if (!payee) return fail(state, 'We could not find who you are paying.');

  const risk = assessRisk(
    {
      amountCents: draft.amountCents!,
      reasonCategory: draft.reasonCategory!,
      reasonText: draft.reasonText,
      safetyAnswers: draft.safetyAnswers,
      payee,
      createdAtMs: nowMs,
      supersedesTransferId: draft.supersedesTransferId,
    },
    riskContextFor(state, nowMs),
  );

  const blocked = risk.band === 'CRITICAL' && state.settings.blockCriticalOutright;
  const nextState: TransferState = blocked
    ? 'BLOCKED'
    : risk.requiresApproval
      ? 'PENDING_APPROVAL'
      : 'SENT';

  const transfer: Transfer = {
    id: referenceCode(4),
    createdAt: atIso,
    createdBy: 'margaret',
    payee,
    amountCents: draft.amountCents!,
    currency: 'EUR',
    reasonCategory: draft.reasonCategory!,
    reasonText: draft.reasonText.trim(),
    safetyAnswers: draft.safetyAnswers,
    risk,
    state: nextState,
    ...(draft.supersedesTransferId
      ? { supersedesTransferId: draft.supersedesTransferId, priorReasonText: draft.priorReasonText }
      : {}),
    ...(nextState === 'PENDING_APPROVAL'
      ? { expiresAt: iso(plusHours(nowMs, CONFIG.approvalExpiryHours)) }
      : {}),
    ...(nextState === 'SENT' ? { sentAt: atIso } : {}),
  };

  let next: AppState = {
    ...state,
    transfers: [...state.transfers, transfer],
    draft: null,
  };

  if (payee.isSaved && !state.payees.some((p) => p.iban === payee.iban)) {
    next = { ...next, payees: [...next.payees, payee] };
  }

  next = audit(next, {
    transferId: transfer.id,
    actor: 'margaret',
    action: 'created',
    fromState: 'DRAFT',
    toState: nextState,
    timestamp: atIso,
    note: `${formatMoney(transfer.amountCents)} to ${payee.displayName} — ${risk.band}`,
  }).state;

  if (nextState === 'SENT') {
    next = applySend(next, transfer, atIso);
    next = notify(next, { type: 'sent', toPersona: 'margaret', createdAt: atIso, transfer });
  } else if (nextState === 'PENDING_APPROVAL') {
    next = notify(next, {
      type: 'approval_requested',
      toPersona: 'david',
      createdAt: atIso,
      transfer,
    });
  } else {
    next = notify(next, { type: 'blocked', toPersona: 'margaret', createdAt: atIso, transfer });
    next = notify(next, { type: 'blocked', toPersona: 'david', createdAt: atIso, transfer });
  }

  return bump(next);
}

// --- the reducer -------------------------------------------------------------

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SELECT_PERSONA':
      return bump({ ...state, activePersona: action.persona });

    case 'UNLOCK':
      return bump({
        ...state,
        activePersona: action.persona,
        unlocked: state.unlocked.includes(action.persona)
          ? state.unlocked
          : [...state.unlocked, action.persona],
      });

    case 'LOCK':
      return bump({
        ...state,
        activePersona: state.activePersona === action.persona ? null : state.activePersona,
        unlocked: state.unlocked.filter((p) => p !== action.persona),
      });

    case 'DRAFT_START': {
      const prior = action.supersedes
        ? state.transfers.find((t) => t.id === action.supersedes)
        : undefined;
      const draft = emptyDraft(action.supersedes);
      if (prior) {
        draft.payeeId = state.payees.find((p) => p.iban === prior.payee.iban)?.id;
        if (!draft.payeeId) {
          draft.newPayee = {
            displayName: prior.payee.displayName,
            iban: prior.payee.iban,
            countryCode: prior.payee.countryCode,
            save: false,
          };
        }
        draft.amountCents = prior.amountCents;
        draft.reasonCategory = prior.reasonCategory;
        draft.priorReasonText = prior.reasonText;
      }
      return bump({ ...state, draft });
    }

    case 'DRAFT_PATCH':
      return bump({
        ...state,
        draft: { ...(state.draft ?? emptyDraft()), ...action.patch },
      });

    case 'DRAFT_DISCARD':
      return bump({ ...state, draft: null });

    case 'SUBMIT_TRANSFER':
      return submit(state, action.nowMs);

    case 'CANCEL_TRANSFER': {
      const transfer = state.transfers.find((t) => t.id === action.transferId);
      if (!transfer) return fail(state, NOT_FOUND);
      const cancellable =
        transfer.state === 'PENDING_APPROVAL' ||
        transfer.state === 'INFO_REQUESTED' ||
        transfer.state === 'APPROVED_HOLD';
      if (!cancellable) return fail(state, COPY.errors.illegalTransition);
      // Only the sender may cancel, except during the cooling-off hold, where
      // either party may pull the payment back.
      if (action.actor !== 'margaret' && transfer.state !== 'APPROVED_HOLD') {
        return fail(state, COPY.errors.senderOnly);
      }
      const atIso = iso(action.nowMs);
      const cancelled: Transfer = { ...transfer, state: 'CANCELLED' };
      let next = replaceTransfer(state, cancelled);
      next = audit(next, {
        transferId: transfer.id,
        actor: action.actor,
        action: 'cancelled',
        fromState: transfer.state,
        toState: 'CANCELLED',
        timestamp: atIso,
      }).state;
      next = notify(next, {
        type: 'cancelled',
        toPersona: action.actor === 'margaret' ? 'david' : 'margaret',
        createdAt: atIso,
        transfer: cancelled,
      });
      return bump(next);
    }

    case 'APPROVE': {
      const transfer = state.transfers.find((t) => t.id === action.transferId);
      if (!transfer) return fail(state, NOT_FOUND);
      if (action.actor !== 'david') return fail(state, COPY.errors.approverOnly);
      if (transfer.state !== 'PENDING_APPROVAL') return fail(state, COPY.errors.illegalTransition);
      if (
        bandRank(transfer.risk.band) >= bandRank('HIGH') &&
        !action.spokeToSenderConfirmed
      ) {
        return fail(
          state,
          `Please confirm you have spoken to ${COPY.people.sender.first} before approving this.`,
        );
      }

      const atIso = iso(action.nowMs);
      const hold = transfer.risk.coolingOffMinutes > 0;
      const approved: Transfer = {
        ...transfer,
        state: hold ? 'APPROVED_HOLD' : 'SENT',
        approval: {
          decidedBy: 'david',
          decidedAt: atIso,
          decision: 'approved',
          note: action.note,
          spokeToSenderConfirmed: action.spokeToSenderConfirmed,
        },
        ...(hold
          ? { holdUntil: iso(plusMinutes(action.nowMs, transfer.risk.coolingOffMinutes)) }
          : { sentAt: atIso }),
      };

      let next = replaceTransfer(state, approved);
      next = audit(next, {
        transferId: transfer.id,
        actor: 'david',
        action: 'approved',
        fromState: 'PENDING_APPROVAL',
        toState: approved.state,
        timestamp: atIso,
        note: action.note,
      }).state;
      if (hold) {
        next = notify(next, { type: 'hold_started', toPersona: 'margaret', createdAt: atIso, transfer: approved });
        next = notify(next, { type: 'hold_started', toPersona: 'david', createdAt: atIso, transfer: approved });
      } else {
        next = applySend(next, approved, atIso);
        next = notify(next, { type: 'approved', toPersona: 'margaret', createdAt: atIso, transfer: approved });
      }
      return bump(next);
    }

    case 'REJECT': {
      const transfer = state.transfers.find((t) => t.id === action.transferId);
      if (!transfer) return fail(state, NOT_FOUND);
      if (action.actor !== 'david') return fail(state, COPY.errors.approverOnly);
      if (transfer.state !== 'PENDING_APPROVAL') return fail(state, COPY.errors.illegalTransition);
      if (!action.rejectionReason) return fail(state, 'Please choose a reason.');

      const atIso = iso(action.nowMs);
      const rejected: Transfer = {
        ...transfer,
        state: 'REJECTED',
        approval: {
          decidedBy: 'david',
          decidedAt: atIso,
          decision: 'rejected',
          rejectionReason: action.rejectionReason,
          note: action.note,
        },
      };
      let next = replaceTransfer(state, rejected);
      next = audit(next, {
        transferId: transfer.id,
        actor: 'david',
        action: 'rejected',
        fromState: 'PENDING_APPROVAL',
        toState: 'REJECTED',
        timestamp: atIso,
        note: action.rejectionReason,
      }).state;
      next = notify(next, {
        type: 'rejected',
        toPersona: 'margaret',
        createdAt: atIso,
        transfer: rejected,
        detail: action.rejectionReason,
      });
      return bump(next);
    }

    case 'ASK_QUESTION': {
      const transfer = state.transfers.find((t) => t.id === action.transferId);
      if (!transfer) return fail(state, NOT_FOUND);
      if (action.actor !== 'david') return fail(state, COPY.errors.approverOnly);
      if (transfer.state !== 'PENDING_APPROVAL') return fail(state, COPY.errors.illegalTransition);
      if (!action.question.trim()) return fail(state, 'Please type a question.');

      const atIso = iso(action.nowMs);
      const asked: Transfer = {
        ...transfer,
        state: 'INFO_REQUESTED',
        infoRequest: { question: action.question.trim(), askedAt: atIso },
      };
      let next = replaceTransfer(state, asked);
      next = audit(next, {
        transferId: transfer.id,
        actor: 'david',
        action: 'asked_question',
        fromState: 'PENDING_APPROVAL',
        toState: 'INFO_REQUESTED',
        timestamp: atIso,
        note: action.question.trim(),
      }).state;
      next = notify(next, {
        type: 'info_requested',
        toPersona: 'margaret',
        createdAt: atIso,
        transfer: asked,
        detail: action.question.trim(),
      });
      return bump(next);
    }

    case 'ANSWER_QUESTION': {
      const transfer = state.transfers.find((t) => t.id === action.transferId);
      if (!transfer) return fail(state, NOT_FOUND);
      if (action.actor !== 'margaret') return fail(state, COPY.errors.senderOnly);
      if (transfer.state !== 'INFO_REQUESTED') return fail(state, COPY.errors.illegalTransition);
      if (!action.answer.trim()) return fail(state, 'Please write a reply.');

      const atIso = iso(action.nowMs);
      // Re-score including the reply. The band may rise; it may never silently fall.
      const rescored = assessRisk(
        {
          amountCents: transfer.amountCents,
          reasonCategory: transfer.reasonCategory,
          reasonText: transfer.reasonText,
          extraText: action.answer,
          safetyAnswers: transfer.safetyAnswers,
          payee: transfer.payee,
          createdAtMs: action.nowMs,
        },
        riskContextFor(state, action.nowMs),
      );
      const rose = bandRank(rescored.band) > bandRank(transfer.risk.band);
      const nextRisk = bandRank(rescored.band) < bandRank(transfer.risk.band)
        ? { ...rescored, band: transfer.risk.band, score: Math.max(rescored.score, transfer.risk.score) }
        : rescored;

      const answered: Transfer = {
        ...transfer,
        state: 'PENDING_APPROVAL',
        priorRisk: transfer.risk,
        risk: nextRisk,
        expiresAt: iso(plusHours(action.nowMs, CONFIG.approvalExpiryHours)),
        infoRequest: {
          ...transfer.infoRequest!,
          answer: action.answer.trim(),
          answeredAt: atIso,
        },
      };
      let next = replaceTransfer(state, answered);
      next = audit(next, {
        transferId: transfer.id,
        actor: 'margaret',
        action: 'answered_question',
        fromState: 'INFO_REQUESTED',
        toState: 'PENDING_APPROVAL',
        timestamp: atIso,
        note: rose
          ? `Risk increased after the reply: ${transfer.risk.band} to ${nextRisk.band}`
          : 'Re-checked after the reply.',
      }).state;
      next = notify(next, {
        type: 'info_answered',
        toPersona: 'david',
        createdAt: atIso,
        transfer: answered,
        detail: action.answer.trim(),
      });
      return bump(next);
    }

    case 'ADD_TRUSTED_PAYEE': {
      if (action.actor !== 'david') return fail(state, COPY.errors.approverOnly);
      const payee = state.payees.find((p) => p.id === action.payeeId);
      if (!payee) return fail(state, 'We could not find that payee.');
      const policy = changePolicy('trustedPayeeAdded', payee.status, payee.id);
      const atIso = iso(action.nowMs);
      const change = {
        id: id('chg'),
        field: 'trustedPayeeAdded' as SettingsField,
        currentValue: payee.status,
        newValue: payee.id,
        requestedBy: 'david' as Persona,
        requestedAt: atIso,
        effectiveAt: iso(plusHours(action.nowMs, CONFIG.settingsDelayHours)),
        cancellableBy: policy.cancellableBy,
        label: `Add ${payee.displayName} to the trusted list`,
      };
      let next: AppState = { ...state, pendingChanges: [...state.pendingChanges, change] };
      next = audit(next, {
        actor: 'david',
        action: 'settings_change_requested',
        toState: change.label,
        timestamp: atIso,
        note: `Takes effect ${CONFIG.settingsDelayHours}h later. ${COPY.people.sender.first} can undo it at any time.`,
      }).state;
      next = notify(next, {
        type: 'trusted_payee_added',
        toPersona: 'margaret',
        createdAt: atIso,
        detail: change.label,
      });
      return bump(next);
    }

    case 'REVOKE_TRUSTED_PAYEE': {
      // The sender can always undo this, before or after it takes effect.
      if (action.actor !== 'margaret') return fail(state, COPY.errors.senderOnly);
      const payee = state.payees.find((p) => p.id === action.payeeId);
      if (!payee) return fail(state, 'We could not find that payee.');
      const atIso = iso(action.nowMs);
      let next: AppState = {
        ...state,
        payees: state.payees.map((p) =>
          p.id === payee.id
            ? { ...p, status: p.timesPaid > 0 ? 'known' : 'new', addedByApproverAt: undefined }
            : p,
        ),
        pendingChanges: state.pendingChanges.filter(
          (c) => !(c.field === 'trustedPayeeAdded' && c.newValue === payee.id),
        ),
      };
      next = audit(next, {
        actor: 'margaret',
        action: 'trusted_payee_revoked',
        toState: payee.displayName,
        timestamp: atIso,
      }).state;
      next = notify(next, {
        type: 'trusted_payee_revoked',
        toPersona: 'david',
        createdAt: atIso,
        detail: `${COPY.people.sender.first} removed ${payee.displayName} from the trusted list.`,
      });
      return bump(next);
    }

    case 'REQUEST_SETTINGS_CHANGE': {
      const field = action.field as keyof AppState['settings'];
      const current = state.settings[field];
      if (current === action.value) return state;
      const policy = changePolicy(action.field, current, action.value);
      if (!policy.allowed.includes(action.actor)) {
        return fail(
          state,
          action.actor === 'margaret'
            ? 'Only your trusted contact can make this change, and it takes 24 hours.'
            : COPY.errors.illegalTransition,
        );
      }
      const atIso = iso(action.nowMs);

      if (!policy.delayed) {
        let next: AppState = {
          ...state,
          settings: { ...state.settings, [field]: action.value } as AppState['settings'],
        };
        next = audit(next, {
          actor: action.actor,
          action: 'settings_changed',
          fromState: String(current),
          toState: String(action.value),
          timestamp: atIso,
          note: policy.label,
        }).state;
        next = notify(next, {
          type: 'settings_change_applied',
          toPersona: action.actor === 'margaret' ? 'david' : 'margaret',
          createdAt: atIso,
          detail: policy.label,
        });
        return bump(next);
      }

      const change = {
        id: id('chg'),
        field: action.field,
        currentValue: current,
        newValue: action.value,
        requestedBy: action.actor,
        requestedAt: atIso,
        effectiveAt: iso(plusHours(action.nowMs, CONFIG.settingsDelayHours)),
        cancellableBy: policy.cancellableBy,
        label: policy.label,
      };
      let next: AppState = { ...state, pendingChanges: [...state.pendingChanges, change] };
      next = audit(next, {
        actor: action.actor,
        action: 'settings_change_requested',
        fromState: String(current),
        toState: String(action.value),
        timestamp: atIso,
        note: policy.label,
      }).state;
      for (const persona of ['margaret', 'david'] as Persona[]) {
        next = notify(next, {
          type: 'settings_change_pending',
          toPersona: persona,
          createdAt: atIso,
          detail: policy.label,
        });
      }
      return bump(next);
    }

    case 'CANCEL_PENDING_CHANGE': {
      const change = state.pendingChanges.find((c) => c.id === action.changeId);
      if (!change) return fail(state, 'That change could not be found.');
      if (!change.cancellableBy.includes(action.actor)) {
        return fail(
          state,
          `Only ${change.cancellableBy.map((p) => (p === 'margaret' ? COPY.people.sender.first : COPY.people.approver.first)).join(' or ')} can cancel this.`,
        );
      }
      const atIso = iso(action.nowMs);
      let next: AppState = {
        ...state,
        pendingChanges: state.pendingChanges.filter((c) => c.id !== action.changeId),
      };
      next = audit(next, {
        actor: action.actor,
        action: 'settings_change_cancelled',
        toState: change.label,
        timestamp: atIso,
      }).state;
      for (const persona of ['margaret', 'david'] as Persona[]) {
        next = notify(next, {
          type: 'settings_change_cancelled',
          toPersona: persona,
          createdAt: atIso,
          detail: change.label,
        });
      }
      return bump(next);
    }

    case 'START_CONTACT_CHANGE': {
      // Sender only. There is deliberately no approver veto anywhere here.
      if (action.actor !== 'margaret') return fail(state, COPY.errors.senderOnly);
      const field: SettingsField =
        action.mode === 'remove'
          ? 'approverRemoved'
          : action.mode === 'replace'
            ? 'approverReplaced'
            : 'secondContactActivated';
      const policy = changePolicy(field, 'active', action.replacementContactId ?? true);
      const atIso = iso(action.nowMs);
      const change = {
        id: id('chg'),
        field,
        currentValue: state.contacts.find((c) => c.active)?.name ?? 'none',
        newValue: action.replacementContactId ?? true,
        requestedBy: 'margaret' as Persona,
        requestedAt: atIso,
        effectiveAt: iso(plusHours(action.nowMs, CONFIG.settingsDelayHours)),
        cancellableBy: policy.cancellableBy,
        label: policy.label,
      };
      let next: AppState = { ...state, pendingChanges: [...state.pendingChanges, change] };
      next = audit(next, {
        actor: 'margaret',
        action: 'contact_change_requested',
        toState: policy.label,
        timestamp: atIso,
        note: `Takes effect in ${CONFIG.settingsDelayHours} hours. Only ${COPY.people.sender.first} can cancel it.`,
      }).state;
      for (const persona of ['margaret', 'david'] as Persona[]) {
        next = notify(next, {
          type: 'contact_removal_pending',
          toPersona: persona,
          createdAt: atIso,
          detail: policy.label,
        });
      }
      return bump(next);
    }

    case 'MARK_NOTIFICATIONS_READ': {
      const atIso = iso(action.nowMs);
      if (!state.notifications.some((n) => n.toPersona === action.persona && !n.readAt)) {
        return state;
      }
      return bump({
        ...state,
        notifications: state.notifications.map((n) =>
          n.toPersona === action.persona && !n.readAt ? { ...n, readAt: atIso } : n,
        ),
      });
    }

    case 'MATERIALISE':
    case 'CLOCK_CHANGED':
      return materialiseTime(state, action.nowMs);

    case 'ADOPT':
      return action.state;

    case 'RESET_DEMO':
      return { ...seedState(), revision: state.revision + 1 };

    case 'LOAD_SCENARIO':
      return bump(applyScenario(seedState(), action.scenarioId, action.nowMs));

    case 'CLEAR_ERROR':
      return state.lastError ? { ...state, lastError: null } : state;

    default:
      return state;
  }
}
