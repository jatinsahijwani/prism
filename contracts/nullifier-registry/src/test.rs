use crate::{Error, NullifierRegistry, NullifierRegistryClient};
use soroban_sdk::{vec, BytesN, Env, Vec};

fn n(env: &Env, x: u8) -> BytesN<32> {
    let mut b = [0u8; 32];
    b[31] = x;
    BytesN::from_array(env, &b)
}

fn setup(env: &Env) -> NullifierRegistryClient<'_> {
    let id = env.register(NullifierRegistry, ());
    NullifierRegistryClient::new(env, &id)
}

#[test]
fn check_and_insert_then_spent() {
    let env = Env::default();
    let c = setup(&env);
    assert!(!c.is_spent(&n(&env, 1)));
    c.check_and_insert(&n(&env, 1));
    assert!(c.is_spent(&n(&env, 1)));
}

#[test]
fn double_insert_rejected() {
    let env = Env::default();
    let c = setup(&env);
    c.check_and_insert(&n(&env, 1));
    let res = c.try_check_and_insert(&n(&env, 1));
    assert_eq!(res, Err(Ok(Error::AlreadySpent)));
}

#[test]
fn batch_insert_all_distinct() {
    let env = Env::default();
    let c = setup(&env);
    let batch: Vec<BytesN<32>> = vec![&env, n(&env, 1), n(&env, 2), n(&env, 3)];
    assert_eq!(c.batch_insert(&batch), 3);
    assert!(c.is_spent(&n(&env, 1)) && c.is_spent(&n(&env, 2)) && c.is_spent(&n(&env, 3)));
}

#[test]
fn batch_with_already_spent_reverts_whole_batch() {
    let env = Env::default();
    let c = setup(&env);
    c.check_and_insert(&n(&env, 5)); // pre-spend #5
    // Batch contains a fresh #4, then the already-spent #5.
    let batch: Vec<BytesN<32>> = vec![&env, n(&env, 4), n(&env, 5)];
    let res = c.try_batch_insert(&batch);
    assert_eq!(res, Err(Ok(Error::AlreadySpent)));
    // All-or-nothing: #4 must NOT have been inserted.
    assert!(!c.is_spent(&n(&env, 4)), "batch must roll back #4");
}

#[test]
fn batch_with_intra_batch_duplicate_reverts() {
    let env = Env::default();
    let c = setup(&env);
    let batch: Vec<BytesN<32>> = vec![&env, n(&env, 7), n(&env, 7)];
    let res = c.try_batch_insert(&batch);
    assert_eq!(res, Err(Ok(Error::AlreadySpent)));
    assert!(!c.is_spent(&n(&env, 7)), "duplicate batch must roll back");
}
