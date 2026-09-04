import { CONFIG } from './config';
import { DAY_MS, HOUR_MS, MINUTE_MS, now, parse, toDate } from './clock';

const money = new Intl.NumberFormat(CONFIG.locale, {
  style: 'currency',
  currency: CONFIG.currency,
});

/** Integer cents in, formatted currency out. Never format money any other way. */
export function formatMoney(cents: number): string {
  return money.format(cents / 100);
}

const dateFmt = new Intl.DateTimeFormat(CONFIG.locale, {
  timeZone: CONFIG.timeZone,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat(CONFIG.locale, {
  timeZone: CONFIG.timeZone,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dayKeyFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: CONFIG.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dayKey(ms: number): string {
  return dayKeyFmt.format(toDate(ms));
}

/** "Today at 10:42" / "Yesterday at 09:05" / "3 September 2026 at 14:20" */
export function formatDateTime(isoString: string): string {
  const ms = parse(isoString);
  const today = dayKey(now());
  const target = dayKey(ms);
  const time = timeFmt.format(toDate(ms));
  if (target === today) return `Today at ${time}`;
  if (target === dayKey(now() - DAY_MS)) return `Yesterday at ${time}`;
  return `${dateFmt.format(toDate(ms))} at ${time}`;
}

export function formatDate(isoString: string): string {
  return dateFmt.format(toDate(parse(isoString)));
}

/** "12 days ago", "3 months ago", "in 22 hours". Never raw ISO in the UI. */
export function formatRelative(isoString: string): string {
  const diff = now() - parse(isoString);
  const future = diff < 0;
  const abs = Math.abs(diff);
  const label = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? '' : 's'}`;

  let text: string;
  if (abs < MINUTE_MS) text = 'less than a minute';
  else if (abs < HOUR_MS) text = label(Math.round(abs / MINUTE_MS), 'minute');
  else if (abs < DAY_MS) text = label(Math.round(abs / HOUR_MS), 'hour');
  else if (abs < 60 * DAY_MS) text = label(Math.round(abs / DAY_MS), 'day');
  else if (abs < 365 * DAY_MS) text = label(Math.round(abs / (30 * DAY_MS)), 'month');
  else text = label(Math.round(abs / (365 * DAY_MS)), 'year');

  return future ? `in ${text}` : `${text} ago`;
}

/** Countdown as "29 minutes 04 seconds" / "23 hours 12 minutes". */
export function formatCountdown(untilIso: string): string {
  const remaining = Math.max(0, parse(untilIso) - now());
  const hours = Math.floor(remaining / HOUR_MS);
  const minutes = Math.floor((remaining % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((remaining % MINUTE_MS) / 1000);
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${String(seconds).padStart(2, '0')} sec`;
  return `${seconds} sec`;
}

/** "NL00DEMO0012 3456" grouped for reading aloud. */
export function formatIban(iban: string): string {
  return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function underThousand(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)];
    const r = n % 10;
    return r ? `${t}-${ONES[r]}` : t;
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  return r ? `${ONES[h]} hundred and ${underThousand(r)}` : `${ONES[h]} hundred`;
}

function wholeToWords(n: number): string {
  if (n === 0) return 'zero';
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions) parts.push(`${underThousand(millions)} million`);
  if (thousands) parts.push(`${underThousand(thousands)} thousand`);
  if (rest) parts.push(underThousand(rest));
  return parts.join(' ');
}

/** "four thousand five hundred euros and fifty cents" — read back at step 2. */
export function amountInWords(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  const eurosWords = `${wholeToWords(euros)} euro${euros === 1 ? '' : 's'}`;
  if (!rest) return eurosWords;
  return `${eurosWords} and ${wholeToWords(rest)} cent${rest === 1 ? '' : 's'}`;
}

/** Parse "1.234,56" / "1,234.56" / "1234.56" into integer cents. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalised = cleaned;
  if (lastComma > lastDot) {
    normalised = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    normalised = cleaned.replace(/,/g, '');
  }
  const value = Number(normalised);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
