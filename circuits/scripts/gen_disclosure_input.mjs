// Prism — witness input + meta for disclosure.circom (matches the de-risk scheme).
import { buildBabyjub, buildPoseidon } from "circomlibjs";
import { mkdirSync, writeFileSync } from "node:fs";

const babyJub = await buildBabyjub();
const poseidon = await buildPoseidon();
const F = babyJub.F;
const p = F.p;
const o = (x) => F.toObject(x);
const mod = (x) => ((x % p) + p) % p;
const H = (arr) => F.toObject(poseidon(arr));

// Demo values (test fixtures — not real secrets).
const secret = 88776655443322110099n;
const amount = 4_200_000n;
const ephemeralPriv = 998877665544332211n; // e
const auditorPriv = 2934562934857n; // a (auditor's viewing key)

const Base8 = babyJub.Base8;
const A = babyJub.mulPointEscalar(Base8, auditorPriv); // auditor pub
const R = babyJub.mulPointEscalar(Base8, ephemeralPriv); // ephemeral pub
const S = babyJub.mulPointEscalar(A, ephemeralPriv); // shared = e·A
const s = o(S[0]);
const k = H([s]);
const c = mod(amount + k);
const commitment = H([secret, amount]);

const input = {
  secret: secret.toString(),
  amount: amount.toString(),
  ephemeralPriv: ephemeralPriv.toString(),
  Ax: o(A[0]).toString(),
  Ay: o(A[1]).toString(),
  Rx: o(R[0]).toString(),
  Ry: o(R[1]).toString(),
  c: c.toString(),
};

const meta = {
  // public signals order: [commitment, Ax, Ay, Rx, Ry, c]
  commitment: commitment.toString(),
  Ax: o(A[0]).toString(),
  Ay: o(A[1]).toString(),
  Rx: o(R[0]).toString(),
  Ry: o(R[1]).toString(),
  c: c.toString(),
  // auditor-side material (the auditor holds auditorPriv; stored for the demo only)
  amount: amount.toString(),
  auditorPriv: auditorPriv.toString(),
};

mkdirSync("build/disclosure", { recursive: true });
mkdirSync("fixtures/disclosure", { recursive: true });
writeFileSync("build/disclosure/input.json", JSON.stringify(input, null, 2));
writeFileSync("fixtures/disclosure/meta.json", JSON.stringify(meta, null, 2));
console.error(`commitment = ${commitment}`);
console.error(`ciphertext = ${c}`);
console.error("wrote build/disclosure/input.json + fixtures/disclosure/meta.json");
