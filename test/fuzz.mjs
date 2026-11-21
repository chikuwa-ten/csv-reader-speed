// Differential test: solve.js's run against csv-reader 1.0.0 (the kit's baseline) on random small texts drawn from
// the characters that matter (comma, quote, CR, LF, BOM) plus a few ordinary ones, and on the kit's practice cases.
// Usage: node test/fuzz.mjs <path to kit's baselines/csv-reader/vendor/csv-reader/index.js> [iterations] [practice cases.json]
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { run } from '../solve.js';

const refPath = process.argv[2];
const iters = Number(process.argv[3] ?? 200000);
const practice = process.argv[4];
const { readCsv } = await import(pathToFileURL(resolve(refPath)).href);

let seed = 12345;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) >>> 0;
  return seed / 4294967296;
};
const alphabet = [',', '"', '\r', '\n', 'a', 'b', ' ', '﻿', '""', '\r\n', 'é'];

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

let fails = 0;
for (let i = 0; i < iters; i++) {
  const len = Math.floor(rnd() * 14);
  let t = '';
  for (let j = 0; j < len; j++) t += alphabet[Math.floor(rnd() * alphabet.length)];
  const input = { text: t, header: rnd() < 0.5 };
  const want = readCsv(input);
  const got = run(input);
  if (!same(want, got)) {
    fails++;
    if (fails <= 5) console.log('MISMATCH', JSON.stringify(input), '\nwant', JSON.stringify(want), '\ngot ', JSON.stringify(got));
  }
}
console.log(`random: ${iters - fails}/${iters} identical`);

if (practice) {
  const cases = JSON.parse(readFileSync(practice, 'utf8'));
  let ok = 0;
  for (const c of cases) if (same(readCsv(c.input), run(c.input))) ok++;
  console.log(`practice: ${ok}/${cases.length} identical`);
  if (ok !== cases.length) fails++;
}
process.exit(fails ? 1 : 0);
