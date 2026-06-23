// Prism — generate a valid witness input for membership.circom.
//
// Builds a depth-20 incremental Merkle tree (zero-initialized empty subtrees),
// places our commitment at leaf index 0, and emits the inclusion proof so the
// circuit's recomputed root matches the public `root`. Uses circomlibjs Poseidon,
// which shares constants with circomlib's circom Poseidon.
import { buildPoseidon } from "circomlibjs";
import { writeFileSync } from "node:fs";

const DEPTH = 20;

// Demo witness (NEVER real secrets — these are public test fixtures).
const secret = 11112222333344445555n;
const value = 1_000_000n;
const externalNullifier = 42n;
const signalHash = 7777n;

const poseidon = await buildPoseidon();
const F = poseidon.F;
const H2 = (a, b) => F.toObject(poseidon([a, b]));

// commitment = Poseidon(secret, value)
const commitment = H2(secret, value);

// zeros[i] = root of an empty subtree of height i
const zeros = [0n];
for (let i = 1; i < DEPTH; i++) zeros[i] = H2(zeros[i - 1], zeros[i - 1]);

// leaf index 0 -> always the left child, siblings are empty subtrees
const pathElements = [];
const pathIndices = [];
let cur = commitment;
for (let i = 0; i < DEPTH; i++) {
  pathElements.push(zeros[i].toString());
  pathIndices.push("0");
  cur = H2(cur, zeros[i]); // our node (left) + empty sibling (right)
}
const root = cur;
const nullifierHash = H2(externalNullifier, secret);

const input = {
  secret: secret.toString(),
  value: value.toString(),
  pathElements,
  pathIndices,
  root: root.toString(),
  externalNullifier: externalNullifier.toString(),
  signalHash: signalHash.toString(),
};

const out = process.argv[2] || "build/input.json";
writeFileSync(out, JSON.stringify(input, null, 2));
console.error(`commitment      = ${commitment}`);
console.error(`root            = ${root}`);
console.error(`nullifierHash   = ${nullifierHash}`);
console.error(`wrote ${out}`);
