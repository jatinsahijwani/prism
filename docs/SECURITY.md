# Security & trust model

Honest accounting of what's trusted, what's proven, and what's still a hardening TODO this
milestone. Mocks are labeled everywhere; see also "Real vs. mocked" in the [root README](../README.md).

## Trusted setup

- **Groth16 needs per-circuit trusted setup.** Prism uses a Powers-of-Tau base (real Hermez
  ptau — *not* a toy 2^12 ceremony) plus a per-circuit phase-2 ceremony for each circuit
  (membership, aggregation, disclosure-correctness). Each circuit ships its own verifying key in
  the `verifier-registry` (`circuitId → VK`).
- **Why BN254 (not PLONK/BLS-first):** Soroban exposes **native BN254 host functions**, and
  BN254 mirrors Ethereum's EIP-196/197 precompiles. That dual property is exactly what makes a
  single ~28.8M on-chain verify fit under the ceiling **and** what makes the omnichain bridge
  possible (EVM-origin BN254 proofs/circuits carry over unchanged). BLS12-381 is optional/secondary.

## Trusted relayer (this milestone)

- The omnichain mirror runs in **attestation mode**: a **TRUSTED relayer** posts the foreign
  (EVM) nullifier-set state to the mirror. The **EVM source is a labeled mock**.
- Stellar posting itself is real (via `stellar-cli`); the trust assumption is the relayer's
  honesty about EVM state.
- **SCF:** replace the relayer with on-chain verification of a succinct proof of EVM state
  against the mirror's `foreign_root` (feasible because of BN254/EVM parity). See
  [ROADMAP.md](ROADMAP.md).

## Permissionless mutations (hardening TODO)

- This milestone, **tree / nullifier / ASP mutations are permissionless**. Operator-gating
  (authorized callers, pausable/upgradeable, error-code conventions mirroring OpenZeppelin
  Stellar patterns) is a hardening TODO before mainnet.

## What's bound in-circuit vs. not

- **Bound in-circuit:** the **amount** (the soundness-critical field) — the disclosure-correctness
  proof ties the on-chain ciphertext to the committed amount.
- **Not yet bound in-circuit:** **counterparty / memo** are encrypted SDK-side but not proven.
- Auditor **decryption + predicate checks are off-chain** (standard view-key model).

## Nullifier & root hygiene

- Nullifiers bind to **action context** (`externalNullifier`): `N = Poseidon2(secret, externalNullifier)`
  proves "this secret acted once for this context" without revealing who.
- **Atomic check-and-insert** prevents replay/double-spend within a transaction; batch insertion
  is all-or-nothing.
- **Root staleness:** a bounded rolling root history lets recently-valid roots still verify so
  honest users aren't griefed by a concurrent insert.

## Audit posture

No audit this milestone (explicitly deferred to SCF). The contracts mirror OpenZeppelin Stellar
conventions (error codes, TTL handling, pausable/upgradeable intent) so they read as production
infra, but **treat everything here as unaudited hackathon code.**
