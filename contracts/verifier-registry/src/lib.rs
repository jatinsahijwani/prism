#![no_std]
//! Prism — Groth16/BN254 verifier registry.
//!
//! Canonical proof system: **Groth16 over BN254**, verified with Soroban's native
//! BN254 host functions (`bn254_g1_add`, `bn254_g1_mul`, `bn254_multi_pairing_check`;
//! Protocol 25/26). This crate will expose an `IVerifier` trait + a `circuitId -> VK`
//! registry and the on-chain pairing check.
//!
//! STUB (day-1 scaffold): the real verify path lands in Step 3 once the circuit
//! fixtures (proof + verifying key + public inputs) exist.
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct VerifierRegistry;

#[contractimpl]
impl VerifierRegistry {
    /// Liveness probe so the scaffolded contract is invocable on testnet.
    pub fn ping(_env: Env) -> u32 {
        1
    }
}
