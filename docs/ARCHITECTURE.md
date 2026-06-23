# Prism — The Confidential-Compliance Layer for Real-World Assets on Stellar

> **Prism.** One ray of light enters, a full spectrum comes out — one ZK primitive in, a spectrum of problems solved out. **Spine:** *Prism is the ZK layer that makes compliant, confidential real-world-asset settlement actually work — and scale — on Stellar.* Underneath the positioning, it's a composable anonymous-membership + nullifier SDK (the Semaphore Stellar doesn't have), supercharged with proof aggregation, omnichain nullifiers, and standard-native selective disclosure.
>
> **Brand direction:** black background, white prism, a single white ray entering from the left refracting into a VIBGYOR spectrum on the right — "one input → many solutions." Works monochrome (white prism) or full-color hero.

---

## 0. Read this first — the positioning decision

An earlier version of this doc pitched Prism as a horizontal "ZK privacy SDK." From a Stellar judge's / SDF reviewer's seat, horizontal infra triggers one reflex question: **"Who actually uses this, and what does Stellar get?"** So the spine has been re-anchored.

Prism is now positioned on the **exact intersection of SDF's three loudest 2026 priorities** — real-world assets, institutional adoption, and compliant privacy — instead of next to them. The technology designed below is unchanged; what changed is the story it leads with, the demo it shows, and the standard it binds to. The general-purpose SDK is still there (and still onboards developers), but the *headline use case* is confidential, auditable settlement of regulated/real-world assets.

---

## 1. Why this wins from Stellar's point of view

SDF's 2026 "north stars" are about money and adoption, not clever cryptography:

- **Real-world assets & liquidity** — a stated ~$1B asset-growth target, with *compliance providers* and on/off-ramps explicitly called out.
- **Institutional & enterprise adoption** — a target to sign 15 transformational enterprises and put 5 into production in 2026 (Forbes Global 2000, NGOs, governments) for payments, treasury, and settlement.
- **Compliant privacy infrastructure** — named directly: "confidential transfers and privacy-preserving workflows," with the long-term goal of private settlement for institutions that are legally required to keep positions/counterparties confidential.
- **Developer growth** — onboarding teams and helping them reach product-market fit.

The standard that ties RWA + privacy together is already moving: **SEP-57 "T-REX"** (regulated tokens, based on ERC-3643 — KYC/AML, accreditation, freeze/recover) plus a parallel **ERC-7984-style confidential-token standard** SDF is building with OpenZeppelin/Nethermind. "Multiple partners and tokenization platforms are building support." Prism slots in as the **ZK module these issuers need but shouldn't have to build themselves.**

That is the answer to "what does Stellar get": Prism makes the regulated-asset wave that SDF is betting $1B on *private and auditable at scale*.

---

## 2. The problems Prism solves (validated)

**The real-world-money problem (lead with this):** SEP-57 / regulated tokens today are *fully transparent + permissioned*. An institution can be compliant **or** private, not both. There is no drop-in way to get private balances, auditor disclosure, and association-set gating. That gap is precisely what blocks institutional confidential settlement — SDF's stated end goal.

**Technical (Stellar ZK developer pain):**

- **The ~100M instruction CPU ceiling is the hardest wall.** A Groth16/BLS12-381 verify already costs ~40M instructions; UltraHonk/Noir and circuit-heavy verification blow past 100M (a single G1 MSM of length ~70 ≈ 55M; MSM dominates). Complex, recursive, or *batched* proofs cannot be verified on-chain today — which means confidential settlement can't scale.
- **No batching.** Every proof is its own on-chain verify, each eating the per-transaction budget. Ten private settlements = ten verifications.
- **Proof-system fragmentation.** BN254 is native and mirrors Ethereum's EIP-196/197 precompiles, but each system has a different cost profile and integration story. No unified abstraction.
- **Client-side proving is hard on Stellar's mobile/payments userbase** (phone memory limits; no standard browser proving runtime) — yet secrets must stay client-side.

**Ecosystem:**

- **Airdrop/allocation Sybil is an ecosystem tax** — comparable launches filter ~40% of claimants as Sybils. One-human-one-claim is a nullifier primitive.
- **Cross-chain proof portability is wide open** — BN254/EVM parity means EVM-origin proofs verify on Stellar unchanged, and almost nobody is exploiting it.

---

## 3. What already exists, and why Prism is differentiated (not redundant)

| Existing work | What it provides | Where Prism is different / complementary |
|---|---|---|
| `stellar/soroban-examples` Groth16 verifier | Reference single-system verifier | Prism = reusable SDK + primitives + aggregation, not a sample |
| UltraHonk verifiers (yugocabrio, indextree) | Noir proof verification | Single-system, expensive; Prism unifies + aggregates |
| Nethermind `stellar-private-payments` PoC | Pool + verifier + Merkle + nullifier | **Bundled in one app, Circom-only, explicitly unaudited**; Prism makes it a composable, hardened layer |
| OpenZeppelin `stellar-contracts` | Audited Merkle *proof* + crypto utils | **No ZK verifier, no incremental tree, no nullifier registry** |
| Interstellar (Ratherlabs) | Noir→Soroban proving backend | Proving *pipeline*; Prism = on-chain primitives + SDK |
| SEP-57 T-REX / ERC-7984 work (Nethermind, OZ) | The regulated/confidential-token **standards** | **Prism is a consumer of these standards, not a competitor** — the scalable ZK module issuers plug in |
| Human ID / Holonym | Proof-of-personhood app | Could build *on* Prism's primitives |

**Differentiation strategy (important):** by aligning to the standard, Prism sits near the official Nethermind/OpenZeppelin work. Lean on the three things they **don't** have — aggregation at scale, omnichain Sybil resistance, a turnkey SDK — and frame Prism as **complementary** ("we make the standard scalable and usable"), never competitive. The overlap becomes credibility, not redundancy.

---

## 4. System architecture

Three layers: **Core primitives** (the Semaphore core) → **Differentiators** (the three locked features) → **SDK + circuits**.

```
┌─────────────────────────────────────────────────────────────────┐
│  TypeScript SDK  (client-side proving in WASM, tx builders)      │
│  prism.join() · prism.prove() · prism.aggregate() · prism.disclose()│
└───────────────┬─────────────────────────────────┬───────────────┘
                │                                  │
        ┌───────▼────────┐                 ┌───────▼────────┐
        │  ZK Circuits   │                 │ Off-chain svcs │
        │ (Circom/Noir)  │                 │ Aggregator,    │
        │ membership,    │                 │ Nullifier      │
        │ nullifier,     │                 │ Relayer        │
        │ range, agg,    │                 └───────┬────────┘
        │ disclosure     │                         │
        └───────┬────────┘                         │
                │                                   │
┌───────────────▼───────────────────────────────────▼─────────────┐
│                     SOROBAN CONTRACTS (Rust)                     │
│                                                                   │
│  LAYER 1 — DIFFERENTIATORS                                        │
│   ┌────────────────┐ ┌────────────────┐ ┌────────────────────┐   │
│   │  Aggregator    │ │ OmnichainNull. │ │ Disclosure          │  │
│   │  (coprocessor) │ │  Mirror        │ │ (SEP-57 / ERC-7984) │  │
│   │  N proofs → 1  │ │  EVM ↔ Stellar │ │ view keys + ASP     │  │
│   └───────┬────────┘ └───────┬────────┘ └─────────┬──────────┘   │
│           │                  │                    │              │
│  LAYER 0 — CORE PRIMITIVES   │                    │              │
│   ┌───────▼────────┐ ┌───────▼────────┐ ┌─────────▼──────────┐   │
│   │ CommitmentTree │ │ NullifierReg.  │ │  VerifierRegistry  │   │
│   │ (incremental   │ │ (spent set +   │ │  circuitId → VK,   │   │
│   │  Merkle/Posei.)│ │  events)       │ │  Groth16/BN254     │   │
│   └────────────────┘ └────────────────┘ └────────────────────┘   │
│                                                                   │
│  Host functions: BN254 (EIP-196/197 parity), Poseidon2, BLS12-381│
└───────────────────────────────────────────────────────────────────┘
```

### Layer 0 — Core primitives (Soroban contracts, Rust)

- **`CommitmentTree`** — append-only incremental Merkle tree; leaves are commitments `C = Poseidon2(secret, value, …)`; rolling root history so recently-valid roots still verify; Poseidon2 via host function. (OpenZeppelin stops at static Merkle *proof verification*; this adds on-chain incremental insertion.)
- **`NullifierRegistry`** — spent-nullifier set with atomic `check_and_insert(nullifier)` + events. `N = Poseidon2(secret, externalNullifier)` proves "this secret acted once for this context" without revealing who. Standalone and shared.
- **`VerifierRegistry`** — `IVerifier` trait + `circuitId → verifying key` map. Canonical path: **Groth16 over BN254** (native host functions, ~40M instructions, EVM-precompile parity — the thing that makes omnichain possible). BLS12-381 optional.

### Layer 1 — Differentiators (re-languaged in Stellar's terms)

**A. `Aggregator` — proof-aggregation coprocessor.** Off-chain, fold **N inner proofs** into **one** Groth16 proof whose public inputs commit to the tree root, the set of N nullifiers, and aggregate outputs. On-chain: **a single ~40M-instruction verify regardless of N**, then batch-insert nullifiers and apply state. *Stellar-facing value:* **makes confidential settlement economically viable at institutional scale — N private settlements per transaction, cents not dollars.** (Start with recursive-Groth16; move to a folding scheme — Nova/ProtoStar-style — for scale.)

**B. `OmnichainNullifierMirror` — cross-chain Sybil resistance + a developer on-ramp.** Nullifiers are chain-agnostic (`N = Poseidon2(secret, externalNullifier)`), so the same human yields the same nullifier on EVM and Stellar; a claimant proves non-membership in *both* sets. *Two values:* (1) double-claim/double-vote impossible across chains; (2) **it's a bridge that brings Ethereum's ZK developers and their existing BN254 circuits onto Stellar unchanged** — a direct lever on SDF's developer-growth goal.
- *Hackathon mode:* relayer posts the foreign nullifier-set root (reuse the existing EVM contracts); trust = relayer, clearly labeled.
- *SCF mode:* verify a succinct proof of the EVM-side state on Stellar directly — feasible because BN254 mirrors Ethereum's precompiles.

**C. `Disclosure` — standard-native selective disclosure (the fundability wedge).** Each note carries an encrypted payload (amount, counterparty, metadata) under a **viewing key**; the holder transacts privately, an authorized auditor/regulator verifies scoped predicates ("total = X", "address was paid", "all transfers ≤ cap") **without** public de-shielding. An **ASP allow/deny** contract gates participants. **Built to plug into the SEP-57 / ERC-7984 confidential-token interface** so any regulated-asset issuer gets confidential-but-auditable settlement as a drop-in — rather than a generic, unanchored "view key."

### SDK (TypeScript) — client-side proving in WASM
`prism.join()`, `prism.prove()`, `prism.aggregate()`, `prism.disclose()`; helpers for tree sync, nullifier derivation, view-key encryption, Soroban tx building, Stellar Wallets Kit + passkey/smart-account support.

### Circuits — Circom 2 (Groth16 maturity) primary, Noir optional
`membership`, `nullifier`, `range/balance`, `aggregation` (recursive verifier), `disclosure-correctness`. Canonical target: Groth16/BN254.

---

## 5. Flagship demo — a real-world-money story (shows all three features)

**"Confidential, auditable settlement of a regulated/tokenized asset."** A tokenized-treasury (or payroll/RWA) issuer distributes or settles a SEP-57-style asset:

1. Holders `join` the asset's compliant set (commitment inserted; ASP gates eligibility).
2. Each settles privately, generating a proof locally; the nullifier is checked against **both** Stellar and EVM sets (omnichain: no double-claim from an existing EVM identity).
3. 100 settlements are **aggregated into one on-chain Groth16 verify** — impossible per-proof under the instruction ceiling (coprocessor → scale).
4. Amounts/counterparties are private on-chain, but the issuer's compliance officer uses a **view key** to prove "total settled = $X, all within limits" to an auditor (selective disclosure → SEP-57).

The 2–3 min video: invisible on-chain → provable to an auditor; one verify for a hundred settlements; double-claim blocked across chains. Every locked feature, one real-world narrative SDF cares about.

---

## 6. Receipts — the benchmark section that de-risks the team

A judge funding infrastructure wants proof it works and proof it unlocks something new. Ship a small benchmark table in the README and video:

- **Instruction counts:** single verify (~40M) vs. naive N-verify (blows past 100M at small N) vs. **Prism aggregated N→1 (stays ~40M)**.
- **Proofs per transaction:** max N Prism fits in one tx vs. 1 for the naive path.
- **Cost in XLM** per settlement at N = 1 vs. N = 50/100.
- **A "previously impossible" line:** the exact N at which naive verification exceeds the ceiling and fails — and Prism still succeeds.

Hard numbers make the "load-bearing ZK" requirement undeniable and signal shipping ability.

---

## 7. Six-day hackathon scope (solo, realistic)

**Must ship (the wow):**
- `CommitmentTree` + `NullifierRegistry` + Groth16/BN254 `Verifier` on **testnet**.
- `Aggregator` proving K→1 (K = 4–8 PoC is enough). **Headline.**
- Minimal `OmnichainNullifierMirror` (attestation mode; reuse existing EVM contracts; label mocks).
- Minimal `Disclosure` (encrypted note + view-key reveal + "verify total"), framed against the SEP-57 interface.
- TS SDK with client-side proving + the RWA flagship demo dapp.
- README with **architecture + the benchmark table + what's real vs mocked** + 2–3 min video.

**Deferred to SCF (say so — honesty scores):** trust-minimized omnichain (proof-based), folding aggregation at scale, full ASP/SEP-57 integration, audit, mainnet, Noir/UltraHonk path, mobile proving runtime.

**Cut line:** keep aggregation (non-negotiable) + omnichain attestation; reduce disclosure to a stubbed view-key reveal.

---

## 8. Roadmap → Stellar Community Fund (Build Award, up to $150k XLM, milestone-based)

Position Prism as a **protocol + reference integration**, not "a library." Tranches map to SCF's MVP → testnet → mainnet structure; final tranche = mainnet.

- **Tranche 1 — Core protocol on testnet.** Hardened primitives + SDK + one reference integration (confidential allowlist/settlement). Live on testnet, docs, sample app.
- **Tranche 2 — Differentiators + standard binding.** Aggregation (folding for scale), SEP-57/ERC-7984 disclosure + ASP, trust-minimized omnichain. Two ecosystem integrations (an RWA/issuer pilot + an airdrop/allocation tool).
- **Tranche 3 — Mainnet + audit.** Security audit, gas optimization, mainnet deploy, full SDK/docs, confidential-token interoperability, 2–3 live integrations.

**Why it scores:** load-bearing ZK (not superficial), complete architecture, differentiated yet standard-aligned, obvious ecosystem value (every regulated-asset issuer + every future privacy app is a potential consumer), open-source contracts, and a team with prior shipped/funded work in this exact domain. Budget = real engineering hours per tranche (no marketing/overhead — ineligible). Also a natural **Public Goods Award** fit.

---

## 9. Adoption path — answering "who uses this"

- **Regulated-asset / RWA issuers** building on SEP-57 / confidential-token standards — the primary consumer; Prism is their drop-in ZK compliance+privacy module.
- **Existing funded ecosystem teams** as integration targets (e.g. RWA-compliance tooling like Constella; anchors; payment apps) — name a concrete first integration even if aspirational.
- **EVM ZK developers** arriving via omnichain/BN254 parity — a developer-growth channel for Stellar.
- **Privacy apps** (voting, airdrops, identity like Human ID) building on the shared primitives.

State at least one concrete first integration in the submission — infra is judged on who will use it.

---

## 10. Security & design considerations

- **Trusted setup:** Groth16 needs per-circuit setup — Powers-of-Tau base + per-circuit ceremony, documented. (Your prior prototype shipped only a 2^12 ptau — far too small; use a much larger ceremony for real circuits.)
- **Nullifier front-running/replay:** bind to action context (externalNullifier); atomic check-and-insert; for omnichain handle EVM finality/reorgs.
- **Relayer trust (hackathon):** label the attestation relayer as trusted; SCF version replaces it with on-chain proof verification.
- **View-key management:** auditor key custody; predicate-scoped disclosure (reveal a predicate, not the whole note); rotation.
- **Root staleness:** bounded root history so honest users aren't griefed.
- **Audit posture:** mirror OpenZeppelin's patterns (error-code conventions, TTL handling, pausable/upgradeable) so it reads as production infra.

---

## 11. Tech stack & repo structure (fresh monorepo)

**Stack:** Rust + Soroban SDK (no_std), BN254 + Poseidon2 host functions; Circom 2 (+ Noir optional), snarkjs, Arkworks for the recursive circuit; TypeScript SDK (client-side WASM proving); Scaffold Stellar, Stellar CLI, Stellar Wallets Kit; OpenZeppelin Stellar utils where useful.

```
prism/
├── contracts/                 # Rust / Soroban (the heart — absent from the old prototype)
│   ├── commitment-tree/
│   ├── nullifier-registry/
│   ├── verifier-registry/     # Groth16/BN254 IVerifier
│   ├── aggregator/            # N→1 coprocessor
│   ├── omnichain-mirror/
│   └── disclosure/            # SEP-57 / ERC-7984 binding
├── circuits/                  # Circom (+ Noir); membership, nullifier, range, aggregation, disclosure
├── packages/sdk/              # TypeScript SDK; client-side WASM proving
├── services/                  # off-chain aggregator + nullifier relayer
├── apps/demo/                 # RWA confidential-settlement flagship demo
├── bench/                     # the receipts: instruction-count + cost benchmarks
└── README.md
```

---

## 12. Migrating from the previous `prism-sdk` prototype

The earlier zip is a Node CLI whose only working command (`compile`) runs Circom → Groth16 → **Solidity** `verifier.sol` (EVM-targeted; `web3`/`solc` deps; 2^12 ptau; vendored 10MB circom binary). **Recommendation: start fresh; do not build on it.** Salvage only: (1) the **`prism-sdk` npm name + author identity**; (2) the **Circom→Groth16 compile flow** in `lib/compile.js`, retargeted so the final export produces a **Soroban/BN254 verifier** instead of `solidityverifier`. Keep the old repo as reference, not foundation. Point Claude Code at the new monorepo with this doc as the spec.

---

## 13. Brand & identity

**Name: Prism** — a single ray refracts into a spectrum; one ZK primitive solves a spectrum of problems. Reads instantly to technical and non-technical audiences; the optics theme sits naturally with Stellar's astronomy branding. **Logo:** black bg, white prism, white ray from left → VIBGYOR spectrum right; monochrome and full-color variants. **Before committing:** "Prism" is a common word (PrismJS, etc.) — the brand can stay "Prism" but the crate/package likely needs a qualifier (`prism-zk`, `prism-stellar`); check GitHub/npm and avoid colliding with an existing ZK proof system.

---

### One-paragraph pitch (for the BUIDL / SCF)

*Prism is the confidential-compliance layer for real-world assets on Stellar. Regulated and tokenized assets today are transparent-but-permissioned — issuers can be compliant or private, never both. Prism closes that gap with a composable ZK primitive (the anonymous-membership + nullifier core Stellar lacks) and three things no one else on Stellar offers: a proof-aggregation coprocessor that makes confidential settlement viable at institutional scale by folding many proofs into a single on-chain verification; omnichain nullifiers that make a holder Sybil-resistant across EVM and Stellar while bringing Ethereum's ZK developers onto Stellar unchanged; and standard-native selective disclosure (SEP-57 / confidential-token) that keeps settlement private on-chain yet provable to an auditor. It sits on the exact intersection of SDF's 2026 priorities — real-world assets, institutional adoption, and compliant privacy — and is built by a team already shipped and grant-funded for this pattern on EVM.*