/**
 * Copies the DM Sans woff2 files out of node_modules into public/fonts/.
 *
 * The fonts are committed rather than imported so nothing is fetched at
 * runtime: the nginx CSP is `default-src 'self'` and the "zero further
 * requests" claim in the README is enforced by it, not merely asserted. This
 * script exists so the committed binaries have a recorded provenance and can be
 * refreshed with one command instead of by hand.
 *
 *   npm run fonts:sync
 *
 * Only the upright weight-axis subsets are copied. One variable file covers
 * every weight from 100 to 1000, and the app uses no italics.
 */
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = join(root, 'node_modules/@fontsource-variable/dm-sans');
const dest = join(root, 'public/fonts');

const FILES = ['dm-sans-latin-wght-normal.woff2', 'dm-sans-latin-ext-wght-normal.woff2'];

mkdirSync(dest, { recursive: true });
for (const name of FILES) {
  copyFileSync(join(pkg, 'files', name), join(dest, name));
  console.log(`fonts: ${name}`);
}
copyFileSync(join(pkg, 'LICENSE'), join(dest, 'OFL-DM-Sans.txt'));
const version = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).version;
console.log(`fonts: OFL-DM-Sans.txt (from @fontsource-variable/dm-sans@${version})`);
