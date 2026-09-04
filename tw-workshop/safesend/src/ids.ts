// Crockford base32, minus the digits that get misheard on the phone.
// David reads these codes aloud to Margaret, so no 0/O and no 1/I/L.
const DIGITS = '23456789';
const LETTERS = 'ABCDEFGHJKMNPQRSTVWXYZ';
const ALPHABET = DIGITS + LETTERS;

function randomInts(count: number): number[] {
  const out = new Uint32Array(count);
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(out);
    return Array.from(out);
  }
  return Array.from({ length: count }, () => Math.floor(Math.random() * 0xffffffff));
}

/** Short human-readable reference, e.g. "8F2R". */
export function referenceCode(length = 4): string {
  return randomInts(length)
    .map((n) => ALPHABET[n % ALPHABET.length])
    .join('');
}

export function id(prefix: string): string {
  return `${prefix}_${referenceCode(8)}`;
}
