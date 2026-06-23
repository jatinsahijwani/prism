#![no_std]
//! Prism — circomlib-compatible Poseidon over BN254 (state size t=3, 2-input hash),
//! implemented on top of Soroban's parameterized CAP-0075 `poseidon_permutation`
//! host function by feeding it circomlib's exact MDS + round constants.
//!
//! Construction (matches circomlib `poseidon_reference.js`):
//!   state = [0, a, b]; for each round: ARK (+RC) → S-box(x^5, full/partial) → MDS·state;
//!   output = state[0]. circomlib's optimized in-circuit form yields the same state[0],
//!   so circuit and chain agree (verified by the `matches_circomlib_vector` test).
//!
//! Only t=3 is needed on-chain: Merkle node hashing, commitments, nullifiers, and the
//! aggregator's H-fold are all 2-input.

use soroban_sdk::{crypto::bn254::Bn254Fr, Bytes, BytesN, Env, Symbol, U256, Vec};

mod constants_t3;
use constants_t3::{D, MDS, RC, ROUNDS_F, ROUNDS_P, T};

/// A reusable Poseidon hasher that builds the (constant) parameter matrices once,
/// so a Merkle path or an H-fold of K nullifiers doesn't rebuild them per hash.
pub struct Poseidon {
    env: Env,
    field: Symbol,
    mds: Vec<Vec<U256>>,
    rc: Vec<Vec<U256>>,
}

impl Poseidon {
    pub fn new(env: &Env) -> Self {
        let mut mds: Vec<Vec<U256>> = Vec::new(env);
        for i in 0..T {
            let mut row: Vec<U256> = Vec::new(env);
            for j in 0..T {
                row.push_back(u256(env, &MDS[(i * T + j) as usize]));
            }
            mds.push_back(row);
        }
        let rounds = ROUNDS_F + ROUNDS_P;
        let mut rc: Vec<Vec<U256>> = Vec::new(env);
        for r in 0..rounds {
            let mut row: Vec<U256> = Vec::new(env);
            for i in 0..T {
                row.push_back(u256(env, &RC[(r * T + i) as usize]));
            }
            rc.push_back(row);
        }
        Self {
            env: env.clone(),
            field: Symbol::new(env, "BN254"),
            mds,
            rc,
        }
    }

    /// Poseidon hash of two field elements (circomlib `Poseidon(2)`).
    pub fn hash2(&self, a: &U256, b: &U256) -> U256 {
        let mut input: Vec<U256> = Vec::new(&self.env);
        input.push_back(U256::from_u32(&self.env, 0));
        input.push_back(a.clone());
        input.push_back(b.clone());
        let out = self.env.crypto_hazmat().poseidon_permutation(
            &input,
            self.field.clone(),
            T,
            D,
            ROUNDS_F,
            ROUNDS_P,
            &self.mds,
            &self.rc,
        );
        out.get(0).unwrap()
    }

    /// Poseidon hash of two 32-byte big-endian field elements -> 32-byte big-endian.
    /// Convenience for Merkle nodes / nullifier folds stored as `BytesN<32>`.
    pub fn hash2_bytes(&self, a: &BytesN<32>, b: &BytesN<32>) -> BytesN<32> {
        let av = U256::from_be_bytes(&self.env, &Bytes::from_array(&self.env, &a.to_array()));
        let bv = U256::from_be_bytes(&self.env, &Bytes::from_array(&self.env, &b.to_array()));
        let h = self.hash2(&av, &bv);
        let mut arr = [0u8; 32];
        h.to_be_bytes().copy_into_slice(&mut arr);
        BytesN::from_array(&self.env, &arr)
    }

    /// Reduce a U256 into the BN254 scalar field (canonical leaf/nullifier domain).
    pub fn to_fr(&self, v: &U256) -> Bn254Fr {
        Bn254Fr::from_u256(v.clone())
    }
}

fn u256(env: &Env, b: &[u8; 32]) -> U256 {
    U256::from_be_bytes(env, &Bytes::from_array(env, b))
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::U256;

    #[test]
    fn matches_circomlib_vector() {
        // circomlibjs: poseidon([1,2]) == 7853200120776062878684798364095072458815029376092732009249414926327459813530
        let env = Env::default();
        let p = Poseidon::new(&env);
        let got = p.hash2(&U256::from_u32(&env, 1), &U256::from_u32(&env, 2));

        let expect = U256::from_be_bytes(
            &env,
            &soroban_sdk::Bytes::from_array(
                &env,
                &dec_to_be32(
                    "7853200120776062878684798364095072458815029376092732009249414926327459813530",
                ),
            ),
        );
        std::println!("poseidon([1,2]) on-chain = {:?}", got);
        assert_eq!(got, expect, "on-chain Poseidon must match circomlib");
    }

    // Tiny decimal -> 32-byte big-endian helper for the test vector.
    fn dec_to_be32(dec: &str) -> [u8; 32] {
        let mut digits = [0u8; 32]; // base-256 big-endian accumulator
        for ch in dec.bytes() {
            let d = (ch - b'0') as u16;
            let mut carry = d;
            for k in (0..32).rev() {
                let v = digits[k] as u16 * 10 + carry;
                digits[k] = (v & 0xff) as u8;
                carry = v >> 8;
            }
        }
        digits
    }
}
