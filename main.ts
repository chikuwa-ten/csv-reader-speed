// The driver the harness runs (`node /bot/main.ts`): it reads every case from /input/cases.json (a JSON array of
// {id, input}), answers each one with run() from solve.js, and writes /output/answers.json, a JSON array of the
// answers in the cases' order. Outside a container MAKEFUN_INPUT_DIR and MAKEFUN_OUTPUT_DIR stand in for /input and
// /output.
//
// V8 tuning, set before solve.js is imported (the rules allow an entry to tune V8's flags this way):
//   --no-incremental-marking   as the house baseline runs;
//   --no-turbofan              the reader is one hot loop that Maglev already compiles well; TurboFan's extra
//                              compile of it costs more CPU than it saves on inputs of this size;
//   --max-semi-space-size=256, --semi-space-growth-factor=8
//                              a young generation large enough that almost nothing is scavenged: every row the
//                              reader builds stays alive until the answers are written, so a scavenge would only copy
//                              it.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

setFlagsFromString('--no-incremental-marking');
setFlagsFromString('--no-turbofan');
setFlagsFromString('--max-semi-space-size=256');
setFlagsFromString('--semi-space-growth-factor=8');

const { run } = (await import(new URL('./solve.js', import.meta.url).href)) as { run: (input: unknown) => unknown };

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const cases = JSON.parse(readFileSync(join(INPUT_DIR, 'cases.json'), 'utf8')) as { id: string; input: unknown }[];
const answers: unknown[] = new Array(cases.length);
for (let i = 0; i < cases.length; i++) answers[i] = run(cases[i].input);
writeFileSync(join(OUTPUT_DIR, 'answers.json'), JSON.stringify(answers));
