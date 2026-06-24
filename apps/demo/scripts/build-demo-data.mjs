// Prism demo — assemble apps/demo/data/demo-data.json from the committed/built fixtures and
// the deployed testnet contract IDs + canonical tx hashes. Run once; output is committed
// (circuit build artifacts are gitignored, so the app ships a snapshot of what it reads).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const C = "../../../circuits"; // from apps/demo/scripts/ up to repo root
const r = (p) => JSON.parse(readFileSync(new URL(`${C}/${p}`, import.meta.url)));

// Circuit build artifacts are gitignored. On a fresh clone they won't exist — keep the
// committed data/demo-data.json snapshot instead of failing the dev/build.
const need = ["build/cli_disc/notes.json", "build/cli_omni/A/proof.json", "fixtures/agg_k8/meta.json"];
const missing = need.some((p) => !existsSync(new URL(`${C}/${p}`, import.meta.url)));
if (missing) {
  console.error("[demo-data] source fixtures not present — keeping committed data/demo-data.json");
  process.exit(0);
}

const disc = r("build/cli_disc/notes.json");
const aProof = r("build/cli_omni/A/proof.json");
const aScalars = r("build/cli_omni/A/scalars.json");
const bScalars = r("build/cli_omni/B/scalars.json");
const k8 = r("fixtures/agg_k8/meta.json");
const to32 = (d) => BigInt(d).toString(16).padStart(64, "0");

const data = {
  network: "testnet",
  rpcUrl: "https://soroban-testnet.stellar.org",
  explorer: "https://stellar.expert/explorer/testnet",
  readSourceAccount: "GBOHXV4AO7QHS4MMVERDLEVVMPSFE6S5E5SBWDFE3SVW3ZLTUBWMQNSA",

  contracts: {
    // disclosure milestone
    disclosure: "CBBUNBBZAQBQUNVCZTGD4KUJCRO5T6Z24P3H3IAUHHPL6CBNGRINCAHU",
    verifierRegistry: "CDT4FU2JVI2JWBKMBHVQSEYTG7L7DXXU2NRHVKDQFC2XFHRFMS6Z7PQ2",
    // aggregation K=8 milestone
    aggregatorK8: "CCTYJUKHHCYHI6MT4EQLCL7P5UQTSVZWT6NJAZ7TSLHIN6QYGYACA76C",
    nullifierRegistryK8: "CDXWKWSSAVXNU3R67T5VYSJDKQBWA6JTCFHMQBDSA52KCJ7PRQMP64UL",
    treeK8: "CAUMBMTTWILMQTYL2LY3QEWWAE6C7GBPHVU4BJT44M4U56XNLMBLE7X6",
    // omnichain milestone
    omnichainMirror: "CBWF6BC2JULCVNE3SLRAIVJWASCSQPIGQOF6BYRKTPUQSDEESAPWLSSI",
    aggregatorOmni: "CARP3XNCYQPRPETRJUKE7D5NLDXDNYTL2CK7RAMTI32NXS2YOULTPO6C",
    aspOmni: "CB323Y72DWJNAVBXWUDO7OMUK2ZW2PO2IUUGBDYUCEUN27VPHWIPSVUI",
  },

  txs: {
    settleK8: "bfeec9d01ab59f93b6f67a27d9db42dc0ca2655a0027d74f56464d7a0abe80cf",
    settleFreshB: "2be458808641f8c56ac98ea53d7aa8adc01736828e0d03c3e37cdf4fa1ce6daa",
    evmSync: "ba047b1570e8688c8beffcf698e8a7346c21d65b631d908846ca772cf6b17d70",
    putNotes: [
      "24e038a5d95b66aa38c2f2fa7a2115723e12c56a5a2a32c8364aaf83c7c3562b",
      "597f1e608564d32510087ba1c1f998332d6b9c434c379a7a30432f86f68bbf1b",
      "dd3e62636df37e3ee890031c0ebc5898e1540392e2d2c0d1a7ffe69fc173aa83",
    ],
  },

  // Selective disclosure (3 notes, total 9,000,000). DEMO viewing key (throwaway testnet key).
  disclosure: {
    auditorViewingKeyDemo: disc.auditorPriv,
    expectedTotal: disc.expectedTotal,
    capOk: "5000000",
    capFail: "4000000",
    notes: disc.notes.map((n) => ({ commitment: n.commitment, rx: n.rx, ry: n.ry, ciphertext: n.ciphertext })),
  },

  // Aggregation benchmark (measured: verify_cost_is_flat_in_k + testnet sim).
  aggregation: {
    flatVerify: 26619054,
    settleK8Instructions: 42084162,
    ceiling: 100000000,
    rows: [1, 2, 4, 8].map((k) => ({ k, prism: 26619054, naive: 26619054 * k })),
    settledNullifier: to32(k8.nullifiers[0]),
    root: to32(k8.root),
  },

  // Omnichain: identity A (spent on EVM -> blocked) and B (fresh -> settles).
  omnichain: {
    aspApprovedRoot: aScalars.root,
    identityA: {
      nullifier: aScalars.nullifier,
      settleArgs: {
        proof: aProof,
        root: aScalars.root,
        externalNullifier: aScalars.externalNullifier,
        h: aScalars.h,
        aggregateOutput: aScalars.aggregateOutput,
        nullifiers: [aScalars.nullifier],
      },
    },
    identityB: { nullifier: bScalars.nullifier },
  },
};

mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/demo-data.json", import.meta.url), JSON.stringify(data, null, 2));
console.error("wrote apps/demo/data/demo-data.json");
