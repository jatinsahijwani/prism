use crate::agg_fixtures::k8;
use crate::{
    Aggregator, AggregatorClient, Error, NullifierClient, Proof, TreeClient, VerifierClient,
    VerifyingKey,
};
// Real contracts (dev-dep) registered into the test env; driven via the local clients.
use prism_stellar_asp::{Asp, AspClient as AspContractClient};
use prism_stellar_commitment_tree::CommitmentTree;
use prism_stellar_nullifier_registry::NullifierRegistry;
use prism_stellar_verifier_registry::VerifierRegistry;
use soroban_sdk::{Address, BytesN, Env, Vec};

fn b32(env: &Env, b: &[u8; 32]) -> BytesN<32> {
    BytesN::from_array(env, b)
}
fn g1(env: &Env, b: &[u8; 64]) -> BytesN<64> {
    BytesN::from_array(env, b)
}
fn g2(env: &Env, b: &[u8; 128]) -> BytesN<128> {
    BytesN::from_array(env, b)
}

fn vk(env: &Env) -> VerifyingKey {
    let mut ic: Vec<BytesN<64>> = Vec::new(env);
    for p in k8::VK_IC.iter() {
        ic.push_back(g1(env, p));
    }
    VerifyingKey {
        alpha: g1(env, &k8::VK_ALPHA),
        beta: g2(env, &k8::VK_BETA),
        gamma: g2(env, &k8::VK_GAMMA),
        delta: g2(env, &k8::VK_DELTA),
        ic,
    }
}

fn proof(env: &Env) -> Proof {
    Proof {
        a: g1(env, &k8::PROOF_A),
        b: g2(env, &k8::PROOF_B),
        c: g1(env, &k8::PROOF_C),
    }
}

fn nullifiers(env: &Env) -> Vec<BytesN<32>> {
    let mut v: Vec<BytesN<32>> = Vec::new(env);
    for n in k8::NULLIFIERS.iter() {
        v.push_back(b32(env, n));
    }
    v
}

struct World {
    env: Env,
    agg_id: Address,
    nr_id: Address,
    asp_id: Address,
}

/// Register the contracts, build the tree from the K=8 commitments, register the
/// aggregation VK, approve the root in the ASP, and wire the aggregator.
fn world() -> World {
    let env = Env::default();
    let verifier_id = env.register(VerifierRegistry, ());
    let tree_id = env.register(CommitmentTree, ());
    let nr_id = env.register(NullifierRegistry, ());
    let asp_id = env.register(Asp, ());
    let agg_id = env.register(Aggregator, ());

    let v = VerifierClient::new(&env, &verifier_id);
    let t = TreeClient::new(&env, &tree_id);
    let agg = AggregatorClient::new(&env, &agg_id);

    let circuit_id = b32(&env, &[8u8; 32]);
    v.register(&circuit_id, &vk(&env));

    // Insert the K=8 commitments; the resulting on-chain root MUST equal the proof's root.
    t.init();
    for c in k8::COMMITMENTS.iter() {
        t.insert(&b32(&env, c));
    }
    assert_eq!(
        t.root(),
        b32(&env, &k8::ROOT),
        "on-chain tree root must equal the circuit's root"
    );

    // ASP approves the (compliant) root so settlement against it is permitted.
    AspContractClient::new(&env, &asp_id).approve_root(&b32(&env, &k8::ROOT));

    agg.init(&verifier_id, &tree_id, &nr_id, &asp_id, &circuit_id);
    World {
        env,
        agg_id,
        nr_id,
        asp_id,
    }
}

#[test]
fn k8_aggregate_verifies_and_inserts_all_8() {
    let w = world();
    let env = &w.env;
    let agg = AggregatorClient::new(env, &w.agg_id);
    let nr = NullifierClient::new(env, &w.nr_id);
    let count = agg.settle(
        &proof(env),
        &b32(env, &k8::ROOT),
        &b32(env, &k8::EXT_NULL),
        &b32(env, &k8::H),
        &b32(env, &k8::AGG_OUTPUT),
        &nullifiers(env),
    );
    assert_eq!(count, 8);
    for n in k8::NULLIFIERS.iter() {
        assert!(nr.is_spent(&b32(env, n)));
    }
}

#[test]
fn double_spent_nullifier_reverts_whole_batch() {
    let w = world();
    let env = &w.env;
    let agg = AggregatorClient::new(env, &w.agg_id);
    let nr = NullifierClient::new(env, &w.nr_id);
    // Pre-spend ONE of the batch's nullifiers out of band.
    nr.check_and_insert(&b32(env, &k8::NULLIFIERS[3]));

    let res = agg.try_settle(
        &proof(env),
        &b32(env, &k8::ROOT),
        &b32(env, &k8::EXT_NULL),
        &b32(env, &k8::H),
        &b32(env, &k8::AGG_OUTPUT),
        &nullifiers(env),
    );
    assert_eq!(res, Err(Ok(Error::NullifierAlreadySpent)));
    // All-or-nothing: a different batch nullifier must NOT have been inserted.
    assert!(!nr.is_spent(&b32(env, &k8::NULLIFIERS[0])));
}

#[test]
fn tampered_proof_rejected() {
    let w = world();
    let env = &w.env;
    // Swap C for A: still an on-curve G1 point, but the pairing no longer holds.
    let agg = AggregatorClient::new(env, &w.agg_id);
    let bad = Proof {
        a: g1(env, &k8::PROOF_A),
        b: g2(env, &k8::PROOF_B),
        c: g1(env, &k8::PROOF_A),
    };
    let res = agg.try_settle(
        &bad,
        &b32(env, &k8::ROOT),
        &b32(env, &k8::EXT_NULL),
        &b32(env, &k8::H),
        &b32(env, &k8::AGG_OUTPUT),
        &nullifiers(env),
    );
    assert_eq!(res, Err(Ok(Error::InvalidProof)));
}

#[test]
fn unapproved_root_rejected_by_asp() {
    let w = world();
    let env = &w.env;
    let agg = AggregatorClient::new(env, &w.agg_id);
    // Revoke ASP approval: the root is still a known tree root, but no longer compliant.
    AspContractClient::new(env, &w.asp_id).revoke_root(&b32(env, &k8::ROOT));
    let res = agg.try_settle(
        &proof(env),
        &b32(env, &k8::ROOT),
        &b32(env, &k8::EXT_NULL),
        &b32(env, &k8::H),
        &b32(env, &k8::AGG_OUTPUT),
        &nullifiers(env),
    );
    assert_eq!(res, Err(Ok(Error::RootNotApproved)));
}

#[test]
fn unknown_root_rejected() {
    let w = world();
    let env = &w.env;
    let agg = AggregatorClient::new(env, &w.agg_id);
    let res = agg.try_settle(
        &proof(env),
        &b32(env, &[1u8; 32]), // not a known root
        &b32(env, &k8::EXT_NULL),
        &b32(env, &k8::H),
        &b32(env, &k8::AGG_OUTPUT),
        &nullifiers(env),
    );
    assert_eq!(res, Err(Ok(Error::UnknownRoot)));
}

#[test]
fn h_binding_mismatch_rejected() {
    let w = world();
    let env = &w.env;
    let agg = AggregatorClient::new(env, &w.agg_id);
    // Wrong aggregate_output -> recomputed H won't match the proof's H.
    let res = agg.try_settle(
        &proof(env),
        &b32(env, &k8::ROOT),
        &b32(env, &k8::EXT_NULL),
        &b32(env, &k8::H),
        &b32(env, &[0u8; 32]),
        &nullifiers(env),
    );
    assert_eq!(res, Err(Ok(Error::HBindingMismatch)));
}
