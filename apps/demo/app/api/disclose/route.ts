import { NextResponse } from "next/server";
import { getNote, decryptNote, type Point } from "@prism-stellar/sdk";
import { demo } from "@/lib/demoData";
import { C, toHex } from "@/lib/stellar";

export const dynamic = "force-dynamic";

// Live: auditor fetches the on-chain ciphertexts and decrypts them with the demo viewing
// key (Baby Jubjub ECDH + Poseidon), then evaluates the predicates.
export async function GET() {
  try {
    const key = BigInt(demo.disclosure.auditorViewingKeyDemo);
    const amounts: string[] = [];
    for (const n of demo.disclosure.notes) {
      const note = (await getNote(C.disclosure, n.commitment)) as {
        rx: unknown;
        ry: unknown;
        ciphertext: unknown;
      };
      const R: Point = [BigInt("0x" + toHex(note.rx)), BigInt("0x" + toHex(note.ry))];
      const ct = BigInt("0x" + toHex(note.ciphertext));
      const amount = await decryptNote(key, R, ct);
      amounts.push(amount.toString());
    }
    const total = amounts.reduce((a, b) => a + BigInt(b), 0n);
    const capOk = BigInt(demo.disclosure.capOk);
    const capFail = BigInt(demo.disclosure.capFail);
    return NextResponse.json({
      amounts,
      total: total.toString(),
      expectedTotal: demo.disclosure.expectedTotal,
      totalPass: total === BigInt(demo.disclosure.expectedTotal),
      capOk: demo.disclosure.capOk,
      capFail: demo.disclosure.capFail,
      allUnderCapOk: amounts.every((a) => BigInt(a) <= capOk),
      allUnderCapFail: amounts.every((a) => BigInt(a) <= capFail),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
