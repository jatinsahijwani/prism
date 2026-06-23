// Prism — generate N encrypted notes + disclosure-correctness proofs + CLI args for an
// on-chain testnet demo. Uses the disclosure circuit artifacts from disclosure_build.sh.
import { buildBabyjub, buildPoseidon } from "circomlibjs";
import * as snarkjs from "snarkjs";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const babyJub = await buildBabyjub();
const poseidon = await buildPoseidon();
const F = babyJub.F;
const p = F.p;
const o = (x) => F.toObject(x);
const mod = (x) => ((x % p) + p) % p;

const meta = JSON.parse(readFileSync("fixtures/disclosure/meta.json"));
const auditorPriv = BigInt(meta.auditorPriv);
const A = babyJub.mulPointEscalar(babyJub.Base8, auditorPriv);
const Apub = [o(A[0]), o(A[1])];

// Demo notes (settled payments). Amounts stay private on-chain.
const notes = [
  { secret: 111n, amount: 4_200_000n },
  { secret: 222n, amount: 1_750_000n },
  { secret: 333n, amount: 3_050_000n },
];
let e = 7_000_000_001n;

const to32 = (dec) => BigInt(dec).toString(16).padStart(64, "0");
const g1 = (pt) => to32(pt[0]) + to32(pt[1]);
const g2 = (pt) => to32(pt[0][1]) + to32(pt[0][0]) + to32(pt[1][1]) + to32(pt[1][0]);

mkdirSync("build/cli_disc", { recursive: true });

// verifier-registry vk.json for the disclosure circuit
const vk = JSON.parse(readFileSync("fixtures/disclosure/verification_key.json"));
writeFileSync(
  "build/cli_disc/vk.json",
  JSON.stringify({ alpha: g1(vk.vk_alpha_1), beta: g2(vk.vk_beta_2), gamma: g2(vk.vk_gamma_2), delta: g2(vk.vk_delta_2), ic: vk.IC.map(g1) }),
);
writeFileSync("build/cli_disc/auditor.json", JSON.stringify({ ax: to32(Apub[0]), ay: to32(Apub[1]) }, null, 2));

const summary = [];
for (let i = 0; i < notes.length; i++) {
  const { secret, amount } = notes[i];
  const ephemeralPriv = e++;
  const R = babyJub.mulPointEscalar(babyJub.Base8, ephemeralPriv);
  const S = babyJub.mulPointEscalar(A, ephemeralPriv);
  const k = o(poseidon([o(S[0])]));
  const c = mod(amount + k);
  const commitment = o(poseidon([secret, amount]));
  const input = {
    secret: secret.toString(), amount: amount.toString(), ephemeralPriv: ephemeralPriv.toString(),
    Ax: Apub[0].toString(), Ay: Apub[1].toString(),
    Rx: o(R[0]).toString(), Ry: o(R[1]).toString(), c: c.toString(),
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input, "build/disclosure/disclosure_js/disclosure.wasm", "build/disclosure/d_final.zkey",
  );
  if (publicSignals[0] !== commitment.toString()) throw new Error(`note ${i}: commitment mismatch`);

  const dir = `build/cli_disc/note${i}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/proof.json`, JSON.stringify({ a: g1(proof.pi_a), b: g2(proof.pi_b), c: g1(proof.pi_c) }));
  writeFileSync(`${dir}/scalars.json`, JSON.stringify({
    commitment: to32(commitment), rx: to32(o(R[0])), ry: to32(o(R[1])), ciphertext: to32(c),
  }, null, 2));
  summary.push({ i, commitment: to32(commitment), rx: to32(o(R[0])), ry: to32(o(R[1])), ciphertext: to32(c) });
  console.error(`note ${i}: amount=${amount} proved + cli args written`);
}

writeFileSync("build/cli_disc/notes.json", JSON.stringify({ auditorPriv: auditorPriv.toString(), expectedTotal: notes.reduce((a, b) => a + b.amount, 0n).toString(), notes: summary }, null, 2));
console.error(`auditor pubkey ax=${to32(Apub[0])}`);
console.error(`expected total = ${notes.reduce((a, b) => a + b.amount, 0n)}`);
console.error("wrote build/cli_disc/{vk,auditor,notes}.json + note{0,1,2}/");
process.exit(0);
