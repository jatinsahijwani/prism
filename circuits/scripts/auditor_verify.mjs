// Prism — auditor reads the ON-CHAIN ciphertexts and decrypts them with the viewing key.
// Usage: node auditor_verify.mjs <onchain_notes.json> <auditorPrivDec> <expectedTotal>
import { buildBabyjub, buildPoseidon } from "circomlibjs";
import { readFileSync } from "node:fs";

const [, , notesFile, auditorPrivStr, expectedTotalStr] = process.argv;
const onchain = JSON.parse(readFileSync(notesFile)); // [{rx,ry,ciphertext} hex]
const auditorPriv = BigInt(auditorPrivStr);
const expectedTotal = BigInt(expectedTotalStr);

const babyJub = await buildBabyjub();
const poseidon = await buildPoseidon();
const F = babyJub.F;
const p = F.p;
const o = (x) => F.toObject(x);
const mod = (x) => ((x % p) + p) % p;
const h2b = (h) => BigInt("0x" + h.replace(/^0x/, ""));

let total = 0n;
const amounts = [];
for (const n of onchain) {
  const R = [F.e(h2b(n.rx)), F.e(h2b(n.ry))];
  const S = babyJub.mulPointEscalar(R, auditorPriv);
  const k = o(poseidon([o(S[0])]));
  const amount = mod(h2b(n.ciphertext) - k);
  amounts.push(amount);
  total += amount;
}

console.log("on-chain ciphertexts (what an explorer sees):");
onchain.forEach((n, i) => console.log(`  note ${i}: c = 0x${n.ciphertext.slice(0, 24)}…  (no amount visible)`));
console.log("auditor decrypts ->", amounts.map((a) => a.toString()));
console.log(`total settled = ${total}`);
console.log(`predicate [total == ${expectedTotal}] => ${total === expectedTotal ? "PASS ✅" : "FAIL ❌"}`);
process.exit(total === expectedTotal ? 0 : 1);
