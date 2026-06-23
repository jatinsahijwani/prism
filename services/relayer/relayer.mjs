// Prism — omnichain nullifier relayer (EVM -> Stellar mirror).
//
// REAL (this milestone): posting to the Stellar OmnichainMirror via stellar-cli, signed by
// the mirror's operator key. The relayer is TRUSTED in attestation mode.
// MOCK (this milestone, labeled): the EVM "source of truth" is a local JSON file standing in
// for a deployed Solidity nullifier contract's spent set. The real reader is a drop-in (see
// readEvmSpentNullifiers below).
//
// Usage:
//   MIRROR_ID=C... OPERATOR=prism-deployer node services/relayer/relayer.mjs
//   (omit MIRROR_ID for a dry run that just prints what it would post)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const MIRROR = process.env.MIRROR_ID || "";
const SOURCE = process.env.OPERATOR || "prism-deployer";
const NETWORK = process.env.NETWORK || "testnet";
const EVM_FILE = process.env.EVM_SPENT || "services/relayer/evm-spent.json";

const strip = (h) => h.replace(/^0x/, "").toLowerCase().padStart(64, "0");

// --- EVM source of truth ---
// MOCK: read from a JSON array of 32-byte hex nullifiers (an EVM contract's spent set).
// REAL drop-in:
//   import { ethers } from "ethers";
//   const c = new ethers.Contract(EVM_NULLIFIER_ADDR, ABI, new ethers.JsonRpcProvider(EVM_RPC));
//   const logs = await c.queryFilter(c.filters.NullifierSpent());
//   return logs.map((l) => l.args.nullifier.toString(16));
function readEvmSpentNullifiers() {
  return JSON.parse(readFileSync(EVM_FILE, "utf8")).map(strip);
}

function postBatch(nullifiers) {
  const tmp = "/tmp/relayer_batch.json";
  writeFileSync(tmp, JSON.stringify(nullifiers));
  return execFileSync(
    "stellar",
    [
      "contract", "invoke", "--send=yes", "--id", MIRROR, "--source", SOURCE,
      "--network", NETWORK, "--", "post_spent_batch", "--nullifiers-file-path", tmp,
    ],
    { encoding: "utf8" },
  );
}

function main() {
  const nulls = readEvmSpentNullifiers();
  console.log(`[relayer] EVM source (MOCK ${EVM_FILE}): ${nulls.length} spent nullifier(s)`);
  for (const n of nulls) console.log(`  - 0x${n}`);

  if (!MIRROR) {
    console.log("[relayer] DRY RUN (set MIRROR_ID to post to the Stellar mirror).");
    return;
  }
  console.log(`[relayer] posting to mirror ${MIRROR} on ${NETWORK} as ${SOURCE} ...`);
  const out = postBatch(nulls);
  const tx = (out.match(/tx\/[a-f0-9]{64}/) || [])[0];
  console.log(`[relayer] synced ${nulls.length} nullifier(s). ${tx ? "https://stellar.expert/explorer/testnet/" + tx : out.trim()}`);
}

main();
