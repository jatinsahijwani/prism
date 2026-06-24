// Prism SDK — Soroban read layer (testnet). Builds a contract call, simulates it (no
// signing, no submission), and decodes the result. Used by the demo's server-side API
// routes to make genuinely live reads against the deployed contracts.
import {
  rpc,
  Contract,
  TransactionBuilder,
  Account,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
  Networks,
  xdr,
} from "@stellar/stellar-sdk";

export const TESTNET_RPC = "https://soroban-testnet.stellar.org";
// A funded testnet account used purely as the simulation source (reads only).
const DEFAULT_SOURCE = "GBOHXV4AO7QHS4MMVERDLEVVMPSFE6S5E5SBWDFE3SVW3ZLTUBWMQNSA";

const hexToBuf = (h: string) => Buffer.from(h.replace(/^0x/, ""), "hex");

/** A 32/64/128-byte value (BytesN) as an ScVal. */
export const bytesScVal = (hex: string): xdr.ScVal => nativeToScVal(hexToBuf(hex), { type: "bytes" });

/** Vec<BytesN<32>> as an ScVal. */
export const bytesVecScVal = (hexes: string[]): xdr.ScVal =>
  xdr.ScVal.scvVec(hexes.map((h) => bytesScVal(h)));

/** Groth16 Proof struct { a, b, c } as an ScVal map (keys sorted a<b<c). */
export const proofScVal = (p: { a: string; b: string; c: string }): xdr.ScVal =>
  xdr.ScVal.scvMap([
    new xdr.ScMapEntry({ key: nativeToScVal("a", { type: "symbol" }), val: bytesScVal(p.a) }),
    new xdr.ScMapEntry({ key: nativeToScVal("b", { type: "symbol" }), val: bytesScVal(p.b) }),
    new xdr.ScMapEntry({ key: nativeToScVal("c", { type: "symbol" }), val: bytesScVal(p.c) }),
  ]);

export interface ReadOpts {
  source?: string;
  rpcUrl?: string;
}

async function simulate(contractId: string, method: string, args: xdr.ScVal[], opts: ReadOpts = {}) {
  const server = new rpc.Server(opts.rpcUrl ?? TESTNET_RPC);
  const contract = new Contract(contractId);
  const account = new Account(opts.source ?? DEFAULT_SOURCE, "0");
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();
  return server.simulateTransaction(tx);
}

/** Live read: simulate a contract call and return the decoded native result. */
export async function prismRead(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
  opts: ReadOpts = {},
): Promise<unknown> {
  const sim = await simulate(contractId, method, args, opts);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }
  const retval = sim.result?.retval;
  return retval ? scValToNative(retval) : undefined;
}

export interface SimResult {
  ok: boolean;
  errorCode?: number; // contract Error code, e.g. 9 = ForeignSpent
  error?: string;
  result?: unknown;
}

/**
 * Live simulation that tolerates a contract error (used to demonstrate the omnichain block:
 * settle of an EVM-spent identity returns Error(Contract, #9) ForeignSpent without any state
 * change).
 */
export async function prismSimulate(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
  opts: ReadOpts = {},
): Promise<SimResult> {
  const sim = await simulate(contractId, method, args, opts);
  if (rpc.Api.isSimulationError(sim)) {
    const m = sim.error.match(/Error\(Contract,\s*#(\d+)\)/);
    return { ok: false, error: sim.error, errorCode: m ? Number(m[1]) : undefined };
  }
  return { ok: true, result: sim.result?.retval ? scValToNative(sim.result.retval) : undefined };
}

// ---- Typed helpers for the demo ----
export const getAuditor = (disclosureId: string, opts?: ReadOpts) =>
  prismRead(disclosureId, "auditor", [], opts);

export const getNote = (disclosureId: string, commitmentHex: string, opts?: ReadOpts) =>
  prismRead(disclosureId, "get_note", [bytesScVal(commitmentHex)], opts);

export const isApprovedRoot = (aspId: string, rootHex: string, opts?: ReadOpts) =>
  prismRead(aspId, "is_approved_root", [bytesScVal(rootHex)], opts) as Promise<boolean>;

export const isForeignSpent = (mirrorId: string, nullifierHex: string, opts?: ReadOpts) =>
  prismRead(mirrorId, "is_foreign_spent", [bytesScVal(nullifierHex)], opts) as Promise<boolean>;

export const isSpent = (nullifierRegistryId: string, nullifierHex: string, opts?: ReadOpts) =>
  prismRead(nullifierRegistryId, "is_spent", [bytesScVal(nullifierHex)], opts) as Promise<boolean>;

export interface SettleArgs {
  proof: { a: string; b: string; c: string };
  root: string;
  externalNullifier: string;
  h: string;
  aggregateOutput: string;
  nullifiers: string[];
}

export const simulateSettle = (aggregatorId: string, a: SettleArgs, opts?: ReadOpts) =>
  prismSimulate(
    aggregatorId,
    "settle",
    [
      proofScVal(a.proof),
      bytesScVal(a.root),
      bytesScVal(a.externalNullifier),
      bytesScVal(a.h),
      bytesScVal(a.aggregateOutput),
      bytesVecScVal(a.nullifiers),
    ],
    opts,
  );
