// Prism SDK — client-side proving + Soroban tx builders + selective disclosure.
// Surface mirrors ARCHITECTURE.md §4: prism.join() · prism.prove() · prism.aggregate() · prism.disclose()
export const PRISM_VERSION = "0.1.0";

export {
  derivePubkey,
  encryptNote,
  decryptNote,
  disclose,
  type Point,
  type Predicate,
  type EncryptedNote,
  type DisclosureResult,
} from "./disclosure.ts";

export {
  prismRead,
  prismSimulate,
  simulateSettle,
  getAuditor,
  getNote,
  isApprovedRoot,
  isForeignSpent,
  isSpent,
  bytesScVal,
  bytesVecScVal,
  proofScVal,
  TESTNET_RPC,
  type SettleArgs,
  type SimResult,
  type ReadOpts,
} from "./client.ts";
