use crate::disclosure_fixtures as fx;
use crate::{Disclosure, DisclosureClient, Error, Proof};
use prism_stellar_verifier_registry::{VerifierRegistry, VerifierRegistryClient, VerifyingKey};
use soroban_sdk::{BytesN, Env, Vec};

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
    for p in fx::VK_IC.iter() {
        ic.push_back(g1(env, p));
    }
    VerifyingKey {
        alpha: g1(env, &fx::VK_ALPHA),
        beta: g2(env, &fx::VK_BETA),
        gamma: g2(env, &fx::VK_GAMMA),
        delta: g2(env, &fx::VK_DELTA),
        ic,
    }
}
fn proof(env: &Env) -> Proof {
    Proof {
        a: g1(env, &fx::PROOF_A),
        b: g2(env, &fx::PROOF_B),
        c: g1(env, &fx::PROOF_C),
    }
}

fn world() -> (Env, soroban_sdk::Address) {
    let env = Env::default();
    let verifier_id = env.register(VerifierRegistry, ());
    let disc_id = env.register(Disclosure, ());

    let circuit_id = b32(&env, &[42u8; 32]);
    VerifierRegistryClient::new(&env, &verifier_id).register(&circuit_id, &vk(&env));

    let disc = DisclosureClient::new(&env, &disc_id);
    disc.init(&verifier_id, &circuit_id);
    disc.register_auditor(&b32(&env, &fx::AX), &b32(&env, &fx::AY));
    (env, disc_id)
}

#[test]
fn put_note_with_valid_proof_stores_it() {
    let (env, disc_id) = world();
    let disc = DisclosureClient::new(&env, &disc_id);
    let commitment = b32(&env, &fx::COMMITMENT);

    disc.put_note(
        &commitment,
        &b32(&env, &fx::RX),
        &b32(&env, &fx::RY),
        &b32(&env, &fx::CIPHERTEXT),
        &proof(&env),
    );

    let note = disc.get_note(&commitment).unwrap();
    assert_eq!(note.ciphertext, b32(&env, &fx::CIPHERTEXT));
    assert_eq!(note.rx, b32(&env, &fx::RX));
}

#[test]
fn put_note_rejects_tampered_proof() {
    let (env, disc_id) = world();
    let disc = DisclosureClient::new(&env, &disc_id);
    // C := A (on-curve but wrong) -> pairing fails -> InvalidProof
    let bad = Proof {
        a: g1(&env, &fx::PROOF_A),
        b: g2(&env, &fx::PROOF_B),
        c: g1(&env, &fx::PROOF_A),
    };
    let res = disc.try_put_note(
        &b32(&env, &fx::COMMITMENT),
        &b32(&env, &fx::RX),
        &b32(&env, &fx::RY),
        &b32(&env, &fx::CIPHERTEXT),
        &bad,
    );
    assert_eq!(res, Err(Ok(Error::InvalidProof)));
    assert!(disc.get_note(&b32(&env, &fx::COMMITMENT)).is_none());
}

#[test]
fn put_note_rejects_wrong_ciphertext() {
    let (env, disc_id) = world();
    let disc = DisclosureClient::new(&env, &disc_id);
    // A different ciphertext breaks the public-input binding -> proof no longer valid.
    let res = disc.try_put_note(
        &b32(&env, &fx::COMMITMENT),
        &b32(&env, &fx::RX),
        &b32(&env, &fx::RY),
        &b32(&env, &[7u8; 32]),
        &proof(&env),
    );
    assert_eq!(res, Err(Ok(Error::InvalidProof)));
}
