#![no_std]
//! Prism — Association-Set Provider (ASP).
//!
//! Compliance gate for confidential settlement. Because settlement is anonymous (the
//! Aggregator only sees nullifiers), per-participant screening happens at ADMISSION: the
//! issuer admits only allowed participants into the commitment set and then **approves the
//! resulting Merkle root** here. The Aggregator's `settle()` consults `is_approved_root`
//! before inserting — so a batch can only settle against an association set the ASP has
//! signed off on (the Privacy-Pools model). The allow/deny set is also exposed directly
//! for issuers that screen by an opaque participant id at join time.
//!
//! HARDENING (README): mutations are permissionless this milestone; production gates them
//! to the issuer/compliance admin via `require_auth`.

use soroban_sdk::{contract, contractevent, contractimpl, contracttype, BytesN, Env};

#[contracttype]
pub enum DataKey {
    Allowed(BytesN<32>),
    Denied(BytesN<32>),
    Root(BytesN<32>),
}

#[contractevent]
pub struct RootApproved {
    pub root: BytesN<32>,
}

#[contract]
pub struct Asp;

#[contractimpl]
impl Asp {
    /// Add/remove a participant id from the allow set.
    pub fn set_allowed(env: Env, id: BytesN<32>, allowed: bool) {
        let key = DataKey::Allowed(id);
        if allowed {
            env.storage().persistent().set(&key, &true);
        } else {
            env.storage().persistent().remove(&key);
        }
    }

    /// Add/remove a participant id from the deny set (deny overrides allow).
    pub fn set_denied(env: Env, id: BytesN<32>, denied: bool) {
        let key = DataKey::Denied(id);
        if denied {
            env.storage().persistent().set(&key, &true);
        } else {
            env.storage().persistent().remove(&key);
        }
    }

    /// A participant is allowed iff in the allow set and not in the deny set.
    pub fn is_allowed(env: Env, id: BytesN<32>) -> bool {
        let s = env.storage().persistent();
        s.has(&DataKey::Allowed(id.clone())) && !s.has(&DataKey::Denied(id))
    }

    /// Approve a commitment-tree root for settlement (issuer attests the set is compliant).
    pub fn approve_root(env: Env, root: BytesN<32>) {
        env.storage().persistent().set(&DataKey::Root(root.clone()), &true);
        env.events().publish_event(&RootApproved { root });
    }

    pub fn revoke_root(env: Env, root: BytesN<32>) {
        env.storage().persistent().remove(&DataKey::Root(root));
    }

    pub fn is_approved_root(env: Env, root: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Root(root))
    }
}

#[cfg(test)]
mod test;
