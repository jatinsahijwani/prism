# SEP-57 / confidential-token mapping

Prism is the **ZK confidential + disclosure module a regulated-asset issuer plugs in** — not a
generic view key. It's built as a *consumer* of the SEP-57 (T-REX-style regulated tokens) and
ERC-7984-style confidential-token interfaces, not a competitor to them. This doc expands the
mapping summarized in the [root README](../README.md).

## The gap it fills

Regulated/tokenized assets today are **transparent + permissioned**: an issuer can be compliant
**or** private, not both. There's no drop-in way to get private balances, auditor disclosure,
and association-set gating together. Prism closes that with the anonymous-membership + nullifier
core plus aggregation, omnichain nullifiers, and selective disclosure.

## The mapping

### 1. Issuer onboarding

- Register the auditor/regulator's **viewing key** via `disclosure.register_auditor`.
- Admit participants through the **ASP** (association-set provider): `asp.set_allowed`, then
  `asp.approve_root` to bless a commitment-set root.

### 2. Confidential settlement

- The **Aggregator** settles K transfers under a single Groth16 proof; `settle()` enforces
  `asp.is_approved_root` as the **compliance gate**.
- Amounts never hit the chain. The on-chain footprint is the proof, the root, the external
  nullifier, and the spent nullifiers — never the values.
- Cross-chain: settlement also checks the **omnichain mirror**, so an identity already spent on
  EVM is rejected (`Error(Contract, #9) ForeignSpent`).

### 3. Selective disclosure

- Each note's amount is encrypted to the auditor key with **Baby Jubjub ECDH + Poseidon**
  (see [SDK.md](SDK.md) for the exact construction).
- `disclosure.put_note` accepts a note **only with a disclosure-correctness proof** binding the
  ciphertext to the committed amount — so the auditor's later decryption is trustworthy, not
  taken on faith.
- The regulator runs `prism.disclose(viewKey, predicate)` for `total == X` or `all ≤ cap`:
  **predicate disclosure, not full de-shielding.**

## Scope this milestone (honest)

- The **amount** is bound in-circuit — the soundness-critical field.
- **Counterparty / memo** are encrypted SDK-side but **not yet bound in-circuit**.
- Auditor **decryption + predicate checks run off-chain** (the standard view-key model).
- **Folding/aggregation of disclosure proofs** and **full SEP-57 wire-format binding** are SCF
  items — see [ROADMAP.md](ROADMAP.md).
