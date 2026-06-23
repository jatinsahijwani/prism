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
A single Groth16/BN254 verify ≈ 40M; naive N-verify blows past 100M fast; the Aggregator's
job is N→1 (one ~40M verify regardless of N).

| Scenario | Instructions | Fits in one tx? | XLM cost |
|---|---|---|---|
| Single Groth16/BN254 verify | _TBD (Step 4)_ | — | _TBD_ |
| Naive N-verify (N at which it fails) | _TBD_ | ❌ | — |
| Prism aggregated N→1 | _TBD_ | ✅ | _TBD_ |

## Real vs. mocked

| Component | Status |
|---|---|
| verifier-registry (Groth16/BN254) | _building_ |
| Everything else | _scaffold stubs_ |

_Updated as milestones land. Honesty over polish — mocks are labeled._

## Status

- [x] Repo scaffolded
- [ ] Day-1 spike: Groth16/BN254 verify on testnet, instruction count < 100M
- [ ] CommitmentTree + NullifierRegistry
- [ ] Aggregator K→1 working + benchmarked
- [ ] Omnichain mirror (attestation)
- [ ] Disclosure (view key + ASP stub)
- [ ] SDK + demo dapp
- [ ] README benchmark table + demo video
