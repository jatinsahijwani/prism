use crate::{Asp, AspClient};
use soroban_sdk::{BytesN, Env};

fn b(env: &Env, x: u8) -> BytesN<32> {
    BytesN::from_array(env, &[x; 32])
}

fn setup(env: &Env) -> AspClient<'_> {
    let id = env.register(Asp, ());
    AspClient::new(env, &id)
}

#[test]
fn allow_deny_logic() {
    let env = Env::default();
    let c = setup(&env);
    assert!(!c.is_allowed(&b(&env, 1)));
    c.set_allowed(&b(&env, 1), &true);
    assert!(c.is_allowed(&b(&env, 1)));
    // deny overrides allow
    c.set_denied(&b(&env, 1), &true);
    assert!(!c.is_allowed(&b(&env, 1)));
    c.set_denied(&b(&env, 1), &false);
    assert!(c.is_allowed(&b(&env, 1)));
    // removing from allow set
    c.set_allowed(&b(&env, 1), &false);
    assert!(!c.is_allowed(&b(&env, 1)));
}

#[test]
fn approved_roots() {
    let env = Env::default();
    let c = setup(&env);
    let root = b(&env, 9);
    assert!(!c.is_approved_root(&root));
    c.approve_root(&root);
    assert!(c.is_approved_root(&root));
    c.revoke_root(&root);
    assert!(!c.is_approved_root(&root));
}
