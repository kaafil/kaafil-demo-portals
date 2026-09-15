/**
 * `pnpm audit:tokens` — fail if a token is declared and never consumed.
 *
 * ── WHY THIS IS A CHECK AND NOT A CONVENTION ───────────────────────────────
 *
 * The whole client-branch model rests on one promise: change a value in
 * `styles/tokens.css` and the product changes. A token that nothing reads
 * breaks that promise in the worst possible way — silently. The branch author
 * edits a number, sees no difference, and concludes the token system is
 * decorative.
 *
 * That is not hypothetical. `--row-height` was declared from the start, the
 * first client branch set it to `2.75rem` to get Travyan's airier rows, and
 * nothing consumed it. Nobody noticed until this script existed.
 *
 * ── RESERVED TOKENS ────────────────────────────────────────────────────────
 *
 * A scale with a hole in it is worse than a complete one nobody has reached
 * for yet: if `--z-modal` exists but `--z-toast` does not, the first person to
 * add a toast invents a number. So a small allowlist below holds tokens that
 * are deliberately ahead of their consumer — each one named, so the list is a
 * decision rather than a dumping ground.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Declared ahead of the component that will read them. Each needs a reason. */
const RESERVED = new Map<string, string>([
  ['--z-base', 'completes the stacking scale; a scale with a hole invites invented numbers'],
  ['--z-overlay', 'no overlay component yet'],
  ['--z-modal', 'no modal component yet'],
  ['--z-toast', 'no toast component yet'],
  ['--duration-fast', 'no animated component yet; the reduced-motion block still overrides it'],
  ['--duration-base', 'as above'],
  ['--duration-slow', 'as above'],
]);

const ROOTS = ['app', 'components', 'lib', 'config', 'styles'];
const EXT = /\.(tsx?|css)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(entry)) out.push(full);
  }
  return out;
}

const tokensFile = 'styles/tokens.css';
const declared = [...readFileSync(tokensFile, 'utf8').matchAll(/^ {2}(--[a-z0-9-]+):/gm)].map(
  (match) => match[1] as string,
);

const corpus = ROOTS.flatMap((root) => walk(root))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const dead: string[] = [];
for (const token of [...new Set(declared)]) {
  // A token counts as consumed if anything reads it through `var()`. The
  // declaration itself is `  --token: value;`, never `var(--token)`, so there
  // is no need to exclude the declaring line.
  if (!corpus.includes(`var(${token})`)) dead.push(token);
}

const unexplained = dead.filter((token) => !RESERVED.has(token));
const reserved = dead.filter((token) => RESERVED.has(token));

if (reserved.length > 0) {
  console.log('\nreserved — declared ahead of a consumer, on purpose:');
  for (const token of reserved) console.log(`  ${token.padEnd(20)} ${RESERVED.get(token)}`);
}

if (unexplained.length === 0) {
  console.log(`\n✓ every other token in ${tokensFile} is consumed.\n`);
  process.exit(0);
}

console.error(
  [
    '',
    `✗ ${unexplained.length} token(s) declared in ${tokensFile} that nothing reads:`,
    '',
    ...unexplained.map((token) => `    ${token}`),
    '',
    '  A client branch that changes one of these will see nothing happen, which',
    '  is the single worst way for the token system to fail. Either wire it up,',
    '  delete it, or add it to RESERVED in this script with a reason.',
    '',
  ].join('\n'),
);
process.exit(1);
