# Prism — Documentation

The [root README](../README.md) leads with proof (benchmark + testnet receipts). These docs
go deeper. Everything here is derived from the deployed contracts, recorded tx hashes, and the
actual source — no invented numbers.

| Doc | What's in it |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full system design: core primitives, the three differentiators, SDK + circuits, positioning. |
| [RECEIPTS.md](RECEIPTS.md) | Every deployed contract + every testnet tx in one place, grouped by milestone, with explorer links. |
| [BENCHMARKS.md](BENCHMARKS.md) | Instruction-count methodology, the K-table, and why naive verify breaks at K=4. |
| [SDK.md](SDK.md) | How the TypeScript SDK works today — `client.ts` read/simulate layer and `disclosure.ts` ECDH + predicates — and what's roadmap. |
| [SEP57-MAPPING.md](SEP57-MAPPING.md) | How Prism maps onto the SEP-57 / confidential-token interface for regulated-asset issuers. |
| [SECURITY.md](SECURITY.md) | Trusted setup, trusted relayer this milestone, permissionless-mutation TODO, what's bound in-circuit vs not. |
| [ROADMAP.md](ROADMAP.md) | Path to mainnet as SCF-style tranches. |
