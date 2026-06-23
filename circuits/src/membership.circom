pragma circom 2.1.6;

// Prism — anonymous-membership + nullifier circuit (Groth16/BN254).
//
// Proves: "I know a (secret, value) whose commitment C = Poseidon(secret, value)
// is a leaf in the Merkle tree with public `root`", and derives a public
// nullifier N = Poseidon(externalNullifier, secret) so the same secret can act
// at most once per context — WITHOUT revealing secret, value, or which leaf.
//
// NOTE: this circuit uses circomlib's Poseidon. The on-chain CommitmentTree will
// use Soroban's CAP-0075 Poseidon2 host fn; reconciling the two hash params is a
// later task and is NOT required for the day-1 verify de-risk.

include "../node_modules/circomlib/circuits/poseidon.circom";

// Swaps (in[0], in[1]) when selector s == 1; passes through when s == 0.
template DualMux() {
    signal input in[2];
    signal input s;        // must be boolean
    signal output out[2];

    s * (1 - s) === 0;
    out[0] <== (in[1] - in[0]) * s + in[0];
    out[1] <== (in[0] - in[1]) * s + in[1];
}

// Recomputes a Merkle root from `leaf` and a (siblings, pathBits) inclusion proof.
template MerkleInclusion(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth]; // 0 = current node is left child, 1 = right
    signal output root;

    component muxes[depth];
    component hashers[depth];
    signal cur[depth + 1];
    cur[0] <== leaf;

    for (var i = 0; i < depth; i++) {
        muxes[i] = DualMux();
        muxes[i].in[0] <== cur[i];
        muxes[i].in[1] <== pathElements[i];
        muxes[i].s <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== muxes[i].out[0];
        hashers[i].inputs[1] <== muxes[i].out[1];
        cur[i + 1] <== hashers[i].out;
    }

    root <== cur[depth];
}

template Membership(depth) {
    // --- private witness ---
    signal input secret;
    signal input value;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    // --- public inputs ---
    signal input root;
    signal input externalNullifier;
    signal input signalHash;        // binds the proof to an action/signal

    // --- public output ---
    signal output nullifierHash;

    // Commitment C = Poseidon(secret, value)
    component com = Poseidon(2);
    com.inputs[0] <== secret;
    com.inputs[1] <== value;

    // Merkle membership: recomputed root must equal the public root.
    component mt = MerkleInclusion(depth);
    mt.leaf <== com.out;
    for (var i = 0; i < depth; i++) {
        mt.pathElements[i] <== pathElements[i];
        mt.pathIndices[i] <== pathIndices[i];
    }
    root === mt.root;

    // Nullifier N = Poseidon(externalNullifier, secret)
    component nf = Poseidon(2);
    nf.inputs[0] <== externalNullifier;
    nf.inputs[1] <== secret;
    nullifierHash <== nf.out;

    // Anti-tamper: bind signalHash into the constraint system (Semaphore-style)
    // so a proof can't be replayed against a different signal.
    signal signalHashSq;
    signalHashSq <== signalHash * signalHash;
}

component main { public [root, externalNullifier, signalHash] } = Membership(20);
