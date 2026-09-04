import { DAY_MS, parse } from '../clock';
import { CONFIG } from '../config';
import type {
  HistoryTxn,
  Payee,
  ReasonCategory,
  SafetyAnswers,
  Settings,
  Transfer,
} from '../types';

export type RiskInput = {
  amountCents: number;
  reasonCategory: ReasonCategory;
  reasonText: string;
  safetyAnswers: SafetyAnswers;
  payee: Payee;
  createdAtMs: number;
  /** A reply to an approver's question is re-scored together with the reason. */
  extraText?: string;
  /** Set when this transfer replaces an earlier one. */
  supersedesTransferId?: string;
};

export type RiskContext = {
  nowMs: number;
  balanceCents: number;
  accountCountry: string;
  settings: Settings;
  history: HistoryTxn[];
  transfers: Transfer[];
};

/** States in which money is committed and should count towards limits. */
const COMMITTED = new Set(['SENT', 'APPROVED_HOLD', 'PENDING_APPROVAL', 'INFO_REQUESTED']);

export function ibanKey(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

/**
 * "Your usual payments": the last 90 days, EXCLUDING anything in the last 24
 * hours. A baseline that absorbs today's outliers lets an attacker re-baseline
 * what counts as normal within a single day.
 */
export function patternAmounts(ctx: RiskContext, nowMs: number): number[] {
  const from = nowMs - CONFIG.patternWindowDays * DAY_MS;
  const to = nowMs - DAY_MS;
  const fromHistory = ctx.history
    .filter((h) => parse(h.at) >= from && parse(h.at) <= to)
    .map((h) => h.amountCents);
  const fromTransfers = ctx.transfers
    .filter((t) => COMMITTED.has(t.state))
    .filter((t) => parse(t.createdAt) >= from && parse(t.createdAt) <= to)
    .map((t) => t.amountCents);
  return [...fromHistory, ...fromTransfers];
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function largest(values: number[]): number {
  return values.reduce((max, v) => (v > max ? v : max), 0);
}

/** Total already committed in the rolling 24 hours (excluding this transfer). */
export function rolling24hTotal(ctx: RiskContext, nowMs: number): number {
  const from = nowMs - DAY_MS;
  const fromHistory = ctx.history
    .filter((h) => parse(h.at) >= from)
    .reduce((sum, h) => sum + h.amountCents, 0);
  const fromTransfers = ctx.transfers
    .filter((t) => COMMITTED.has(t.state) && parse(t.createdAt) >= from)
    .reduce((sum, t) => sum + t.amountCents, 0);
  return fromHistory + fromTransfers;
}

/** Transfers to this payee in the rolling 24 hours (excluding this one). */
export function transfersToPayeeIn24h(
  ctx: RiskContext,
  payee: Payee,
  nowMs: number,
): Transfer[] {
  const from = nowMs - DAY_MS;
  const key = ibanKey(payee.iban);
  return ctx.transfers.filter(
    (t) =>
      COMMITTED.has(t.state) &&
      ibanKey(t.payee.iban) === key &&
      parse(t.createdAt) >= from,
  );
}

/** A rejection of this payee inside the R19 window. */
export function recentRejection(
  ctx: RiskContext,
  payee: Payee,
  nowMs: number,
): Transfer | undefined {
  const from = nowMs - CONFIG.rejectionWindowHours * 3_600_000;
  const key = ibanKey(payee.iban);
  return ctx.transfers
    .filter(
      (t) =>
        t.state === 'REJECTED' &&
        ibanKey(t.payee.iban) === key &&
        t.approval &&
        parse(t.approval.decidedAt) >= from,
    )
    .sort((a, b) => parse(b.approval!.decidedAt) - parse(a.approval!.decidedAt))[0];
}

/** Amounts previously paid to this payee, used by M03 (recurring amount). */
export function amountsPaidToPayee(ctx: RiskContext, payee: Payee): number[] {
  const key = ibanKey(payee.iban);
  const fromHistory = ctx.history
    .filter((h) => h.payeeId === payee.id)
    .map((h) => h.amountCents);
  const fromTransfers = ctx.transfers
    .filter((t) => t.state === 'SENT' && ibanKey(t.payee.iban) === key)
    .map((t) => t.amountCents);
  return [...fromHistory, ...fromTransfers];
}

export function reasonCorpus(input: RiskInput): string {
  return [input.reasonText, input.extraText].filter(Boolean).join(' \n ');
}
