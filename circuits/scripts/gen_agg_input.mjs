// Prism — generate a valid witness for aggregation.circom at a given K.
//
// Builds a depth-20 tree with leaves[0..K-1] = commitments (rest empty), computes each
// leaf's authentication path against the FINAL root (so the on-chain incremental tree,
// after inserting the same K commitments in order, has is_known_root(root) == true).
//
// Writes:
//   build/agg_k<K>/input.json   — circuit witness input
//   fixtures/agg_k<K>/meta.json — root, externalNullifier, nullifiers[], aggregateOutput,
//                                 H, commitments[] (for the Aggregator contract/CLI)
import { buildPoseidon } from "circomlibjs";
import { mkdirSync, writeFileSync } from "node:fs";

const K = parseInt(process.argv[2] || "8", 10);
const DEPTH = 20;
const EXTERNAL_NULLIFIER = 42n;

const poseidon = await buildPoseidon();
const F = poseidon.F;
const H2 = (a, b) => F.toObject(poseidon([a, b]));

// Distinct, deterministic demo secrets/values (NOT real secrets — test fixtures).
const secret = [];
const value = [];
for (let k = 0; k < K; k++) {
  secret.push(1000000000000000000n + BigInt(k) * 7777n + 11112222333344445555n);
  value.push(1000000n + BigInt(k) * 250000n);
}

const commitment = secret.map((s, k) => H2(s, value[k]));

// zeros[i] = empty subtree root of height i
const zeros = [0n];
for (let i = 1; i <= DEPTH; i++) zeros[i] = H2(zeros[i - 1], zeros[i - 1]);

// Build only the active (leftmost) prefix per level.
const levels = [commitment.slice()];
for (let L = 0; L < DEPTH; L++) {
  const cur = levels[L];
  const next = [];
  for (let i = 0; i < Math.ceil(cur.length / 2); i++) {
    const left = cur[2 * i] ?? zeros[L];
    const right = cur[2 * i + 1] ?? zeros[L];
    next.push(H2(left, right));
  }
  levels.push(next);
}
const root = levels[DEPTH][0];

// Authentication path for each leaf.
const pathElements = [];
const pathIndices = [];
for (let k = 0; k < K; k++) {
  const pe = [];
  const pi = [];
  let p = k;
  for (let L = 0; L < DEPTH; L++) {
    const sib = p ^ 1;
    pi.push((p & 1).toString());
    pe.push(((sib < levels[L].length ? levels[L][sib] : zeros[L])).toString());
    p = p >> 1;
  }
  pathElements.push(pe);
  pathIndices.push(pi);
}

const nullifier = secret.map((s) => H2(EXTERNAL_NULLIFIER, s));
const aggregateOutput = value.reduce((a, b) => a + b, 0n);

// H fold (must match the Aggregator contract and the circuit).
let acc = aggregateOutput;
for (let k = 0; k < K; k++) acc = H2(acc, nullifier[k]);
const H = acc;

const input = {
  secret: secret.map(String),
  value: value.map(String),
  pathElements,
  pathIndices,
  root: root.toString(),
  externalNullifier: EXTERNAL_NULLIFIER.toString(),
};

const meta = {
  K,
  root: root.toString(),
  externalNullifier: EXTERNAL_NULLIFIER.toString(),
  aggregateOutput: aggregateOutput.toString(),
  H: H.toString(),
  nullifiers: nullifier.map(String),
  commitments: commitment.map(String),
};

mkdirSync(`build/agg_k${K}`, { recursive: true });
mkdirSync(`fixtures/agg_k${K}`, { recursive: true });
writeFileSync(`build/agg_k${K}/input.json`, JSON.stringify(input, null, 2));
writeFileSync(`fixtures/agg_k${K}/meta.json`, JSON.stringify(meta, null, 2));
console.error(`K=${K}: root=${root}`);
console.error(`K=${K}: H=${H}`);
console.error(`wrote build/agg_k${K}/input.json + fixtures/agg_k${K}/meta.json`);
