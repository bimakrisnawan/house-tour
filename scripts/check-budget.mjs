// Fails the build when dist/ exceeds the Vercel Hobby upload limit (100 MB per deployment), with a margin.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LIMIT_MB = 95;
const size = (p) => (statSync(p).isDirectory() ? readdirSync(p).reduce((s, f) => s + size(join(p, f)), 0) : statSync(p).size);
const mb = size('dist') / 1e6;
console.log(`dist: ${mb.toFixed(1)} MB of ${LIMIT_MB} MB budget`);
if (mb > LIMIT_MB) process.exit(1);
