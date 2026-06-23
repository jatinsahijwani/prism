#![no_std]
//! Prism — spent-nullifier set.
//!
//! `N = Poseidon(externalNullifier, secret)` proves "this secret acted once for this
//! context" without revealing who. The registry is the shared spent-set:
//! - `check_and_insert` — atomic single insert (rejects a replay).
//! - `batch_insert`     — all-or-nothing: if ANY nullifier in the batch is already
//!   spent (or duplicated within the batch), the whole call reverts and none are
//!   inserted. This is what the Aggregator uses to settle K memberships atomically.
//!
//! All-or-nothing relies on Soroban invocation atomicity: returning `Err` rolls back
//! every storage write made during the call.
//!
//! HARDENING (noted in README): inserts are permissionless in this milestone; a
//! production deployment gates them to an authorized operator (the Aggregator).

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, BytesN, Env, Vec,
};

/// Emitted when a nullifier is marked spent.
#[contractevent]
pub struct NullifierSpent {
    pub nullifier: BytesN<32>,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadySpent = 1,
}

#[contracttype]
pub enum DataKey {
    Spent(BytesN<32>),
}

#[contract]
pub struct NullifierRegistry;

#[contractimpl]
impl NullifierRegistry {
    /// Has this nullifier already been spent?
    pub fn is_spent(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Spent(nullifier))
    }

    /// Atomically mark a nullifier spent; errors if it already was.
    pub fn check_and_insert(env: Env, nullifier: BytesN<32>) -> Result<(), Error> {
        Self::insert_one(&env, &nullifier)
    }

    /// All-or-nothing batch insert. Reverts (inserting none) if any nullifier is
    /// already spent or appears twice in `nullifiers`. Returns the count inserted.
    pub fn batch_insert(env: Env, nullifiers: Vec<BytesN<32>>) -> Result<u32, Error> {
        for n in nullifiers.iter() {
            // A duplicate within the batch is caught here: the first insert makes
            // `has` true for the second occurrence in the same invocation.
            Self::insert_one(&env, &n)?;
        }
        Ok(nullifiers.len())
    }

    fn insert_one(env: &Env, nullifier: &BytesN<32>) -> Result<(), Error> {
        let key = DataKey::Spent(nullifier.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadySpent);
        }
        env.storage().persistent().set(&key, &true);
        env.events().publish_event(&NullifierSpent {
            nullifier: nullifier.clone(),
        });
        Ok(())
    }
}

#[cfg(test)]
mod test;
