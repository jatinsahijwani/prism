# Prism services

## Omnichain nullifier relayer (`relayer/relayer.mjs`)

Syncs the EVM spent-nullifier set into the Stellar `OmnichainMirror`, so a nullifier already
spent on EVM is rejected by the Aggregator's `settle()` on Stellar.

**Real vs. mock (this milestone — attestation mode):**

| Part | Status |
|---|---|
| Posting to the Stellar mirror (`post_spent_batch`, operator-signed) | **REAL** — via `stellar-cli` |
| EVM source of truth (`evm-spent.json`) | **MOCK** — a JSON array standing in for a deployed Solidity nullifier contract's spent set |

The relayer is **trusted** in attestation mode. The mock EVM reader is a drop-in for an
`ethers` query against a deployed nullifier contract (see `readEvmSpentNullifiers` in
`relayer.mjs`). **SCF version:** replace the trusted relayer with on-chain verification of a
succinct proof of EVM state against the mirror's `foreign_root` (feasible via BN254/EVM
precompile parity).

```bash
# dry run (prints what it would post)
node services/relayer/relayer.mjs
# live sync to a deployed mirror
MIRROR_ID=C... OPERATOR=prism-deployer node services/relayer/relayer.mjs
```
