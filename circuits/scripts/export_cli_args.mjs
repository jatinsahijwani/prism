// Prism — emit stellar-cli JSON args for verifier-registry.verify_with_vk from the
// snarkjs fixtures. BytesN values are hex strings; structs are JSON objects.
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../fixtures/", import.meta.url);
const vk = JSON.parse(readFileSync(new URL("verification_key.json", dir)));
const proof = JSON.parse(readFileSync(new URL("proof.json", dir)));
const pub = JSON.parse(readFileSync(new URL("public.json", dir)));

const to32 = (dec) => BigInt(dec).toString(16).padStart(64, "0");
const g1 = (p) => to32(p[0]) + to32(p[1]);
const g2 = (p) => to32(p[0][1]) + to32(p[0][0]) + to32(p[1][1]) + to32(p[1][0]);

const vkArg = {
  alpha: g1(vk.vk_alpha_1),
  beta: g2(vk.vk_beta_2),
  gamma: g2(vk.vk_gamma_2),
  delta: g2(vk.vk_delta_2),
  ic: vk.IC.map(g1),
};
const proofArg = { a: g1(proof.pi_a), b: g2(proof.pi_b), c: g1(proof.pi_c) };
const pubArg = pub.map(to32);

const out = new URL("../build/cli/", import.meta.url);
import { mkdirSync } from "node:fs";
mkdirSync(out, { recursive: true });
writeFileSync(new URL("vk.json", out), JSON.stringify(vkArg));
writeFileSync(new URL("proof.json", out), JSON.stringify(proofArg));
writeFileSync(new URL("pub.json", out), JSON.stringify(pubArg));
console.error("wrote build/cli/{vk,proof,pub}.json");
