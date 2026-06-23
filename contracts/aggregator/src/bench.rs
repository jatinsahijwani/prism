//! Step-4 benchmark: prove the on-chain verify cost is FLAT in K.
//!
//! Each aggregation proof (K=1,2,4,8) has the same 3 public signals, so a single
//! Groth16/BN254 verify costs ~the same regardless of how many memberships it settles —
//! while naive per-proof verification is K× and breaks the ~100M ceiling at K=4.

use crate::agg_fixtures::{k1, k2, k4, k8};
use prism_stellar_verifier_registry::{Proof, VerifierRegistry, VerifierRegistryClient, VerifyingKey};
use soroban_sdk::{BytesN, Env, Vec};

#[allow(clippy::too_many_arguments)]
fn measure_verify(
    alpha: &[u8; 64],
    beta: &[u8; 128],
    gamma: &[u8; 128],
    delta: &[u8; 128],
    ic: &[[u8; 64]; 4],
    pa: &[u8; 64],
    pb: &[u8; 128],
    pc: &[u8; 64],
    h: &[u8; 32],
    root: &[u8; 32],
    ext: &[u8; 32],
) -> u64 {
    let env = Env::default();
    let id = env.register(VerifierRegistry, ());
    let client = VerifierRegistryClient::new(&env, &id);

    let mut ic_vec: Vec<BytesN<64>> = Vec::new(&env);
    for p in ic.iter() {
        ic_vec.push_back(BytesN::from_array(&env, p));
    }
    let vk = VerifyingKey {
        alpha: BytesN::from_array(&env, alpha),
        beta: BytesN::from_array(&env, beta),
        gamma: BytesN::from_array(&env, gamma),
        delta: BytesN::from_array(&env, delta),
        ic: ic_vec,
    };
    let proof = Proof {
        a: BytesN::from_array(&env, pa),
        b: BytesN::from_array(&env, pb),
        c: BytesN::from_array(&env, pc),
    };
    // public signals in circuit order: [H, root, externalNullifier]
    let mut pubs: Vec<BytesN<32>> = Vec::new(&env);
    pubs.push_back(BytesN::from_array(&env, h));
    pubs.push_back(BytesN::from_array(&env, root));
    pubs.push_back(BytesN::from_array(&env, ext));

    env.cost_estimate().budget().reset_unlimited();
    let ok = client.verify_with_vk(&vk, &proof, &pubs);
    let cpu = env.cost_estimate().budget().cpu_instruction_cost();
    assert!(ok, "fixture proof must verify");
    cpu
}

macro_rules! bench_k {
    ($m:ident) => {
        measure_verify(
            &$m::VK_ALPHA, &$m::VK_BETA, &$m::VK_GAMMA, &$m::VK_DELTA, &$m::VK_IC,
            &$m::PROOF_A, &$m::PROOF_B, &$m::PROOF_C, &$m::H, &$m::ROOT, &$m::EXT_NULL,
        )
    };
}

#[test]
fn verify_cost_is_flat_in_k() {
    let rows = [
        (1u32, bench_k!(k1)),
        (2, bench_k!(k2)),
        (4, bench_k!(k4)),
        (8, bench_k!(k8)),
    ];

    let single = rows[0].1;
    std::println!("\n================== PRISM AGGREGATOR BENCH ==================");
    std::println!(" K  | Prism: 1 verify (CPU insns) | Naive: K verifies | Naive fits <100M?");
    std::println!("----+-----------------------------+-------------------+------------------");
    for (k, cpu) in rows.iter() {
        let naive = (*cpu) * (*k as u64);
        std::println!(
            " {:<2} | {:>27} | {:>17} | {}",
            k,
            cpu,
            naive,
            if naive < 100_000_000 { "yes" } else { "NO — exceeds ceiling" }
        );
    }
    std::println!("===========================================================");
    std::println!("Note: native cargo-test CPU underestimates WASM; testnet sim is authoritative.");

    // The invariant: every K verifies in ~the same cost (flat), all under the ceiling.
    let max = rows.iter().map(|r| r.1).max().unwrap();
    let min = rows.iter().map(|r| r.1).min().unwrap();
    assert!(max < 100_000_000, "single verify must stay under ~100M");
    assert!(
        max - min < max / 20,
        "verify cost must be flat in K (spread {} too large)",
        max - min
    );
    // And the headline: naive verification blows the ceiling as K grows (robust even
    // against the native underestimate; the K=4 cliff shows in the table + testnet sim).
    let _ = single;
    assert!(rows[3].1 * 8 > 100_000_000, "expected naive K=8 to exceed ceiling");
}
