#![no_std]
//! Prism — append-only incremental Merkle tree (Poseidon2 host fn).
//!
//! STUB (day-1 scaffold): compiles and deploys; real logic lands in a later milestone.
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct CommitmentTree;

#[contractimpl]
impl CommitmentTree {
    /// Liveness probe so the scaffolded contract is invocable on testnet.
    pub fn ping(_env: Env) -> u32 {
        1
    }
}
