# Roadmap — to mainnet

What shipped this hackathon milestone is on testnet and benchmarked (see [RECEIPTS.md](RECEIPTS.md)
and [BENCHMARKS.md](BENCHMARKS.md)). Below is the path to mainnet, framed as SCF-style tranches.
Each item is something deliberately deferred this milestone, not vaporware — the corresponding
"this milestone" position is noted.

## Shipped (testnet)

- CommitmentTree + NullifierRegistry + Groth16/BN254 verifier, deployed and verifying.
- Aggregator K→1 (K=8 settled in one verify), benchmarked flat-in-K.
- Omnichain mirror in attestation mode (EVM-spent identity blocked, fresh settles).
- Disclosure: encrypted note + on-chain correctness proof + auditor predicate disclosure.
- TS SDK read/simulate layer + selective-disclosure crypto; Next.js demo over live testnet.

## Tranches to mainnet

1. **Harden the primitives + operator gating.** Tree / nullifier / ASP mutations are
   permissionless today; add authorized-caller gating, pausable/upgradeable, full error-code
   conventions. (See [SECURITY.md](SECURITY.md).)
2. **SDK client-side proving + signing.** Move proof generation into the SDK as browser WASM
   (today it runs via `circuits/` + snarkjs), and add in-SDK transaction signing + submission
   (today writes go via `stellar-cli`). Realize the full `prism.join()/prove()/aggregate()`
   surface. (See [SDK.md](SDK.md).)
3. **Trust-minimized omnichain.** Replace the trusted relayer with on-chain verification of a
   succinct proof of EVM state against the mirror's `foreign_root` (feasible via BN254/EVM
   parity).
4. **Full in-circuit note + SEP-57 wire format.** Bind counterparty/memo in-circuit (only the
   amount is bound today) and bind to the full SEP-57 / confidential-token wire format.
   (See [SEP57-MAPPING.md](SEP57-MAPPING.md).)
5. **Audit.** Security audit + gas/instruction optimization. Hackathon code is unaudited.
6. **Mainnet + issuer integration.** Mainnet deploy with a real regulated-asset issuer
   integration as the reference consumer.

## Also deferred to SCF

- **Recursive folding (Nova / ProtoStar)** for aggregation at scale — today is
  aggregation-by-batching. (See [BENCHMARKS.md](BENCHMARKS.md).)
- Folding/aggregation of **disclosure** proofs.
- Noir / UltraHonk path; mobile proving runtime.
