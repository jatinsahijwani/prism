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

The **Aggregator milestone** — one on-chain Groth16/BN254 verify settled **K=8** memberships
in a single transaction (`Settled count: 8`):

| Contract | Address |
|---|---|
| aggregator | `CCTYJUKHHCYHI6MT4EQLCL7P5UQTSVZWT6NJAZ7TSLHIN6QYGYACA76C` |
| verifier-registry | `CDT4FU2JVI2JWBKMBHVQSEYTG7L7DXXU2NRHVKDQFC2XFHRFMS6Z7PQ2` |
| commitment-tree | `CAUMBMTTWILMQTYL2LY3QEWWAE6C7GBPHVU4BJT44M4U56XNLMBLE7X6` |
| nullifier-registry | `CDXWKWSSAVXNU3R67T5VYSJDKQBWA6JTCFHMQBDSA52KCJ7PRQMP64UL` |

| Receipt | Value |
|---|---|
| K=8 aggregated settle tx | `bfeec9d01ab59f93b6f67a27d9db42dc0ca2655a0027d74f56464d7a0abe80cf` |
| Settle instructions (testnet sim) | **42,084,162** (1 verify + 8-deep H-fold + 8 nullifier writes) |
| Return value | `8` (memberships settled) · all 8 nullifiers now `is_spent` |
| On-chain tree root | `02eda5…467a0d` — **equals the circuit's root** (no mock) |
| Deployer | `GBOHXV4AO7QHS4MMVERDLEVVMPSFE6S5E5SBWDFE3SVW3ZLTUBWMQNSA` |

Day-1 single-verify contract `CBSUNYX74ZJYRAIEB5WQN4QBDMDXKO7NKVDGLYNZCHC2PZ5N4STX4DBF`
(verify tx `ae7324c2…ac6fac`) remains live.

Reproduce: `circuits/` → `pnpm install && bash scripts/aggregate_build.sh && node scripts/export_agg_fixtures_rs.mjs`;
`contracts/` → `cargo test -- --nocapture` (incl. `verify_cost_is_flat_in_k`).

## Real vs. mocked

| Component | Status |
|---|---|
| verifier-registry (Groth16/BN254) | **REAL** — deployed + verifying on testnet |
| commitment-tree (incremental Merkle, Poseidon) | **REAL** — deployed; on-chain root == circuit root |
| nullifier-registry (atomic + all-or-nothing batch) | **REAL** — deployed on testnet |
| aggregator (K→1) | **REAL** — K=8 settled on testnet in one verify |
| poseidon (circomlib-compatible, BN254) | **REAL** — matches circomlib test vector |
| membership + aggregation circuits + trusted setup | **REAL** — Circom 2, Hermez ptau (2^14 / 2^17), snarkjs |
| omnichain-mirror / disclosure | scaffold stubs (`ping`) |
| SDK / demo | scaffold stubs |

_Updated as milestones land. Honesty over polish — mocks are labeled. Inserts on the tree /
nullifier registry are permissionless this milestone (operator-gating is a hardening TODO)._

## Status

- [x] Repo scaffolded
- [x] Day-1 spike: Groth16/BN254 verify on testnet, instruction count < 100M (28.8M)
- [x] CommitmentTree + NullifierRegistry (deployed; tree root matches circuit)
- [x] Aggregator K→1 working + benchmarked (flat ~26.6M verify; K=8 settled on testnet)
- [ ] Omnichain mirror (attestation)
- [ ] Disclosure (view key + ASP stub)
- [ ] SDK + demo dapp
- [ ] Demo video
