import { NextResponse } from "next/server";
import { isSpent } from "@prism-stellar/sdk";
import { demo } from "@/lib/demoData";
import { C } from "@/lib/stellar";

export const dynamic = "force-dynamic";

// Live: confirm one of the K=8 nullifiers is actually spent on-chain + the benchmark.
export async function GET() {
  try {
    const settledNullifierSpent = await isSpent(C.nullifierRegistryK8, demo.aggregation.settledNullifier);
    return NextResponse.json({
      settledNullifierSpent,
      rows: demo.aggregation.rows,
      flatVerify: demo.aggregation.flatVerify,
      settleK8Instructions: demo.aggregation.settleK8Instructions,
      ceiling: demo.aggregation.ceiling,
      settleTx: demo.txs.settleK8,
      aggregator: C.aggregatorK8,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
