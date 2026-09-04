// The ONLY module allowed to touch Date.now() / new Date().
// Everything time-dependent in SafeSend reads from here so the demo clock can be
// frozen, advanced and reset deterministically.

import { CONFIG } from './config';

/** Frozen seed epoch. All seeded data is relative to this instant. */
export const DEMO_NOW = '2026-09-03T10:42:00+02:00';

const OFFSET_KEY = 'safesend.clock.v1';

const demoNowMs = new Date(DEMO_NOW).getTime();

type Mode = 'frozen' | 'live';

/** The demo runs on a frozen clock so screenshots and "12 days ago" stay stable. */
let mode: Mode = 'frozen';
let offsetMs = 0;

function readPersistedOffset(): number {
  try {
    const raw = globalThis.localStorage?.getItem(OFFSET_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function persistOffset(): void {
  try {
    globalThis.localStorage?.setItem(OFFSET_KEY, String(offsetMs));
  } catch {
    /* storage unavailable — the demo still works, it just forgets the clock */
  }
}

offsetMs = readPersistedOffset();

export function now(): number {
  return (mode === 'frozen' ? demoNowMs : Date.now()) + offsetMs;
}

export function nowIso(): string {
  return iso(now());
}

/** Move the demo clock forwards (or backwards) by a number of milliseconds. */
export function advance(ms: number): void {
  offsetMs += ms;
  persistOffset();
}

export function setNow(isoString: string): void {
  offsetMs = new Date(isoString).getTime() - demoNowMs;
  persistOffset();
}

export function reset(): void {
  offsetMs = 0;
  mode = 'frozen';
  persistOffset();
}

export function getOffset(): number {
  return offsetMs;
}

/** Used by cross-tab sync so both tabs share one clock. */
export function setOffset(ms: number): void {
  if (ms === offsetMs) return;
  offsetMs = ms;
  persistOffset();
}

// --- Date construction helpers (kept here so no other module calls new Date) ---

export function parse(isoString: string): number {
  return new Date(isoString).getTime();
}

export function iso(ms: number): string {
  return new Date(ms).toISOString();
}

export function toDate(ms: number): Date {
  return new Date(ms);
}

export function plusMinutes(ms: number, minutes: number): number {
  return ms + minutes * 60_000;
}

export function plusHours(ms: number, hours: number): number {
  return ms + hours * 3_600_000;
}

export function plusDays(ms: number, days: number): number {
  return ms + days * 86_400_000;
}

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CONFIG.timeZone,
  hour: '2-digit',
  hour12: false,
});

/** Local (Europe/Amsterdam) hour, 0–23. Used by R10 (night-time payments). */
export function localHour(ms: number): number {
  const parts = hourFormatter.format(new Date(ms));
  const n = Number(parts);
  return Number.isFinite(n) ? n % 24 : 12;
}
