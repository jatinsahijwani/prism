#![no_std]
//! Prism — append-only incremental Merkle tree (circomlib Poseidon over BN254).
//!
//! Leaves are commitments `C = Poseidon(secret, value)`. Inserts are O(depth): we keep
//! the running left-siblings (`filled_subtrees`) and the precomputed empty-subtree roots
//! (`zeros`), exactly like Tornado/Semaphore — so the on-chain root equals the root the
//! aggregation circuit recomputes from a membership path. A bounded rolling history of
//! recent roots lets proofs against a slightly-stale root still validate.
//!
//! Depth 20 => up to 1,048,576 leaves. Hashing uses [`prism_stellar_poseidon`], which is
//! verified to match circomlib (see that crate's test).
//!
//! HARDENING (README): `insert` is permissionless this milestone; production gates it.

use prism_stellar_poseidon::Poseidon;
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, BytesN, Env, Vec,
};

/// Emitted when a leaf is appended.
#[contractevent]
pub struct LeafInserted {
    pub index: u32,
    pub root: BytesN<32>,
}

const DEPTH: u32 = 20;
const ROOT_HISTORY: u32 = 30;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    TreeFull = 3,
}

#[contracttype]
pub enum DataKey {
    Initialized,
    NextIndex,
    CurrentRoot,
    FilledSubtrees,
    Zeros,
    Roots, // bounded ring of recent roots (for is_known_root)
}

#[contract]
pub struct CommitmentTree;

#[contractimpl]
impl CommitmentTree {
    /// Initialize an empty tree: precompute the empty-subtree roots and seed
    /// `filled_subtrees`. Idempotent guard.
    pub fn init(env: Env) -> Result<(), Error> {
        let s = env.storage().instance();
        if s.has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        let p = Poseidon::new(&env);
        let zero = BytesN::from_array(&env, &[0u8; 32]);

        // zeros[i] = root of an empty subtree of height i; zeros[0] = ZERO leaf.
        let mut zeros: Vec<BytesN<32>> = Vec::new(&env);
        zeros.push_back(zero.clone());
        let mut cur = zero;
        let mut filled: Vec<BytesN<32>> = Vec::new(&env);
        for _ in 0..DEPTH {
            filled.push_back(cur.clone()); // filled_subtrees[i] starts as zeros[i]
            cur = p.hash2_bytes(&cur, &cur);
            zeros.push_back(cur.clone());
        }
        // cur is now zeros[DEPTH] = the empty-tree root.
        let mut roots: Vec<BytesN<32>> = Vec::new(&env);
        roots.push_back(cur.clone());

        s.set(&DataKey::Zeros, &zeros);
        s.set(&DataKey::FilledSubtrees, &filled);
        s.set(&DataKey::CurrentRoot, &cur);
        s.set(&DataKey::Roots, &roots);
        s.set(&DataKey::NextIndex, &0u32);
        s.set(&DataKey::Initialized, &true);
        Ok(())
    }

    /// Append a leaf; returns its zero-based index. Recomputes the root in O(depth).
    pub fn insert(env: Env, leaf: BytesN<32>) -> Result<u32, Error> {
        let s = env.storage().instance();
        if !s.has(&DataKey::Initialized) {
            return Err(Error::NotInitialized);
        }
        let index: u32 = s.get(&DataKey::NextIndex).unwrap();
        if index >= (1u32 << DEPTH) {
            return Err(Error::TreeFull);
        }

        let p = Poseidon::new(&env);
        let zeros: Vec<BytesN<32>> = s.get(&DataKey::Zeros).unwrap();
        let mut filled: Vec<BytesN<32>> = s.get(&DataKey::FilledSubtrees).unwrap();

        let mut idx = index;
        let mut cur = leaf.clone();
        for i in 0..DEPTH {
            let (left, right) = if idx & 1 == 0 {
                // current node is a left child: its right sibling is an empty subtree,
                // and this node becomes the filled left-sibling at level i.
                filled.set(i, cur.clone());
                (cur.clone(), zeros.get(i).unwrap())
            } else {
                (filled.get(i).unwrap(), cur.clone())
            };
            cur = p.hash2_bytes(&left, &right);
            idx >>= 1;
        }

        // Persist new state.
        s.set(&DataKey::FilledSubtrees, &filled);
        s.set(&DataKey::CurrentRoot, &cur);
        s.set(&DataKey::NextIndex, &(index + 1));

        // Push root into the bounded history ring.
        let mut roots: Vec<BytesN<32>> = s.get(&DataKey::Roots).unwrap();
        roots.push_back(cur.clone());
        while roots.len() > ROOT_HISTORY {
            roots.remove(0);
        }
        s.set(&DataKey::Roots, &roots);

        env.events().publish_event(&LeafInserted { index, root: cur });
        Ok(index)
    }

    /// The current Merkle root.
    pub fn root(env: Env) -> Result<BytesN<32>, Error> {
        env.storage()
            .instance()
            .get(&DataKey::CurrentRoot)
            .ok_or(Error::NotInitialized)
    }

    /// Is `root` among the recent roots (current or recently superseded)?
    pub fn is_known_root(env: Env, root: BytesN<32>) -> bool {
        let s = env.storage().instance();
        let roots: Vec<BytesN<32>> = match s.get(&DataKey::Roots) {
            Some(r) => r,
            None => return false,
        };
        roots.iter().any(|r| r == root)
    }

    /// Number of leaves inserted so far (== index of the next leaf).
    pub fn next_index(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::NextIndex).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
