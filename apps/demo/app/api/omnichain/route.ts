import { NextResponse } from "next/server";
import { isForeignSpent, simulateSettle } from "@prism-stellar/sdk";
import { demo } from "@/lib/demoData";
import { C } from "@/lib/stellar";

export const dynamic = "force-dynamic";

// Live: A's nullifier is foreign-spent (EVM) and a real settle simulation is BLOCKED (#9);
// B is fresh. Settle(B) succeeded earlier (real tx).
export async function GET() {
  try {
    const [aForeignSpent, bForeignSpent, sim] = await Promise.all([
      isForeignSpent(C.omnichainMirror, demo.omnichain.identityA.nullifier),
      isForeignSpent(C.omnichainMirror, demo.omnichain.identityB.nullifier),
      simulateSettle(C.aggregatorOmni, demo.omnichain.identityA.settleArgs),
    ]);
    return NextResponse.json({
      aForeignSpent,
      bForeignSpent,
      aBlocked: !sim.ok,
      aErrorCode: sim.errorCode, // 9 = ForeignSpent
      aNullifier: demo.omnichain.identityA.nullifier,
      bNullifier: demo.omnichain.identityB.nullifier,
      mirror: C.omnichainMirror,
      aggregator: C.aggregatorOmni,
      syncTx: demo.txs.evmSync,
      freshSettleTx: demo.txs.settleFreshB,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
