pragma circom 2.1.6;

// Prism — disclosure-correctness circuit.
//
// Proves that the on-chain ciphertext `c` decrypts (under the auditor's viewing key) to
// EXACTLY the amount committed in the note commitment C = Poseidon(secret, amount).
// So an auditor who decrypts c can trust the number, and a settler cannot encrypt a
// different amount than they committed.
//
// Scheme: Baby Jubjub ECDH + Poseidon one-time-pad.
//   ephemeral pub  R = e·B8                  (e private)
//   shared secret  s = (e·A).x   where A = auditor pub = a·B8
//   keystream      k = Poseidon(s)
//   ciphertext     c = amount + k            (mod field)
//   commitment     C = Poseidon(secret, amount)
//
// Public signals (constant, 6): output commitment, then [Ax, Ay, Rx, Ry, c].

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/escalarmulany.circom";
include "../node_modules/circomlib/circuits/babyjub.circom";

template Disclosure() {
    // private witness
    signal input secret;
    signal input amount;
    signal input ephemeralPriv; // e

    // public inputs
    signal input Ax; // auditor pubkey A = a·B8
    signal input Ay;
    signal input Rx; // ephemeral pubkey R = e·B8 (published in the note)
    signal input Ry;
    signal input c;  // ciphertext (published in the note)

    // public output
    signal output commitment;

    // 1. R must equal e·B8.
    component rpk = BabyPbk();
    rpk.in <== ephemeralPriv;
    rpk.Ax === Rx;
    rpk.Ay === Ry;

    // 2. shared secret S = e·A ; s = S.x
    component eBits = Num2Bits(253);
    eBits.in <== ephemeralPriv;
    component ecdh = EscalarMulAny(253);
    for (var i = 0; i < 253; i++) {
        ecdh.e[i] <== eBits.out[i];
    }
    ecdh.p[0] <== Ax;
    ecdh.p[1] <== Ay;
    signal s;
    s <== ecdh.out[0];

    // 3. keystream k = Poseidon(s); bind ciphertext c = amount + k.
    component kdf = Poseidon(1);
    kdf.inputs[0] <== s;
    c === amount + kdf.out;

    // 4. commitment C = Poseidon(secret, amount) — the same commitment that sits in the tree.
    component com = Poseidon(2);
    com.inputs[0] <== secret;
    com.inputs[1] <== amount;
    commitment <== com.out;
}

component main { public [Ax, Ay, Rx, Ry, c] } = Disclosure();
