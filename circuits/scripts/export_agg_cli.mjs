// Prism — emit stellar-cli args for an on-chain K=8 aggregated settle.
// BytesN args are raw hex strings; structs/arrays are JSON.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const K = 8;
const dir = new URL(`../fixtures/agg_k${K}/`, import.meta.url);
const vk = JSON.parse(readFileSync(new URL("verification_key.json", dir)));
const proof = JSON.parse(readFileSync(new URL("proof.json", dir)));
const meta = JSON.parse(readFileSync(new URL("meta.json", dir)));

const to32 = (dec) => BigInt(dec).toString(16).padStart(64, "0");
const g1 = (p) => to32(p[0]) + to32(p[1]);
const g2 = (p) => to32(p[0][1]) + to32(p[0][0]) + to32(p[1][1]) + to32(p[1][0]);

const out = new URL("../build/cli_agg/", import.meta.url);
mkdirSync(out, { recursive: true });

const vkArg = {
  alpha: g1(vk.vk_alpha_1),
  beta: g2(vk.vk_beta_2),
  gamma: g2(vk.vk_gamma_2),
  delta: g2(vk.vk_delta_2),
  ic: vk.IC.map(g1),
};
const proofArg = { a: g1(proof.pi_a), b: g2(proof.pi_b), c: g1(proof.pi_c) };
const nullifiersArg = meta.nullifiers.map(to32);
const commitmentsArg = meta.commitments.map(to32);

writeFileSync(new URL("vk.json", out), JSON.stringify(vkArg));
writeFileSync(new URL("proof.json", out), JSON.stringify(proofArg));
writeFileSync(new URL("nullifiers.json", out), JSON.stringify(nullifiersArg));
writeFileSync(new URL("commitments.json", out), JSON.stringify(commitmentsArg));

// Scalar BytesN args (passed inline as raw hex).
const scalars = {
  root: to32(meta.root),
  external_nullifier: to32(meta.externalNullifier),
  h: to32(meta.H),
  aggregate_output: to32(meta.aggregateOutput),
};
writeFileSync(new URL("scalars.json", out), JSON.stringify(scalars, null, 2));
console.error("wrote build/cli_agg/{vk,proof,nullifiers,commitments,scalars}.json");
console.log(JSON.stringify(scalars));
