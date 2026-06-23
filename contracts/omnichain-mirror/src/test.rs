use crate::{Error, OmnichainMirror, OmnichainMirrorClient};
use soroban_sdk::{testutils::Address as _, vec, Address, BytesN, Env, Vec};

fn n(env: &Env, x: u8) -> BytesN<32> {
    let mut b = [0u8; 32];
    b[31] = x;
    BytesN::from_array(env, &b)
}

fn setup(env: &Env) -> OmnichainMirrorClient<'_> {
    env.mock_all_auths(); // operator-gated calls
    let id = env.register(OmnichainMirror, ());
    let c = OmnichainMirrorClient::new(env, &id);
    let operator = Address::generate(env);
    c.init(&operator);
    c
}

#[test]
fn post_and_check() {
    let env = Env::default();
    let c = setup(&env);
    assert!(!c.is_foreign_spent(&n(&env, 1)));
    c.post_spent(&n(&env, 1));
    assert!(c.is_foreign_spent(&n(&env, 1)));
    assert!(!c.is_foreign_spent(&n(&env, 2)));
}

#[test]
fn batch_and_idempotent_count() {
    let env = Env::default();
    let c = setup(&env);
    let batch: Vec<BytesN<32>> = vec![&env, n(&env, 1), n(&env, 2), n(&env, 3)];
    assert_eq!(c.post_spent_batch(&batch), 3);
    // Re-posting an existing nullifier is idempotent (count unchanged).
    c.post_spent(&n(&env, 1));
    assert_eq!(c.foreign_count(), 3);
}

#[test]
fn root_advances_with_posts() {
    let env = Env::default();
    let c = setup(&env);
    let zero = BytesN::from_array(&env, &[0u8; 32]);
    assert_eq!(c.foreign_root(), zero);
    c.post_spent(&n(&env, 7));
    let r1 = c.foreign_root();
    assert_ne!(r1, zero);
    c.post_spent(&n(&env, 8));
    assert_ne!(c.foreign_root(), r1);
}

#[test]
fn init_twice_errors() {
    let env = Env::default();
    let c = setup(&env);
    let op = Address::generate(&env);
    assert_eq!(c.try_init(&op), Err(Ok(Error::AlreadyInitialized)));
}
