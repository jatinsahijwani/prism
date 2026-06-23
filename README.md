# Prism

**The confidential-compliance layer for real-world assets on Stellar.**

Prism is a composable ZK SDK for Soroban — an anonymous-membership + nullifier core
(the "Semaphore Stellar doesn't have") plus three differentiators: a **proof-aggregation
coprocessor** (N→1), **omnichain nullifiers** (EVM↔Stellar), and **standard-native
selective disclosure** (SEP-57 / confidential-token).

> One ray of light enters, a full spectrum comes out — one ZK primitive in, a spectrum
> of problems solved out.

Canonical proof system: **Groth16 over BN254**, verified on-chain with Soroban's native
BN254 host functions (Protocol 25/26). Full design: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Repo layout

```
contracts/   # Rust / Soroban — the heart
  verifier-registry/   # Groth16/BN254 IVerifier + circuitId→VK   (active)
  commitment-tree/     # incremental Merkle tree (Poseidon2)       (stub)
  nullifier-registry/  # spent-nullifier set                       (stub)
  aggregator/          # N→1 proof-aggregation coprocessor          (stub)
  omnichain-mirror/    # EVM↔Stellar nullifier mirror               (stub)
  disclosure/          # view keys + ASP, SEP-57 binding            (stub)
circuits/    # Circom 2 — membership, nullifier, range, aggregation, disclosure
packages/sdk/  # TypeScript SDK — client-side WASM proving
services/    # off-chain aggregator + nullifier relayer
apps/demo/   # RWA confidential-settlement flagship demo
bench/       # instruction-count + XLM cost benchmarks (the "receipts")
```

## Benchmarks — receipts

The load-bearing constraint is Soroban's **~100M instruction ceiling per contract call**.
A single Groth16/BN254 verify measures **~28.8M instructions on testnet** (Protocol 26);
naive N-verify blows past 100M at **N = 4**; the Aggregator's job is N→1 (one ~28.8M
verify regardless of N).

**Aggregator — one verify settles K memberships, flat in K.** Because the aggregation
circuit exposes a *constant* 3 public signals `[H, root, externalNullifier]` regardless of
K, the on-chain verify cost is flat while naive per-proof verification is K× and breaks the
ceiling at **K=4**:

| K | Prism: 1 verify (CPU insns) | Naive: K verifies | Naive fits <100M? |
|---|---|---|---|
| 1 | 26,619,054 | 26,619,054 | ✅ |
| 2 | 26,619,054 | 53,238,108 | ✅ |
| 4 | 26,619,054 | 106,476,216 | ❌ **exceeds ceiling** |
| 8 | 26,619,054 | 212,952,432 | ✅ Prism / ❌ naive |

Single Groth16/BN254 verify also measured on testnet via RPC `simulateTransaction`
(decoded `SorobanTransactionData.resources.instructions`) at **28,822,880** instructions,
~38,819 stroops (~0.0039 XLM).

_Native `cargo test` CPU counts (above) underestimate WASM; testnet simulation is the
authoritative figure. The K-table is from the `verify_cost_is_flat_in_k` bench — spread
across K is **zero**. **Aggregation-by-batching; recursive folding (Nova/ProtoStar) is
deferred to SCF.**_

## Deployment (Stellar testnet, Protocol 26)

| Item | Value |
|---|---|
| Contract (verifier-registry) | `CBSUNYX74ZJYRAIEB5WQN4QBDMDXKO7NKVDGLYNZCHC2PZ5N4STX4DBF` |
| Deploy tx | `b79bfd9c2aba99dea98c7c0df888266fc57e03ae617517c1ce5b18598bb7f446` |
| On-chain verify tx (returns `true`) | `ae7324c24032f1653a19cad355bef423960277e69abbdf872acd2faea8ac6fac` |
| Deployer | `GBOHXV4AO7QHS4MMVERDLEVVMPSFE6S5E5SBWDFE3SVW3ZLTUBWMQNSA` |

Reproduce: `circuits/` → `pnpm install && bash scripts/build.sh && node scripts/export_fixtures_rs.mjs`;
`contracts/` → `cargo test -p prism-stellar-verifier-registry -- --nocapture`.

## Real vs. mocked

| Component | Status |
|---|---|
| verifier-registry (Groth16/BN254) | **REAL** — deployed + verifying on testnet |
| membership circuit + trusted setup | **REAL** — Circom 2, Hermez 2^14 ptau, snarkjs |
| commitment-tree / nullifier-registry / aggregator / omnichain-mirror / disclosure | scaffold stubs (`ping`) |
| SDK / demo | scaffold stubs |

_Updated as milestones land. Honesty over polish — mocks are labeled._

## Status

- [x] Repo scaffolded
- [x] Day-1 spike: Groth16/BN254 verify on testnet, instruction count < 100M (28.8M)
- [ ] CommitmentTree + NullifierRegistry
- [ ] Aggregator K→1 working + benchmarked
- [ ] Omnichain mirror (attestation)
- [ ] Disclosure (view key + ASP stub)
- [ ] SDK + demo dapp
- [ ] README benchmark table + demo video
