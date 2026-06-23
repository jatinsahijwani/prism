#![no_std]
//! Prism — spent-nullifier set with atomic check_and_insert.
//!
//! STUB (day-1 scaffold): compiles and deploys; real logic lands in a later milestone.
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct NullifierRegistry;

#[contractimpl]
impl NullifierRegistry {
    /// Liveness probe so the scaffolded contract is invocable on testnet.
    pub fn ping(_env: Env) -> u32 {
        1
    }
}
