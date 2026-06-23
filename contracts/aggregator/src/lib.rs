#![no_std]
//! Prism — proof-AGGREGATION coprocessor (the headline).
//!
//! One on-chain Groth16/BN254 verify settles K memberships at once, and the verify cost
//! stays flat (~28.8M) regardless of K because the aggregation circuit exposes a CONSTANT
//! number of public inputs `[H, root, externalNullifier]`.
//!
//! `settle` composes the three primitives:
//!   1. `commitment-tree.is_known_root(root)`            — the proof's root is real.
//!   2. recompute `H = fold(aggregateOutput, nullifiers)` on-chain (circomlib Poseidon)
//!      and require it equals the proof's public `H`     — binds the calldata nullifiers
//!      + aggregateOutput to the proof without putting them on the public-input vector.
//!   3. `verifier-registry.verify(circuit_id, proof, [H, root, externalNullifier])`.
//!   4. `nullifier-registry.batch_insert(nullifiers)`    — all-or-nothing; any replay
//!      reverts the whole settlement.
//!
//! This is aggregation-by-batching. Recursion/folding (Nova/ProtoStar) is deferred to SCF.

use prism_stellar_poseidon::Poseidon;
use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype, vec,
    Address, BytesN, Env, Vec,
};

// --- Shared types (structurally identical to verifier-registry's, so they serialize
// identically across the contract boundary). Defined locally so this contract does not
// link the callee contract crates (which would collide wasm exports like `init`). ---

/// Groth16 verifying key (BN254 points, Ethereum-compatible encoding).
#[contracttype]
#[derive(Clone)]
pub struct VerifyingKey {
    pub alpha: BytesN<64>,
    pub beta: BytesN<128>,
    pub gamma: BytesN<128>,
    pub delta: BytesN<128>,
    pub ic: Vec<BytesN<64>>,
}

/// Groth16 proof (A, C in G1; B in G2).
#[contracttype]
#[derive(Clone)]
pub struct Proof {
    pub a: BytesN<64>,
    pub b: BytesN<128>,
    pub c: BytesN<64>,
}

// --- Cross-contract client interfaces (generate clients without linking the impls). ---

#[contractclient(name = "VerifierClient")]
pub trait VerifierInterface {
    fn register(env: Env, circuit_id: BytesN<32>, vk: VerifyingKey);
    fn verify(env: Env, circuit_id: BytesN<32>, proof: Proof, pub_signals: Vec<BytesN<32>>) -> bool;
}

#[contractclient(name = "TreeClient")]
pub trait TreeInterface {
    fn init(env: Env);
    fn insert(env: Env, leaf: BytesN<32>) -> u32;
    fn root(env: Env) -> BytesN<32>;
    fn is_known_root(env: Env, root: BytesN<32>) -> bool;
}

#[contractclient(name = "NullifierClient")]
pub trait NullifierInterface {
    fn is_spent(env: Env, nullifier: BytesN<32>) -> bool;
    fn check_and_insert(env: Env, nullifier: BytesN<32>);
    fn batch_insert(env: Env, nullifiers: Vec<BytesN<32>>) -> u32;
}

#[contractclient(name = "AspClient")]
pub trait AspInterface {
    fn is_approved_root(env: Env, root: BytesN<32>) -> bool;
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    UnknownRoot = 3,
    HBindingMismatch = 4,
    InvalidProof = 5,
    NullifierAlreadySpent = 6,
    EmptyBatch = 7,
    RootNotApproved = 8,
}

#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub verifier: Address,
    pub tree: Address,
    pub nullifiers: Address,
    pub asp: Address,
    pub circuit_id: BytesN<32>,
}

#[contracttype]
pub enum DataKey {
    Config,
}

/// Emitted on a successful aggregated settlement.
#[contractevent]
pub struct Settled {
    pub count: u32,
    pub root: BytesN<32>,
    pub aggregate_output: BytesN<32>,
    pub h: BytesN<32>,
}

#[contract]
pub struct Aggregator;

#[contractimpl]
impl Aggregator {
    /// Wire the aggregator to its three primitives and the aggregation circuit id.
    pub fn init(
        env: Env,
        verifier: Address,
        tree: Address,
        nullifiers: Address,
        asp: Address,
        circuit_id: BytesN<32>,
    ) -> Result<(), Error> {
        let s = env.storage().instance();
        if s.has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        s.set(
            &DataKey::Config,
            &Config {
                verifier,
                tree,
                nullifiers,
                asp,
                circuit_id,
            },
        );
        Ok(())
    }

    pub fn config(env: Env) -> Result<Config, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)
    }

    /// Settle K memberships with ONE proof. Returns the number of nullifiers spent.
    pub fn settle(
        env: Env,
        proof: Proof,
        root: BytesN<32>,
        external_nullifier: BytesN<32>,
        h: BytesN<32>,
        aggregate_output: BytesN<32>,
        nullifiers: Vec<BytesN<32>>,
    ) -> Result<u32, Error> {
        if nullifiers.is_empty() {
            return Err(Error::EmptyBatch);
        }
        let cfg: Config = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)?;

        // 1. The proof's root must be a real (recent) tree root.
        let tree = TreeClient::new(&env, &cfg.tree);
        if !tree.is_known_root(&root) {
            return Err(Error::UnknownRoot);
        }

        // 1b. ASP gate: the root must be one the association-set provider has approved
        // (compliance attestation that the set contains only allowed participants).
        let asp = AspClient::new(&env, &cfg.asp);
        if !asp.is_approved_root(&root) {
            return Err(Error::RootNotApproved);
        }

        // 2. Bind calldata (nullifiers, aggregate_output) to the proof via H.
        let poseidon = Poseidon::new(&env);
        let mut acc = aggregate_output.clone();
        for n in nullifiers.iter() {
            acc = poseidon.hash2_bytes(&acc, &n);
        }
        if acc != h {
            return Err(Error::HBindingMismatch);
        }

        // 3. ONE Groth16/BN254 verify (public inputs == circuit order [H, root, extN]).
        let pub_signals: Vec<BytesN<32>> =
            vec![&env, h.clone(), root.clone(), external_nullifier.clone()];
        let verifier = VerifierClient::new(&env, &cfg.verifier);
        if !verifier.verify(&cfg.circuit_id, &proof, &pub_signals) {
            return Err(Error::InvalidProof);
        }

        // 4. All-or-nothing batch insert; any already-spent nullifier reverts everything.
        let nr = NullifierClient::new(&env, &cfg.nullifiers);
        match nr.try_batch_insert(&nullifiers) {
            Ok(Ok(count)) => {
                env.events().publish_event(&Settled {
                    count,
                    root,
                    aggregate_output,
                    h,
                });
                Ok(count)
            }
            _ => Err(Error::NullifierAlreadySpent),
        }
    }
}

#[cfg(test)]
extern crate std;
#[cfg(test)]
mod test;
#[cfg(test)]
mod bench;
#[cfg(test)]
mod agg_fixtures;
