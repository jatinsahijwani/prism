// Prism — de-risk the disclosure encryption scheme BEFORE building on it.
// Baby Jubjub ECDH + Poseidon one-time-pad. Proves sender-encrypt == auditor-decrypt,
// and prints Base8 + field prime for the circuit. (Circuit<->JS EscalarMul match is
// confirmed in Step 2 by successful witness generation.)
import { buildBabyjub, buildPoseidon } from "circomlibjs";

const babyJub = await buildBabyjub();
const poseidon = await buildPoseidon();
const F = babyJub.F; // BN254 scalar field Fr
const p = F.p;
const Base8 = babyJub.Base8;
const o = (x) => F.toObject(x); // field elem -> bigint

const mod = (x) => ((x % p) + p) % p;
const H1 = (s) => F.toObject(poseidon([s])); // Poseidon of one field elem -> bigint

// --- keys ---
const auditorPriv = 2934562934857n; // a
const ephemeralPriv = 998877665544332211n; // e
const A = babyJub.mulPointEscalar(Base8, auditorPriv); // auditor pub A = a*B8
const R = babyJub.mulPointEscalar(Base8, ephemeralPriv); // ephemeral pub R = e*B8

// --- sender encrypts ---
const Senc = babyJub.mulPointEscalar(A, ephemeralPriv); // S = e*A
const sEnc = o(Senc[0]);
const k = H1(sEnc); // keystream
const amount = 4_200_000n;
const c = mod(amount + k); // ciphertext

// --- auditor decrypts ---
const Sdec = babyJub.mulPointEscalar(R, auditorPriv); // S = a*R
const sDec = o(Sdec[0]);
const kAud = H1(sDec);
const amountDec = mod(c - kAud);

const sharedMatch = sEnc === sDec;
const decryptMatch = amountDec === amount;

console.log("Base8.x =", o(Base8[0]).toString());
console.log("Base8.y =", o(Base8[1]).toString());
console.log("field p =", p.toString());
console.log("subOrder=", babyJub.subOrder.toString());
console.log("---");
console.log("auditor A =", [o(A[0]).toString(), o(A[1]).toString()]);
console.log("ephem   R =", [o(R[0]).toString(), o(R[1]).toString()]);
console.log("shared secret matches (e*A == a*R):", sharedMatch);
console.log("amount       =", amount.toString());
console.log("ciphertext c =", c.toString());
console.log("auditor decrypts amount:", amountDec.toString());
console.log("DECRYPT MATCHES:", decryptMatch);

if (!sharedMatch || !decryptMatch) {
  console.error("DE-RISK FAILED");
  process.exit(1);
}
console.log("\n✅ DE-RISK PASSED: ECDH+Poseidon scheme is self-consistent.");
