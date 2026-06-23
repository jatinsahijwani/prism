#![no_std]
//! Prism — Omnichain nullifier mirror (EVM → Stellar), ATTESTATION MODE.
//!
//! Nullifiers are chain-agnostic field elements (`N = Poseidon(secret, externalNullifier)`),
//! so the same identity yields the same nullifier on EVM and Stellar. A trusted **relayer**
//! (the designated `operator`) posts the EVM-side spent-nullifier set here; the Aggregator's
//! `settle()` then rejects any nullifier already spent on EVM — making a double-claim across
//! chains impossible, and giving EVM ZK identities a one-way bridge onto Stellar.
//!
//! TRUST (labeled in README): the relayer is TRUSTED this milestone. The `foreign_root`
//! accumulator is a commitment to the posted set; the SCF version replaces the trusted
//! relayer with on-chain verification of a succinct proof of EVM state against this root
//! (feasible via BN254/EVM precompile parity).

use prism_stellar_poseidon::Poseidon;
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, BytesN, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
}

#[contracttype]
pub enum DataKey {
    Operator,
    Root,
    Count,
    Spent(BytesN<32>),
}

/// Emitted when the relayer mirrors a foreign-spent nullifier.
#[contractevent]
pub struct ForeignNullifierMirrored {
    pub nullifier: BytesN<32>,
    pub root: BytesN<32>,
    pub count: u32,
}

#[contract]
pub struct OmnichainMirror;

#[contractimpl]
impl OmnichainMirror {
    /// Set the relayer/operator allowed to post foreign-spent nullifiers.
    pub fn init(env: Env, operator: Address) -> Result<(), Error> {
        let s = env.storage().instance();
        if s.has(&DataKey::Operator) {
            return Err(Error::AlreadyInitialized);
        }
        s.set(&DataKey::Operator, &operator);
        s.set(&DataKey::Root, &BytesN::from_array(&env, &[0u8; 32]));
        s.set(&DataKey::Count, &0u32);
        Ok(())
    }

    /// Mirror a single EVM-spent nullifier (operator only).
    pub fn post_spent(env: Env, nullifier: BytesN<32>) -> Result<(), Error> {
        Self::require_operator(&env)?;
        Self::insert_one(&env, &nullifier);
        Ok(())
    }

    /// Mirror a batch of EVM-spent nullifiers (operator only). Returns new total count.
    pub fn post_spent_batch(env: Env, nullifiers: Vec<BytesN<32>>) -> Result<u32, Error> {
        Self::require_operator(&env)?;
        for n in nullifiers.iter() {
            Self::insert_one(&env, &n);
        }
        Ok(env.storage().instance().get(&DataKey::Count).unwrap_or(0))
    }

    /// Is this nullifier already spent on the foreign (EVM) chain?
    pub fn is_foreign_spent(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Spent(nullifier))
    }

    /// Accumulator commitment over the posted foreign set (SCF: verified vs EVM state).
    pub fn foreign_root(env: Env) -> BytesN<32> {
        env.storage()
            .instance()
            .get(&DataKey::Root)
            .unwrap_or_else(|| BytesN::from_array(&env, &[0u8; 32]))
    }

    pub fn foreign_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Count).unwrap_or(0)
    }

    pub fn operator(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Operator)
            .ok_or(Error::NotInitialized)
    }

    fn require_operator(env: &Env) -> Result<(), Error> {
        let op: Address = env
            .storage()
            .instance()
            .get(&DataKey::Operator)
            .ok_or(Error::NotInitialized)?;
        op.require_auth();
        Ok(())
    }

    fn insert_one(env: &Env, nullifier: &BytesN<32>) {
        let key = DataKey::Spent(nullifier.clone());
        if env.storage().persistent().has(&key) {
            return; // idempotent: don't double-count / re-fold
        }
        env.storage().persistent().set(&key, &true);

        // foreign_root = Poseidon(prev_root, nullifier); a running commitment to the set.
        let s = env.storage().instance();
        let prev: BytesN<32> = s
            .get(&DataKey::Root)
            .unwrap_or_else(|| BytesN::from_array(env, &[0u8; 32]));
        let root = Poseidon::new(env).hash2_bytes(&prev, nullifier);
        s.set(&DataKey::Root, &root);
        let count: u32 = s.get(&DataKey::Count).unwrap_or(0) + 1;
        s.set(&DataKey::Count, &count);

        env.events().publish_event(&ForeignNullifierMirrored {
            nullifier: nullifier.clone(),
            root,
            count,
        });
    }
}

#[cfg(test)]
mod test;
