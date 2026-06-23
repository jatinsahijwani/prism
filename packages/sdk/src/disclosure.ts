// Prism SDK — selective disclosure (client-side, Baby Jubjub ECDH + Poseidon).
//
// Matches `circuits/src/disclosure.circom` exactly:
//   R = e·B8 ; s = (e·A).x ; k = Poseidon(s) ; c = amount + k (mod p) ; C = Poseidon(secret, amount)
// The auditor (holder of `a`) recomputes s = (a·R).x and recovers amount = c - Poseidon(s).
//
// This is the ZK confidential+disclosure module a SEP-57 / confidential-token issuer plugs
// in: settlement is private on-chain, yet a regulator with the viewing key can verify
// scoped predicates ("total == X", "every transfer <= cap") without public de-shielding.
import { buildBabyjub, buildPoseidon } from "circomlibjs";

let _bj: any;
let _pos: any;
async function prims() {
  if (!_bj) {
    _bj = await buildBabyjub();
    _pos = await buildPoseidon();
  }
  return { babyJub: _bj, poseidon: _pos };
}

export type Point = [bigint, bigint];

const fmod = (x: bigint, p: bigint) => ((x % p) + p) % p;

/** Auditor / settler keypair on Baby Jubjub (pub = priv·B8). */
export async function derivePubkey(priv: bigint): Promise<Point> {
  const { babyJub } = await prims();
  const P = babyJub.mulPointEscalar(babyJub.Base8, priv);
  return [babyJub.F.toObject(P[0]), babyJub.F.toObject(P[1])];
}

export interface EncryptedNote {
  commitment: bigint;
  R: Point; // ephemeral pubkey
  ciphertext: bigint; // amount + keystream
}

/**
 * Encrypt a note's amount under the auditor's viewing key and produce the witness input
 * for the disclosure-correctness proof. `ephemeralPriv` should be fresh per note.
 */
export async function encryptNote(
  auditorPub: Point,
  secret: bigint,
  amount: bigint,
  ephemeralPriv: bigint,
): Promise<{ note: EncryptedNote; circuitInput: Record<string, string> }> {
  const { babyJub, poseidon } = await prims();
  const F = babyJub.F;
  const p: bigint = F.p;
  const o = (x: any) => F.toObject(x);

  const A = [F.e(auditorPub[0]), F.e(auditorPub[1])];
  const R = babyJub.mulPointEscalar(babyJub.Base8, ephemeralPriv);
  const S = babyJub.mulPointEscalar(A, ephemeralPriv);
  const s = o(S[0]);
  const k = o(poseidon([s]));
  const ciphertext = fmod(amount + k, p);
  const commitment = o(poseidon([secret, amount]));
  const Ro: Point = [o(R[0]), o(R[1])];

  return {
    note: { commitment, R: Ro, ciphertext },
    circuitInput: {
      secret: secret.toString(),
      amount: amount.toString(),
      ephemeralPriv: ephemeralPriv.toString(),
      Ax: auditorPub[0].toString(),
      Ay: auditorPub[1].toString(),
      Rx: Ro[0].toString(),
      Ry: Ro[1].toString(),
      c: ciphertext.toString(),
    },
  };
}

/** Auditor re-derives the shared secret from R and recovers the amount. */
export async function decryptNote(auditorPriv: bigint, R: Point, ciphertext: bigint): Promise<bigint> {
  const { babyJub, poseidon } = await prims();
  const F = babyJub.F;
  const p: bigint = F.p;
  const o = (x: any) => F.toObject(x);
  const Rp = [F.e(R[0]), F.e(R[1])];
  const S = babyJub.mulPointEscalar(Rp, auditorPriv);
  const s = o(S[0]);
  const k = o(poseidon([s]));
  return fmod(ciphertext - k, p);
}

export type Predicate =
  | { kind: "total"; value: bigint } // sum of all disclosed amounts == value
  | { kind: "cap"; max: bigint }; // every disclosed amount <= max

export interface DisclosureResult {
  ok: boolean;
  amounts: bigint[];
  total: bigint;
}

/**
 * `prism.disclose(viewKey, predicate)` — the auditor decrypts the relevant notes with the
 * viewing key and verifies a scoped predicate over the cleartext amounts.
 */
export async function disclose(
  viewKey: bigint,
  notes: { R: Point; ciphertext: bigint }[],
  predicate: Predicate,
): Promise<DisclosureResult> {
  const amounts: bigint[] = [];
  for (const n of notes) amounts.push(await decryptNote(viewKey, n.R, n.ciphertext));
  const total = amounts.reduce((a, b) => a + b, 0n);
  const ok =
    predicate.kind === "total" ? total === predicate.value : amounts.every((a) => a <= predicate.max);
  return { ok, amounts, total };
}
