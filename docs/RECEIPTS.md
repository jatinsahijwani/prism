# Receipts — deployments & testnet transactions

All on **Stellar testnet, Protocol 26**. Addresses and tx hashes are copied verbatim from the
deployment runs; explorer links use `https://stellar.expert/explorer/testnet/`.

Deployer (also the simulation source account for SDK reads):
[`GBOHXV4A…MQNSA`](https://stellar.expert/explorer/testnet/account/GBOHXV4AO7QHS4MMVERDLEVVMPSFE6S5E5SBWDFE3SVW3ZLTUBWMQNSA)
(`GBOHXV4AO7QHS4MMVERDLEVVMPSFE6S5E5SBWDFE3SVW3ZLTUBWMQNSA`).

---

## Core / Day-1 — single Groth16/BN254 verify

The day-1 spike: one proof verified on-chain, instruction count measured **< 100M (28.8M)**.

| Item | Value |
|---|---|
| Single-verify contract | [`CBSUNYX7…X4DBF`](https://stellar.expert/explorer/testnet/contract/CBSUNYX74ZJYRAIEB5WQN4QBDMDXKO7NKVDGLYNZCHC2PZ5N4STX4DBF) (`CBSUNYX74ZJYRAIEB5WQN4QBDMDXKO7NKVDGLYNZCHC2PZ5N4STX4DBF`) |
| Verify tx | [`ae7324c2…ac6fac`](https://stellar.expert/explorer/testnet/tx/ae7324c2ac6fac) |

Remains live.

---

## Aggregator milestone — K→1, one verify settles K memberships

One on-chain Groth16/BN254 verify settled **K=8** memberships in a single transaction
(`Settled count: 8`).

| Contract | Address |
|---|---|
| aggregator | [`CCTYJUKH…YACA76C`](https://stellar.expert/explorer/testnet/contract/CCTYJUKHHCYHI6MT4EQLCL7P5UQTSVZWT6NJAZ7TSLHIN6QYGYACA76C) (`CCTYJUKHHCYHI6MT4EQLCL7P5UQTSVZWT6NJAZ7TSLHIN6QYGYACA76C`) |
| verifier-registry | [`CDT4FU2J…S6Z7PQ2`](https://stellar.expert/explorer/testnet/contract/CDT4FU2JVI2JWBKMBHVQSEYTG7L7DXXU2NRHVKDQFC2XFHRFMS6Z7PQ2) (`CDT4FU2JVI2JWBKMBHVQSEYTG7L7DXXU2NRHVKDQFC2XFHRFMS6Z7PQ2`) |
| commitment-tree | [`CAUMBMTT…BLE7X6`](https://stellar.expert/explorer/testnet/contract/CAUMBMTTWILMQTYL2LY3QEWWAE6C7GBPHVU4BJT44M4U56XNLMBLE7X6) (`CAUMBMTTWILMQTYL2LY3QEWWAE6C7GBPHVU4BJT44M4U56XNLMBLE7X6`) |
| nullifier-registry | [`CDXWKWSS…MP64UL`](https://stellar.expert/explorer/testnet/contract/CDXWKWSSAVXNU3R67T5VYSJDKQBWA6JTCFHMQBDSA52KCJ7PRQMP64UL) (`CDXWKWSSAVXNU3R67T5VYSJDKQBWA6JTCFHMQBDSA52KCJ7PRQMP64UL`) |

| Receipt | Value |
|---|---|
| K=8 aggregated settle tx | [`bfeec9d0…be80cf`](https://stellar.expert/explorer/testnet/tx/bfeec9d01ab59f93b6f67a27d9db42dc0ca2655a0027d74f56464d7a0abe80cf) (`bfeec9d01ab59f93b6f67a27d9db42dc0ca2655a0027d74f56464d7a0abe80cf`) |
| Settle instructions (testnet sim) | **42,084,162** (1 verify + 8-deep H-fold + 8 nullifier writes) |
| Return value | `8` (memberships settled) · all 8 nullifiers now `is_spent` |
| On-chain tree root | `02eda5…467a0d` — **equals the circuit's root** (no mock) |

---

## Disclosure milestone — settle privately, prove specifics to an auditor

| Contract | Address |
|---|---|
| disclosure | [`CBBUNBBZ…NCAHU`](https://stellar.expert/explorer/testnet/contract/CBBUNBBZAQBQUNVCZTGD4KUJCRO5T6Z24P3H3IAUHHPL6CBNGRINCAHU) (`CBBUNBBZAQBQUNVCZTGD4KUJCRO5T6Z24P3H3IAUHHPL6CBNGRINCAHU`) |
| asp (association-set provider) | [`CAIK3JUG…UUS2C`](https://stellar.expert/explorer/testnet/contract/CAIK3JUGJ5QEGNHAKWC7CEJGXDB53DPYMQW5GLB4Q3UEO3UJPLTUUS2C) (`CAIK3JUGJ5QEGNHAKWC7CEJGXDB53DPYMQW5GLB4Q3UEO3UJPLTUUS2C`) |

| Receipt | Value |
|---|---|
| `put_note` tx 1 | [`24e038a5…562b`](https://stellar.expert/explorer/testnet/tx/24e038a5562b) |
| `put_note` tx 2 | [`597f1e60…bf1b`](https://stellar.expert/explorer/testnet/tx/597f1e60bf1b) |
| `put_note` tx 3 | [`dd3e6263…aa83`](https://stellar.expert/explorer/testnet/tx/dd3e6263aa83) |
| `put_note` instructions (testnet sim) | **30,320,716** (one disclosure-correctness verify + store) |
| What the chain shows | only `(R, ciphertext)` per note — **no amounts** |
| What the auditor sees | decrypts on-chain ciphertexts → `[4.2M, 1.75M, 3.05M]`, predicate `total == 9,000,000` **PASS** |

Each `put_note` is accepted **only with a disclosure-correctness proof** verified on-chain, so
the auditor's later decryption is trustworthy.

---

## Omnichain milestone — a nullifier spent on EVM is rejected on Stellar

Deployed as a fresh stack wired to the mirror.

| Contract | Address |
|---|---|
| omnichain-mirror | [`CBWF6BC2…LSSI`](https://stellar.expert/explorer/testnet/contract/CBWF6BC2JULCVNE3SLRAIVJWASCSQPIGQOF6BYRKTPUQSDEESAPWLSSI) (`CBWF6BC2JULCVNE3SLRAIVJWASCSQPIGQOF6BYRKTPUQSDEESAPWLSSI`) |
| aggregator (mirror-wired) | [`CARP3XNC…PO6C`](https://stellar.expert/explorer/testnet/contract/CARP3XNCYQPRPETRJUKE7D5NLDXDNYTL2CK7RAMTI32NXS2YOULTPO6C) (`CARP3XNCYQPRPETRJUKE7D5NLDXDNYTL2CK7RAMTI32NXS2YOULTPO6C`) |

| Step | Result |
|---|---|
| Relayer syncs EVM-spent nullifier → mirror | sync tx [`ba047b15…b17d70`](https://stellar.expert/explorer/testnet/tx/ba047b1570e8688c8beffcf698e8a7346c21d65b631d908846ca772cf6b17d70) (`ba047b1570e8688c8beffcf698e8a7346c21d65b631d908846ca772cf6b17d70`) |
| Settle identity **A** (spent on EVM) | **BLOCKED** — `Error(Contract, #9) ForeignSpent`; A *not* spent on Stellar |
| Settle identity **B** (fresh) | **SUCCESS** — `Settled count: 1`, tx [`2be45880…1ce6daa`](https://stellar.expert/explorer/testnet/tx/2be458808641f8c56ac98ea53d7aa8adc01736828e0d03c3e37cdf4fa1ce6daa) (`2be458808641f8c56ac98ea53d7aa8adc01736828e0d03c3e37cdf4fa1ce6daa`) |

**Trust (this milestone):** the relayer is TRUSTED (attestation mode); the EVM source is a
labeled mock. See [SECURITY.md](SECURITY.md).
