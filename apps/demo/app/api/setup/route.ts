import { NextResponse } from "next/server";
import { getAuditor, isApprovedRoot } from "@prism-stellar/sdk";
import { demo } from "@/lib/demoData";
import { C, toHex } from "@/lib/stellar";

export const dynamic = "force-dynamic"; // always a fresh, live read

export async function GET() {
  try {
    const [auditor, rootApproved] = await Promise.all([
      getAuditor(C.disclosure) as Promise<{ ax: unknown; ay: unknown } | undefined>,
      isApprovedRoot(C.aspOmni, demo.omnichain.aspApprovedRoot),
    ]);
    return NextResponse.json({
      auditorRegistered: !!auditor,
      auditorAx: auditor ? toHex(auditor.ax) : null,
      auditorAy: auditor ? toHex(auditor.ay) : null,
      rootApproved,
      disclosureContract: C.disclosure,
      aspContract: C.aspOmni,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
