import { TIER_A, TIER_B } from '../data/riskKeywords';

/** Lower-case, strip diacritics, straighten apostrophes, collapse whitespace. */
export function normaliseText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const cache = new Map<string, RegExp>();

function matcher(keyword: string): RegExp {
  let re = cache.get(keyword);
  if (!re) {
    // Trailing `s?` so "gift cards" matches the "gift card" keyword.
    re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}s?($|[^a-z0-9])`, 'i');
    cache.set(keyword, re);
  }
  return re;
}

/** Distinct keywords from `list` present in `text`, word-boundary aware. */
export function matchKeywords(text: string, list: string[]): string[] {
  const haystack = normaliseText(text);
  if (!haystack) return [];
  const found = new Set<string>();
  for (const keyword of list) {
    if (matcher(normaliseText(keyword)).test(haystack)) found.add(keyword);
  }
  return [...found];
}

export function matchTierA(text: string): string[] {
  return matchKeywords(text, TIER_A);
}

export function matchTierB(text: string): string[] {
  return matchKeywords(text, TIER_B);
}
