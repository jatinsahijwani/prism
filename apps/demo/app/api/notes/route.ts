import { NextResponse } from "next/server";
import { getNote } from "@prism-stellar/sdk";
import { demo } from "@/lib/demoData";
import { C, toHex } from "@/lib/stellar";

export const dynamic = "force-dynamic";

// Live: what the chain actually stores per note — ephemeral pubkey R + ciphertext, NO amount.
export async function GET() {
  try {
    const notes = await Promise.all(
      demo.disclosure.notes.map(async (n) => {
        const note = (await getNote(C.disclosure, n.commitment)) as {
          rx: unknown;
          ry: unknown;
          ciphertext: unknown;
        };
        return {
          commitment: n.commitment,
          rx: toHex(note.rx),
          ry: toHex(note.ry),
          ciphertext: toHex(note.ciphertext),
        };
      }),
    );
    return NextResponse.json({ notes, contract: C.disclosure });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
