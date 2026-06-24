# Benchmarks — instruction counts & the ceiling

The hard limit is Soroban's **~100M instructions per contract call**. Every claim here is
measured, not estimated.

## Methodology

Two measurement sources, and they are **not** interchangeable:

- **Testnet `simulateTransaction` (authoritative).** Build the contract call, simulate it
  against testnet RPC, and decode `SorobanTransactionData.resources.instructions` from the
  returned Soroban transaction data. This is the real on-chain WASM cost and the number that
  decides whether a call fits under the ceiling.
- **Native `cargo test` CPU counts (lower bound).** Convenient for relative comparisons (e.g.
  the flat-in-K table below), but they **underestimate** the WASM execution cost. Never quote a
  native figure as the on-chain cost.

Rule of thumb: report the testnet-simulation figure for "does it fit," use native counts only
for showing *shape* (e.g. flatness across K).

## The flat-in-K table

The aggregation circuit exposes a **constant 3 public signals** `[H, root, externalNullifier]`
regardless of how many memberships K it folds. So the on-chain verify is a single Groth16/BN254
verify whose cost does **not** grow with K — while the naive path runs one verify per proof, K×.

| K | Prism: 1 verify (CPU insns) | Naive: K verifies | Naive fits <100M? |
|---|---|---|---|
| 1 | 26,619,054 | 26,619,054 | ✅ |
| 2 | 26,619,054 | 53,238,108 | ✅ |
| 4 | 26,619,054 | 106,476,216 | ❌ **exceeds ceiling** |
| 8 | 26,619,054 | 212,952,432 | ✅ Prism / ❌ naive |

Source: the `verify_cost_is_flat_in_k` bench. **Spread across K is zero** — the Prism column is
identical for every K (native CPU count).

## Why naive verification breaks at K=4

A single verify is ~26.6M (native) / ~28.8M (testnet). Naive verification of K proofs is K× a
single verify:

```
K=4 naive = 4 × 26,619,054 = 106,476,216  >  100,000,000  (ceiling)
```

At K=4 the naive path already exceeds the budget and the call fails. Prism's aggregation stays
at one verify, so it succeeds at K=4, K=8, and beyond — the "previously impossible" line.

## Single-verify on testnet

| Figure | Value |
|---|---|
| Single Groth16/BN254 verify (testnet sim) | **28,822,880** instructions |
| Fee | ~38,819 stroops (~0.0039 XLM) |

## Aggregated settle on testnet (K=8)

| Figure | Value |
|---|---|
| K=8 `settle` (testnet sim) | **42,084,162** instructions |
| Composition | 1 verify + 8-deep H-fold + 8 nullifier writes |
| Result | `Settled count: 8`; on-chain tree root equals the circuit's root |

## Disclosure `put_note` on testnet

| Figure | Value |
|---|---|
| `put_note` (testnet sim) | **30,320,716** instructions |
| Composition | one disclosure-correctness verify + store |

## Scope

This is **aggregation-by-batching**: one Groth16 proof attests to K folded memberships.
**Recursive folding (Nova / ProtoStar) for scale is deferred to SCF** — see [ROADMAP.md](ROADMAP.md).
