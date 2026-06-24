# Prism — flagship demo

A polished, guided walk-through of Prism: **the confidential-compliance layer for real-world
assets on Stellar**. It tells the flagship story — settle a regulated asset privately on-chain,
yet prove the specifics to an auditor, scale to many settlements per transaction, and stay
Sybil-resistant across chains — as a five-step wizard anyone can click through.

Everything runs against the **already-deployed Prism contracts on Stellar testnet**. The app
does not redeploy anything; it reads and simulates live.

## The wizard

1. **Setup** — the issuer's registered auditor viewing key and the ASP-approved compliant root, read live.
2. **Confidential settlement** — a private payment: the chain stores only `(R, ciphertext)` with **no amount**; the auditor view stays locked.
3. **Aggregation** — K=8 settlements verified by **one** on-chain proof; a benchmark shows the verify staying flat (~26.6M instructions) while naive K× verification crosses Soroban's ~100M ceiling at K=4.
4. **Omnichain** — an identity already spent on EVM is **blocked** on Stellar (live settle simulation → `ForeignSpent`); a fresh identity settles.
5. **Selective disclosure** — the auditor decrypts the on-chain ciphertexts with the viewing key (Baby Jubjub ECDH + Poseidon) and verifies predicates (`total == X`, `all ≤ cap`); the step-2 auditor view unlocks.

A summary recaps the three differentiators with contract IDs and transaction links.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Stellar Wallets Kit** (`@creit.tech/stellar-wallets-kit`) for wallet connection
- **`@stellar/stellar-sdk`** for live Soroban reads/simulations
- The **Prism SDK** (`@prism-stellar/sdk`) for the read layer and in-browser-equivalent disclosure crypto

Contract reads, settle simulations, and the auditor decryption run server-side in Next.js API
routes (`app/api/*`), so heavy crypto never ships to the browser; the wallet connection is the
only client-side Stellar piece.

## Run

```bash
# from the repo root
pnpm install
pnpm --filter @prism-stellar/demo dev      # http://localhost:3000
# production build
pnpm --filter @prism-stellar/demo build && pnpm --filter @prism-stellar/demo start
```

No environment variables are required — the deployed testnet contract IDs and canonical
transaction hashes are bundled in `data/demo-data.json`.

## What's real vs. mocked

| Part | Status |
|---|---|
| Contract reads (auditor key, approved root, foreign-spent, is-spent, get-note) | **REAL** — live testnet simulation each request |
| Blocked omnichain settle (`ForeignSpent`) | **REAL** — live settle simulation returns `Error(Contract, #9)` |
| Auditor decryption of on-chain ciphertexts + predicates | **REAL** — computed live from chain data |
| State-changing transactions (settles, note storage, EVM sync) | **REAL but pre-mined** — shown via their actual tx hashes + explorer links (one-shot, not re-run) |
| Relayer's EVM source of truth | **MOCK** — a stand-in for a deployed EVM nullifier contract (badged in the UI); the relayer is trusted in attestation mode |

The auditor **viewing key is a throwaway demo key** bundled for the decryption step.

## Deployed contracts (testnet)

| Contract | ID |
|---|---|
| disclosure | `CBBUNBBZAQBQUNVCZTGD4KUJCRO5T6Z24P3H3IAUHHPL6CBNGRINCAHU` |
| aggregator (K=8) | `CCTYJUKHHCYHI6MT4EQLCL7P5UQTSVZWT6NJAZ7TSLHIN6QYGYACA76C` |
| omnichain-mirror | `CBWF6BC2JULCVNE3SLRAIVJWASCSQPIGQOF6BYRKTPUQSDEESAPWLSSI` |
| aggregator (omnichain) | `CARP3XNCYQPRPETRJUKE7D5NLDXDNYTL2CK7RAMTI32NXS2YOULTPO6C` |
| verifier-registry | `CDT4FU2JVI2JWBKMBHVQSEYTG7L7DXXU2NRHVKDQFC2XFHRFMS6Z7PQ2` |

Full architecture and the contract/circuit source live in the repo root (`contracts/`,
`circuits/`, `packages/sdk/`) and `docs/ARCHITECTURE.md`.
