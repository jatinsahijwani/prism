use crate::test_fixtures::*;
use crate::{Proof, VerifierRegistry, VerifierRegistryClient, VerifyingKey};
use soroban_sdk::{BytesN, Env, Vec};

fn g1(env: &Env, b: &[u8; 64]) -> BytesN<64> {
    BytesN::from_array(env, b)
}
fn g2(env: &Env, b: &[u8; 128]) -> BytesN<128> {
    BytesN::from_array(env, b)
}

fn fixture_vk(env: &Env) -> VerifyingKey {
    let mut ic: Vec<BytesN<64>> = Vec::new(env);
    for p in VK_IC.iter() {
        ic.push_back(g1(env, p));
    }
    VerifyingKey {
        alpha: g1(env, &VK_ALPHA),
        beta: g2(env, &VK_BETA),
        gamma: g2(env, &VK_GAMMA),
        delta: g2(env, &VK_DELTA),
        ic,
    }
}

fn fixture_proof(env: &Env) -> Proof {
    Proof {
        a: g1(env, &PROOF_A),
        b: g2(env, &PROOF_B),
        c: g1(env, &PROOF_C),
    }
}

fn fixture_pub_signals(env: &Env) -> Vec<BytesN<32>> {
    let mut v: Vec<BytesN<32>> = Vec::new(env);
    for s in PUB_SIGNALS.iter() {
        v.push_back(BytesN::from_array(env, s));
    }
    v
}

#[test]
fn verifies_real_fixture_proof() {
    let env = Env::default();
    let id = env.register(VerifierRegistry, ());
    let client = VerifierRegistryClient::new(&env, &id);

    let ok = client.verify_with_vk(&fixture_vk(&env), &fixture_proof(&env), &fixture_pub_signals(&env));
    assert!(ok, "valid Groth16/BN254 proof must verify");
}

#[test]
fn rejects_tampered_public_input() {
    let env = Env::default();
    let id = env.register(VerifierRegistry, ());
    let client = VerifierRegistryClient::new(&env, &id);

    // Flip one public signal -> proof must NOT verify.
    let mut pubs = fixture_pub_signals(&env);
    let mut bad = [0u8; 32];
    bad.copy_from_slice(&PUB_SIGNALS[1]);
    bad[31] ^= 0x01;
    pubs.set(1, BytesN::from_array(&env, &bad));

    let ok = client.verify_with_vk(&fixture_vk(&env), &fixture_proof(&env), &pubs);
    assert!(!ok, "tampered public input must be rejected");
}

#[test]
fn register_then_verify_via_storage() {
    let env = Env::default();
    let id = env.register(VerifierRegistry, ());
    let client = VerifierRegistryClient::new(&env, &id);

    let circuit_id: BytesN<32> = BytesN::from_array(&env, &[7u8; 32]);
    client.register(&circuit_id, &fixture_vk(&env));

    let ok = client.verify(&circuit_id, &fixture_proof(&env), &fixture_pub_signals(&env));
    assert!(ok);
}

/// Step-4 measurement: print the CPU instruction count of a single on-chain
/// Groth16/BN254 verify and assert it stays under the ~100M ceiling.
#[test]
fn bench_verify_instruction_count() {
    let env = Env::default();
    let id = env.register(VerifierRegistry, ());
    let client = VerifierRegistryClient::new(&env, &id);

    let vk = fixture_vk(&env);
    let proof = fixture_proof(&env);
    let pubs = fixture_pub_signals(&env);

    // Reset so we measure only the verify invocation.
    env.cost_estimate().budget().reset_unlimited();
    let ok = client.verify_with_vk(&vk, &proof, &pubs);
    let cpu = env.cost_estimate().budget().cpu_instruction_cost();
    let mem = env.cost_estimate().budget().memory_bytes_cost();

    assert!(ok);
    std::println!("================ PRISM BENCH ================");
    std::println!("Groth16/BN254 verify (4 public inputs)");
    std::println!("  CPU instructions : {}", cpu);
    std::println!("  Memory bytes     : {}", mem);
    std::println!("  Ceiling          : 100,000,000");
    std::println!("  Headroom         : {}", 100_000_000i64 - cpu as i64);
    std::println!("============================================");
    assert!(
        cpu < 100_000_000,
        "verify exceeded the ~100M instruction ceiling: {}",
        cpu
    );
}
