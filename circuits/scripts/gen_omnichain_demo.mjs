// Prism — two K=1 aggregation proofs (identity A and B) that share ONE commitment tree
// (Ca at index 0, Cb at index 1), so both prove membership against the SAME on-chain root.
import { buildPoseidon } from "circomlibjs";
import * as snarkjs from "snarkjs";
import { mkdirSync, writeFileSync } from "node:fs";

const poseidon = await buildPoseidon();
const F = poseidon.F;
const H2 = (a, b) => F.toObject(poseidon([a, b]));
const DEPTH = 20;
const EXT = 42n;

const to32 = (d) => BigInt(d).toString(16).padStart(64, "0");
const g1 = (p) => to32(p[0]) + to32(p[1]);
const g2 = (p) => to32(p[0][1]) + to32(p[0][0]) + to32(p[1][1]) + to32(p[1][0]);

const zeros = [0n];
for (let i = 1; i <= DEPTH; i++) zeros[i] = H2(zeros[i - 1], zeros[i - 1]);

const ids = [
  { label: "A", secret: 123456789012345n, value: 4_200_000n }, // marked EVM-spent
  { label: "B", secret: 987654321098765n, value: 1_500_000n }, // fresh
];
const commitments = ids.map((d) => H2(d.secret, d.value));

// Build the active (leftmost) prefix of the shared tree.
const levels = [commitments.slice()];
for (let L = 0; L < DEPTH; L++) {
  const cur = levels[L];
  const next = [];
  for (let i = 0; i < Math.ceil(cur.length / 2); i++) {
    next.push(H2(cur[2 * i] ?? zeros[L], cur[2 * i + 1] ?? zeros[L]));
  }
  levels.push(next);
}
const root = levels[DEPTH][0];

function pathFor(index) {
  const pe = [];
  const pi = [];
  let p = index;
  for (let L = 0; L < DEPTH; L++) {
    const sib = p ^ 1;
    pi.push((p & 1).toString());
    pe.push((sib < levels[L].length ? levels[L][sib] : zeros[L]).toString());
    p >>= 1;
  }
  return { pe, pi };
}

mkdirSync("build/cli_omni", { recursive: true });
for (let k = 0; k < ids.length; k++) {
  const { label, secret, value } = ids[k];
  const { pe, pi } = pathFor(k);
  const nullifier = H2(EXT, secret);
  const aggregateOutput = value;
  const H = H2(aggregateOutput, nullifier);

  const input = {
    secret: [secret.toString()],
    value: [value.toString()],
    pathElements: [pe],
    pathIndices: [pi],
    root: root.toString(),
    externalNullifier: EXT.toString(),
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input, "build/agg_k1/agg_k1_js/agg_k1.wasm", "build/agg_k1/agg_final.zkey",
  );
  if (publicSignals[1] !== root.toString()) throw new Error(`${label}: root mismatch`);

  const dir = `build/cli_omni/${label}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/proof.json`, JSON.stringify({ a: g1(proof.pi_a), b: g2(proof.pi_b), c: g1(proof.pi_c) }));
  writeFileSync(`${dir}/nullifiers.json`, JSON.stringify([to32(nullifier)]));
  writeFileSync(`${dir}/scalars.json`, JSON.stringify({
    commitment: to32(commitments[k]), root: to32(root), externalNullifier: to32(EXT),
    h: to32(H), aggregateOutput: to32(aggregateOutput), nullifier: to32(nullifier),
  }, null, 2));
  console.error(`${label}: index=${k} value=${value} nullifier=0x${to32(nullifier).slice(0, 12)}…`);
}
console.error(`shared root = 0x${to32(root)}`);
process.exit(0);
