# SDK — how it works today

The TypeScript SDK lives in `packages/sdk/src`. Its public surface
(`packages/sdk/src/index.ts`) mirrors ARCHITECTURE §4 (`prism.join()` · `prism.prove()` ·
`prism.aggregate()` · `prism.disclose()`), but **what's wired today** is the read/simulate
layer and selective disclosure. This doc is honest about that line.

## `client.ts` — Soroban read / simulate layer

Builds a contract call, **simulates** it against testnet RPC, and decodes the result. It does
**no signing and no submission** — every read uses a funded testnet account
(`GBOHXV4A…MQNSA`) purely as a simulation source. The demo's server-side API routes call this
to make genuinely live reads against the deployed contracts.

Core:

- **`prismRead(contractId, method, args, opts)`** — simulate a call, throw on simulation error,
  return the decoded native result (`scValToNative`).
- **`prismSimulate(...)`** — same, but *tolerates* a contract error and returns
  `{ ok, errorCode, error, result }`. It parses `Error(Contract, #<n>)` out of the simulation
  error, which is how the demo shows the omnichain block: a `settle` of an EVM-spent identity
  returns **`Error(Contract, #9)` ForeignSpent** with no state change.
- **`simulateSettle(aggregatorId, args, opts)`** — typed wrapper over `prismSimulate` for the
  aggregator's `settle(proof, root, externalNullifier, h, aggregateOutput, nullifiers)`.

Typed read helpers: `getAuditor`, `getNote`, `isApprovedRoot`, `isForeignSpent`, `isSpent`.

ScVal encoders (Soroban argument encoding):

- **`bytesScVal(hex)`** — a `BytesN` value from hex.
- **`bytesVecScVal(hexes)`** — a `Vec<BytesN<32>>`.
- **`proofScVal({a,b,c})`** — a Groth16 `Proof` struct as an ScVal map (keys sorted `a<b<c`).

Constant: `TESTNET_RPC = https://soroban-testnet.stellar.org`.

## `disclosure.ts` — selective disclosure (Baby Jubjub ECDH + Poseidon)

Pure client-side crypto, matching `circuits/src/disclosure.circom` exactly:

```
R = e·B8 ;  s = (e·A).x ;  k = Poseidon(s) ;  c = amount + k (mod p) ;  C = Poseidon(secret, amount)
```

The auditor (holder of viewing key `a`) recomputes `s = (a·R).x` and recovers
`amount = c − Poseidon(s)`.

API:

- **`derivePubkey(priv)`** — auditor/settler pubkey `A = priv·B8` on Baby Jubjub.
- **`encryptNote(auditorPub, secret, amount, ephemeralPriv)`** — returns the on-chain
  `EncryptedNote` `{ commitment, R, ciphertext }` **and** the witness input for the
  disclosure-correctness proof. `ephemeralPriv` must be fresh per note.
- **`decryptNote(auditorPriv, R, ciphertext)`** — re-derives the shared secret and recovers the
  amount.
- **`disclose(viewKey, notes, predicate)`** — `prism.disclose`: the auditor decrypts the
  relevant notes and checks a scoped predicate over the cleartext amounts. Predicates:
  `{ kind: "total", value }` (sum equals value) or `{ kind: "cap", max }` (every amount ≤ max).

`auditor-demo.ts` runs the whole thing fully client-side: encrypt 3 notes, show that the chain
sees only `(R, ciphertext)`, then prove `total == 9,000,000` PASS and `all ≤ cap`, with negative
cases that correctly FAIL. Run: `cd packages/sdk && node src/auditor-demo.ts`.

## What's real vs. roadmap

| Today (real) | Roadmap |
|---|---|
| Read/simulate layer (`prismRead`, `prismSimulate`, `simulateSettle`) | Full client-side WASM **proof generation** in the SDK |
| Selective disclosure crypto + predicates (`encryptNote`/`decryptNote`/`disclose`) | In-SDK transaction **signing + submission** |
| ScVal encoders for proofs, bytes, vecs | The full `prism.join()/prove()/aggregate()` surface from ARCHITECTURE |

Honest notes:

- **Proof generation** today runs out-of-band via `circuits/` + **snarkjs** (build scripts +
  fixture export), not yet inside the SDK as browser WASM proving.
- **Contract writes** (deploys, settles, `put_note`, relayer sync) go via **`stellar-cli`**, not
  through the SDK. The SDK is read/simulate + disclosure crypto.

See [ROADMAP.md](ROADMAP.md) for the proving + signing tranche.
