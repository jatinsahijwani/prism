#![no_std]
//! Prism — N->1 proof-aggregation coprocessor (headline feature).
//!
//! STUB (day-1 scaffold): compiles and deploys; real logic lands in a later milestone.
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct Aggregator;

#[contractimpl]
impl Aggregator {
    /// Liveness probe so the scaffolded contract is invocable on testnet.
    pub fn ping(_env: Env) -> u32 {
        1
    }
}
