#![no_std]
//! Prism — selective disclosure (the SEP-57 / confidential-token plug-in).
//!
//! Each note carries an encrypted amount under the auditor's viewing key (Baby Jubjub
//! ECDH + Poseidon, done client-side in the SDK). `put_note` accepts a note ONLY with a
//! disclosure-correctness proof showing the ciphertext decrypts to the amount committed in
//! `commitment = Poseidon(secret, amount)` under the registered auditor key — so what the
//! auditor later decrypts is provably the committed number. The chain stores only
//! `(R, ciphertext)`; amounts never appear in the clear.
//!
//! SEP-57 mapping: a regulated-asset issuer registers its auditor/regulator viewing key
//! here; holders settle privately (Aggregator) and attach disclosure notes; the regulator
//! verifies scoped predicates (total == X, all <= cap) off-chain via `prism.disclose`.
//! This is the ZK confidential+disclosure module an issuer plugs in — not a generic view key.

use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype, vec,
    Address, BytesN, Env, Vec,
};

/// Groth16 proof (structurally identical to verifier-registry's; defined locally so this
/// contract doesn't link the callee's wasm exports).
#[contracttype]
#[derive(Clone)]
pub struct Proof {
    pub a: BytesN<64>,
    pub b: BytesN<128>,
    pub c: BytesN<64>,
}

#[contractclient(name = "VerifierClient")]
pub trait VerifierInterface {
    fn verify(env: Env, circuit_id: BytesN<32>, proof: Proof, pub_signals: Vec<BytesN<32>>) -> bool;
}

/// Auditor / regulator viewing key — a Baby Jubjub public point (field-element coords).
#[contracttype]
#[derive(Clone)]
pub struct AuditorKey {
    pub ax: BytesN<32>,
    pub ay: BytesN<32>,
}

/// Encrypted note stored on-chain: ephemeral pubkey R and the amount ciphertext.
#[contracttype]
#[derive(Clone)]
pub struct Note {
    pub rx: BytesN<32>,
    pub ry: BytesN<32>,
    pub ciphertext: BytesN<32>,
}

#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub verifier: Address,
    pub circuit_id: BytesN<32>,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NoAuditor = 3,
    InvalidProof = 4,
}

#[contracttype]
pub enum DataKey {
    Config,
    Auditor,
    Note(BytesN<32>), // keyed by commitment
}

#[contractevent]
pub struct NoteStored {
    pub commitment: BytesN<32>,
}

#[contract]
pub struct Disclosure;

#[contractimpl]
impl Disclosure {
    pub fn init(env: Env, verifier: Address, circuit_id: BytesN<32>) -> Result<(), Error> {
        let s = env.storage().instance();
        if s.has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        s.set(&DataKey::Config, &Config { verifier, circuit_id });
        Ok(())
    }

    /// Register (or rotate) the auditor's viewing-key public point.
    pub fn register_auditor(env: Env, ax: BytesN<32>, ay: BytesN<32>) {
        env.storage().instance().set(&DataKey::Auditor, &AuditorKey { ax, ay });
    }

    pub fn auditor(env: Env) -> Option<AuditorKey> {
        env.storage().instance().get(&DataKey::Auditor)
    }

    /// Store an encrypted note, but ONLY if the disclosure-correctness proof binds the
    /// ciphertext to `commitment` under the registered auditor key.
    pub fn put_note(
        env: Env,
        commitment: BytesN<32>,
        rx: BytesN<32>,
        ry: BytesN<32>,
        ciphertext: BytesN<32>,
        proof: Proof,
    ) -> Result<(), Error> {
        let cfg: Config = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)?;
        let aud: AuditorKey = env
            .storage()
            .instance()
            .get(&DataKey::Auditor)
            .ok_or(Error::NoAuditor)?;

        // public signals MUST match the circuit order: [commitment, Ax, Ay, Rx, Ry, c]
        let pub_signals: Vec<BytesN<32>> = vec![
            &env,
            commitment.clone(),
            aud.ax,
            aud.ay,
            rx.clone(),
            ry.clone(),
            ciphertext.clone(),
        ];
        let verifier = VerifierClient::new(&env, &cfg.verifier);
        if !verifier.verify(&cfg.circuit_id, &proof, &pub_signals) {
            return Err(Error::InvalidProof);
        }

        env.storage().persistent().set(
            &DataKey::Note(commitment.clone()),
            &Note { rx, ry, ciphertext },
        );
        env.events().publish_event(&NoteStored { commitment });
        Ok(())
    }

    pub fn get_note(env: Env, commitment: BytesN<32>) -> Option<Note> {
        env.storage().persistent().get(&DataKey::Note(commitment))
    }
}

#[cfg(test)]
mod test;
#[cfg(test)]
mod disclosure_fixtures;
