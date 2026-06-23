use crate::{CommitmentTree, CommitmentTreeClient, Error};
use soroban_sdk::{BytesN, Env};

// Reference values computed with circomlibjs (depth-20, ZERO=0):
//   EMPTY_ROOT = zeros[20]
//   ROOT0      = root after inserting leaf=Poseidon(11112222333344445555,1000000) at index 0
const EMPTY_ROOT: &str = "2134e76ac5d21aab186c2be1dd8f84ee880a1e46eaf712f9d371b6df22191f3e";
const LEAF0: &str = "1aef1e19d3f0dea65013701de756e3a850acc39c63017077e95514f4d7191479";
const ROOT0: &str = "28c4260de9d9287c0677b2c34526c29738c4c5e96e4c7d1fdc9a074ec6617ef5";

fn hx(c: u8) -> u8 {
    match c {
        b'0'..=b'9' => c - b'0',
        b'a'..=b'f' => c - b'a' + 10,
        _ => 0,
    }
}
fn fb(env: &Env, s: &str) -> BytesN<32> {
    let b = s.as_bytes();
    let mut a = [0u8; 32];
    for i in 0..32 {
        a[i] = (hx(b[2 * i]) << 4) | hx(b[2 * i + 1]);
    }
    BytesN::from_array(env, &a)
}

fn setup(env: &Env) -> CommitmentTreeClient<'_> {
    let id = env.register(CommitmentTree, ());
    let c = CommitmentTreeClient::new(env, &id);
    c.init();
    c
}

#[test]
fn empty_root_matches_circomlib() {
    let env = Env::default();
    let c = setup(&env);
    assert_eq!(c.root(), fb(&env, EMPTY_ROOT));
    assert_eq!(c.next_index(), 0);
}

#[test]
fn insert_root_matches_circomlib() {
    let env = Env::default();
    let c = setup(&env);
    let idx = c.insert(&fb(&env, LEAF0));
    assert_eq!(idx, 0);
    assert_eq!(c.next_index(), 1);
    // The on-chain root must equal the circuit's recomputed root.
    assert_eq!(c.root(), fb(&env, ROOT0));
    // Current root is known; the just-superseded empty root is still in history.
    assert!(c.is_known_root(&fb(&env, ROOT0)));
    assert!(c.is_known_root(&fb(&env, EMPTY_ROOT)));
    // A random root is not known.
    assert!(!c.is_known_root(&BytesN::from_array(&env, &[9u8; 32])));
}

#[test]
fn second_insert_advances_index() {
    let env = Env::default();
    let c = setup(&env);
    assert_eq!(c.insert(&fb(&env, LEAF0)), 0);
    assert_eq!(c.insert(&BytesN::from_array(&env, &[1u8; 32])), 1);
    assert_eq!(c.next_index(), 2);
}

#[test]
fn init_twice_errors() {
    let env = Env::default();
    let id = env.register(CommitmentTree, ());
    let c = CommitmentTreeClient::new(&env, &id);
    c.init();
    assert_eq!(c.try_init(), Err(Ok(Error::AlreadyInitialized)));
}
