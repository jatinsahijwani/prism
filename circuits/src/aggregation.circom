pragma circom 2.1.6;

// Prism — proof-AGGREGATION circuit (aggregation-by-batching, NOT recursion/folding;
// folding is deferred to SCF). Proves K memberships against the SAME tree root and
// derives K nullifiers, but exposes a CONSTANT number of public signals regardless
// of K — this is the invariant that keeps the on-chain verify flat (~28.8M) as K grows.
//
// Public signals (constant in K):
//   output H               — fold over (aggregateOutput, nullifier_0..K-1)
//   input  root            — the shared Merkle root
//   input  externalNullifier
// The K nullifiers and aggregateOutput are NOT public inputs; they are supplied to the
// Aggregator contract as calldata and re-bound on-chain by recomputing H.
//
// Hash is circomlib Poseidon (BN254), matched on-chain by prism-stellar-poseidon.

include "../node_modules/circomlib/circuits/poseidon.circom";

template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];
    s * (1 - s) === 0;
    out[0] <== (in[1] - in[0]) * s + in[0];
    out[1] <== (in[0] - in[1]) * s + in[1];
}

template MerkleInclusion(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];
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

template Aggregation(K, depth) {
    // private witness: K membership tuples
    signal input secret[K];
    signal input value[K];
    signal input pathElements[K][depth];
    signal input pathIndices[K][depth];

    // public inputs
    signal input root;
    signal input externalNullifier;

    // public output
    signal output H;

    component com[K];
    component mt[K];
    component nf[K];
    signal nullifier[K];
    signal valueAcc[K + 1];
    valueAcc[0] <== 0;

    for (var k = 0; k < K; k++) {
        // commitment C_k = Poseidon(secret_k, value_k)
        com[k] = Poseidon(2);
        com[k].inputs[0] <== secret[k];
        com[k].inputs[1] <== value[k];

        // membership of C_k against the shared root
        mt[k] = MerkleInclusion(depth);
        mt[k].leaf <== com[k].out;
        for (var i = 0; i < depth; i++) {
            mt[k].pathElements[i] <== pathElements[k][i];
            mt[k].pathIndices[i] <== pathIndices[k][i];
        }
        root === mt[k].root;

        // nullifier_k = Poseidon(externalNullifier, secret_k)
        nf[k] = Poseidon(2);
        nf[k].inputs[0] <== externalNullifier;
        nf[k].inputs[1] <== secret[k];
        nullifier[k] <== nf[k].out;

        valueAcc[k + 1] <== valueAcc[k] + value[k];
    }

    signal aggregateOutput;
    aggregateOutput <== valueAcc[K];

    // H = Poseidon( ... Poseidon(Poseidon(aggregateOutput, n_0), n_1) ..., n_{K-1})
    component hf[K];
    signal acc[K + 1];
    acc[0] <== aggregateOutput;
    for (var k = 0; k < K; k++) {
        hf[k] = Poseidon(2);
        hf[k].inputs[0] <== acc[k];
        hf[k].inputs[1] <== nullifier[k];
        acc[k + 1] <== hf[k].out;
    }
    H <== acc[K];
}
