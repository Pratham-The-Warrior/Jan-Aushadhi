// ============================================================
// Search quality benchmark
// Runs every case in search-eval-cases.json against a running API
// and reports top-1 / top-3 hit rate, MRR and latency per category.
//
//   npm run search:eval                      # http://localhost:5000
//   npm run search:eval -- --api=https://api.example.com --verbose
//   npm run search:eval -- --cases=holdout   # cases never used for tuning
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface EvalCase {
  cat: string;
  q: string;
  endpoint?: 'search' | 'suggest';
  /** Any of these brand names counts as a hit. */
  names?: string[];
  /** The hit's composition must contain every one of these. */
  comp?: string[];
}

interface Hit {
  name: string;
  composition: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const API = (args.find((a) => a.startsWith('--api='))?.slice(6) || process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
const VERBOSE = args.includes('--verbose');
// --cases=holdout reads search-eval-holdout.json
const SET = args.find((a) => a.startsWith('--cases='))?.slice(8) || 'cases';

const { cases } = JSON.parse(fs.readFileSync(path.join(__dirname, `search-eval-${SET}.json`), 'utf8')) as { cases: EvalCase[] };

async function fetchHits(c: EvalCase): Promise<{ hits: Hit[]; ms: number }> {
  const url = c.endpoint === 'suggest'
    ? `${API}/api/v1/suggest?q=${encodeURIComponent(c.q)}&limit=6`
    : `${API}/api/v1/search?query=${encodeURIComponent(c.q)}`;
  const t0 = performance.now();
  const res = await fetch(url);
  const ms = performance.now() - t0;
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const body = (await res.json()) as any[];
  const hits = body.map((r) => {
    const b = r.branded ?? r;
    return { name: b.name ?? '', composition: [b.composition1, b.composition2, b.composition].filter(Boolean).join(' ') };
  });
  return { hits, ms };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

function isHit(c: EvalCase, h: Hit): boolean {
  if (c.names) return c.names.some((n) => norm(n) === norm(h.name));
  if (c.comp) return c.comp.every((s) => norm(h.composition).includes(norm(s)));
  return false;
}

async function main() {
  const byCat = new Map<string, { n: number; top1: number; top3: number; rr: number; ms: number[] }>();
  const failures: string[] = [];

  for (const c of cases) {
    let rank = 0;
    let ms = 0;
    let hits: Hit[] = [];
    try {
      ({ hits, ms } = await fetchHits(c));
      rank = hits.findIndex((h) => isHit(c, h)) + 1;
    } catch (err) {
      failures.push(`  ✗ [${c.cat}] "${c.q}" → request failed: ${(err as Error).message}`);
    }
    const s = byCat.get(c.cat) ?? { n: 0, top1: 0, top3: 0, rr: 0, ms: [] };
    s.n++;
    if (rank === 1) s.top1++;
    if (rank >= 1 && rank <= 3) s.top3++;
    if (rank >= 1) s.rr += 1 / rank;
    s.ms.push(ms);
    byCat.set(c.cat, s);

    if (rank !== 1) {
      const got = hits.slice(0, 3).map((h) => h.name).join(' | ') || '(no results)';
      failures.push(`  ${rank ? `#${rank}` : '✗ '} [${c.cat}] "${c.q}" → ${got}`);
    } else if (VERBOSE) {
      console.log(`  ✓ [${c.cat}] "${c.q}" → ${hits[0].name}`);
    }
  }

  const pct = (a: number, b: number) => `${Math.round((100 * a) / b)}%`.padStart(5);
  const p = (xs: number[], q: number) => {
    const s = [...xs].sort((a, b) => a - b);
    return `${Math.round(s[Math.min(s.length - 1, Math.floor(q * s.length))])}ms`.padStart(7);
  };

  console.log(`\nSearch benchmark against ${API}\n`);
  console.log('category    cases   top-1   top-3    MRR     p50     p95');
  const all = { n: 0, top1: 0, top3: 0, rr: 0, ms: [] as number[] };
  for (const [cat, s] of byCat) {
    console.log(`${cat.padEnd(10)} ${String(s.n).padStart(6)}   ${pct(s.top1, s.n)}   ${pct(s.top3, s.n)}   ${(s.rr / s.n).toFixed(2)} ${p(s.ms, 0.5)} ${p(s.ms, 0.95)}`);
    all.n += s.n; all.top1 += s.top1; all.top3 += s.top3; all.rr += s.rr; all.ms.push(...s.ms);
  }
  console.log(`${'ALL'.padEnd(10)} ${String(all.n).padStart(6)}   ${pct(all.top1, all.n)}   ${pct(all.top3, all.n)}   ${(all.rr / all.n).toFixed(2)} ${p(all.ms, 0.5)} ${p(all.ms, 0.95)}`);

  if (failures.length) {
    console.log(`\nNot first (${failures.length}):`);
    for (const f of failures) console.log(f);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
