import { readFileSync, writeFileSync } from 'node:fs';
import { setFlagsFromString } from 'node:v8';

setFlagsFromString('--no-incremental-marking --no-turbofan --no-maglev --single-threaded --scavenger-max-new-space-capacity-mb=512 --max-semi-space-size=256 --semi-space-growth-factor=8');

const { run } = (await import('./solve.js')) as { run: (input: unknown) => unknown };
const env = process.env;
const cases = JSON.parse(readFileSync((env.MAKEFUN_INPUT_DIR ?? '/input') + '/cases.json', 'utf8')) as { input: unknown }[];
const out: unknown[] = new Array(cases.length);
for (let i = 0; i < cases.length; i++) out[i] = run(cases[i].input);
writeFileSync((env.MAKEFUN_OUTPUT_DIR ?? '/output') + '/answers.json', JSON.stringify(out));
