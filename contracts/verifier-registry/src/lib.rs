#![no_std]
//! Prism — Groth16/BN254 verifier registry.
//!
//! Canonical proof system: **Groth16 over BN254**, verified with Soroban's native
//! BN254 host functions (`g1_add`, `g1_msm`, `pairing_check`; Protocol 25/26).
//!
//! Verification equation (negate A so the whole product equals 1):
//!   e(-A, B) · e(alpha, beta) · e(vk_x, gamma) · e(C, delta) == 1
//! where  vk_x = IC[0] + Σ pub_signals[i] · IC[i+1].
//!
//! Point encodings (Ethereum / EIP-196-197 compatible, enforced by the host):
//!   G1 = BytesN<64>  : be32(X) || be32(Y)
//!   G2 = BytesN<128> : be32(X.c1) || be32(X.c0) || be32(Y.c1) || be32(Y.c0)
//!   Fr = BytesN<32>  : be32(scalar)

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    BytesN, Env, Vec,
};

/// Groth16 verifying key (BN254 points in Ethereum-compatible byte encoding).
#[contracttype]
#[derive(Clone)]
pub struct VerifyingKey {
    pub alpha: BytesN<64>,
    pub beta: BytesN<128>,
    pub gamma: BytesN<128>,
    pub delta: BytesN<128>,
    pub ic: Vec<BytesN<64>>, // length == nPublic + 1
}

/// Groth16 proof (A, C in G1; B in G2).
#[contracttype]
#[derive(Clone)]
pub struct Proof {
    pub a: BytesN<64>,
    pub b: BytesN<128>,
    pub c: BytesN<64>,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    CircuitNotRegistered = 1,
    PublicInputLenMismatch = 2,
}

#[contracttype]
pub enum DataKey {
    /// circuit_id -> VerifyingKey
    Vk(BytesN<32>),
}

#[contract]
pub struct VerifierRegistry;

#[contractimpl]
impl VerifierRegistry {
    /// Register (or overwrite) a verifying key under a circuit id.
    pub fn register(env: Env, circuit_id: BytesN<32>, vk: VerifyingKey) {
        env.storage()
            .persistent()
            .set(&DataKey::Vk(circuit_id), &vk);
    }

    /// Verify a Groth16/BN254 proof against a registered circuit's VK.
    pub fn verify(
        env: Env,
        circuit_id: BytesN<32>,
        proof: Proof,
        pub_signals: Vec<BytesN<32>>,
    ) -> Result<bool, Error> {
        let vk: VerifyingKey = env
            .storage()
            .persistent()
            .get(&DataKey::Vk(circuit_id))
            .ok_or(Error::CircuitNotRegistered)?;
        Self::verify_with_vk(env, vk, proof, pub_signals)
    }

    /// Stateless verify with the VK passed inline (handy for benchmarks/tests and
    /// for the IVerifier-style composable call other contracts can make).
    pub fn verify_with_vk(
        env: Env,
        vk: VerifyingKey,
        proof: Proof,
        pub_signals: Vec<BytesN<32>>,
    ) -> Result<bool, Error> {
        if pub_signals.len() + 1 != vk.ic.len() {
            return Err(Error::PublicInputLenMismatch);
        }
        Ok(groth16_verify(&env, &vk, &proof, &pub_signals))
    }
}

/// Core Groth16/BN254 pairing check via native host functions.
fn groth16_verify(
    env: &Env,
    vk: &VerifyingKey,
    proof: &Proof,
    pub_signals: &Vec<BytesN<32>>,
) -> bool {
    let bn = env.crypto().bn254();

    // vk_x = IC[0] + Σ pub_signals[i] · IC[i+1]  (one MSM over the public inputs)
    let mut points: Vec<Bn254G1Affine> = Vec::new(env);
    let mut scalars: Vec<Bn254Fr> = Vec::new(env);
    for i in 0..pub_signals.len() {
        points.push_back(Bn254G1Affine::from_bytes(vk.ic.get_unchecked(i + 1)));
        scalars.push_back(Bn254Fr::from_bytes(pub_signals.get_unchecked(i)));
    }
    let acc = bn.g1_msm(points, scalars);
    let ic0 = Bn254G1Affine::from_bytes(vk.ic.get_unchecked(0));
    let vk_x = bn.g1_add(&ic0, &acc);

    // Assemble the four pairings; negate A so the product must equal 1.
    let neg_a = -Bn254G1Affine::from_bytes(proof.a.clone());

    let mut g1s: Vec<Bn254G1Affine> = Vec::new(env);
    g1s.push_back(neg_a);
    g1s.push_back(Bn254G1Affine::from_bytes(vk.alpha.clone()));
    g1s.push_back(vk_x);
    g1s.push_back(Bn254G1Affine::from_bytes(proof.c.clone()));

    let mut g2s: Vec<Bn254G2Affine> = Vec::new(env);
    g2s.push_back(Bn254G2Affine::from_bytes(proof.b.clone()));
    g2s.push_back(Bn254G2Affine::from_bytes(vk.beta.clone()));
    g2s.push_back(Bn254G2Affine::from_bytes(vk.gamma.clone()));
    g2s.push_back(Bn254G2Affine::from_bytes(vk.delta.clone()));

    bn.pairing_check(g1s, g2s)
}

#[cfg(test)]
extern crate std;
#[cfg(test)]
mod test;
#[cfg(test)]
mod test_fixtures;
