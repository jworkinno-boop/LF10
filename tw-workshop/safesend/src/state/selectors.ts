import { CONFIG } from '../config';
import { parse } from '../clock';
import type { RiskContext } from '../risk/assessRisk';
import type { AppState, NotificationEvent, Persona, Transfer } from '../types';

export function riskContextFor(state: AppState, nowMs: number): RiskContext {
  return {
    nowMs,
    balanceCents: state.accounts.margaret.balanceCents ?? 0,
    accountCountry: state.accounts.margaret.countryCode,
    settings: state.settings,
    history: state.history,
    transfers: state.transfers,
  };
}

export const OPEN_STATES = new Set(['PENDING_APPROVAL', 'INFO_REQUESTED', 'APPROVED_HOLD']);

export function pendingForApprover(state: AppState): Transfer[] {
  const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  return state.transfers
    .filter((t) => t.state === 'PENDING_APPROVAL')
    .sort((a, b) => rank[a.risk.band] - rank[b.risk.band] || parse(a.createdAt) - parse(b.createdAt));
}

export function openForSender(state: AppState): Transfer[] {
  return state.transfers
    .filter((t) => OPEN_STATES.has(t.state))
    .sort((a, b) => parse(b.createdAt) - parse(a.createdAt));
}

export function recentTransfers(state: AppState, limit = 5): Transfer[] {
  return [...state.transfers]
    .sort((a, b) => parse(b.createdAt) - parse(a.createdAt))
    .slice(0, limit);
}

export function transferById(state: AppState, transferId: string): Transfer | undefined {
  return state.transfers.find((t) => t.id === transferId);
}

export function unreadCount(state: AppState, persona: Persona): number {
  return state.notifications.filter((n) => n.toPersona === persona && !n.readAt).length;
}

export function notificationsFor(state: AppState, persona: Persona): NotificationEvent[] {
  return state.notifications
    .filter((n) => n.toPersona === persona)
    .sort((a, b) => parse(b.createdAt) - parse(a.createdAt));
}

export function savedPayees(state: AppState) {
  return state.payees.filter((p) => p.isSaved);
}

export function trustedByApprover(state: AppState) {
  return state.payees.filter((p) => p.addedByApproverAt);
}

export function activeContact(state: AppState) {
  return state.contacts.find((c) => c.active);
}

/** Spend in the last 30 days, and the usual 90-day monthly average. */
export function spendSummary(state: AppState, nowMs: number) {
  const monthAgo = nowMs - 30 * 86_400_000;
  const windowStart = nowMs - CONFIG.patternWindowDays * 86_400_000;
  const sentInMonth = state.transfers
    .filter((t) => t.state === 'SENT' && parse(t.createdAt) >= monthAgo)
    .reduce((sum, t) => sum + t.amountCents, 0);
  const historyInMonth = state.history
    .filter((h) => parse(h.at) >= monthAgo)
    .reduce((sum, h) => sum + h.amountCents, 0);
  const historyInWindow = state.history
    .filter((h) => parse(h.at) >= windowStart)
    .reduce((sum, h) => sum + h.amountCents, 0);
  return {
    thisMonthCents: sentInMonth + historyInMonth,
    usualMonthCents: Math.round(historyInWindow / 3),
  };
}

/** Monthly totals for the 90-day bar chart on the approval page. */
export function monthlyPattern(state: AppState, nowMs: number) {
  const buckets = [0, 1, 2].map((i) => {
    const to = nowMs - i * 30 * 86_400_000;
    const from = to - 30 * 86_400_000;
    const total =
      state.history
        .filter((h) => parse(h.at) > from && parse(h.at) <= to)
        .reduce((sum, h) => sum + h.amountCents, 0) +
      state.transfers
        .filter((t) => t.state === 'SENT' && parse(t.createdAt) > from && parse(t.createdAt) <= to)
        .reduce((sum, t) => sum + t.amountCents, 0);
    return { label: i === 0 ? 'Last 30 days' : `${i * 30}-${(i + 1) * 30} days ago`, total };
  });
  return buckets.reverse();
}
