// Prism — auditor-side disclosure demo (runs fully client-side).
//
// Story: a regulated-asset issuer settles 3 payments privately. On-chain you see only
// (R, ciphertext) per note — no amounts. The compliance officer holds the viewing key and
// proves to a regulator: "total settled == $X" and "every transfer <= cap".
import { derivePubkey, encryptNote, disclose } from "./disclosure.ts";

const hex = (x: bigint) => "0x" + x.toString(16).slice(0, 16) + "…";

async function main() {
  // 1. Auditor / regulator viewing key (held by the compliance officer).
  const viewKey = 2934562934857n;
  const auditorPub = await derivePubkey(viewKey);
  console.log("Auditor viewing-key pubkey A =", auditorPub.map((x) => hex(x)));

  // 2. Settler encrypts 3 notes (distinct amounts) under the auditor key.
  const payments = [
    { secret: 111n, amount: 4_200_000n },
    { secret: 222n, amount: 1_750_000n },
    { secret: 333n, amount: 3_050_000n },
  ];
  const notes = [];
  let e = 10_000_000_001n;
  for (const pmt of payments) {
    const { note } = await encryptNote(auditorPub, pmt.secret, pmt.amount, e++);
    notes.push(note);
  }

  console.log("\n--- What the CHAIN stores (no amounts, just R + ciphertext) ---");
  for (const [i, n] of notes.entries()) {
    console.log(
      `note ${i}: commitment=${hex(n.commitment)}  R=[${hex(n.R[0])},${hex(n.R[1])}]  c=${hex(n.ciphertext)}`,
    );
  }

  const realTotal = payments.reduce((a, b) => a + b.amount, 0n);

  // 3. Auditor verifies "total settled == realTotal".
  const tot = await disclose(viewKey, notes, { kind: "total", value: realTotal });
  console.log("\n--- What the AUDITOR sees (decrypts with viewing key) ---");
  console.log("decrypted amounts:", tot.amounts.map((a) => a.toString()));
  console.log(`predicate [total == ${realTotal}] => ${tot.ok ? "PASS ✅" : "FAIL ❌"}`);

  // 4. Predicate "every transfer <= cap".
  const cap = 5_000_000n;
  const within = await disclose(viewKey, notes, { kind: "cap", max: cap });
  console.log(`predicate [all <= ${cap}] => ${within.ok ? "PASS ✅" : "FAIL ❌"}`);

  // 5. Negative: a tighter cap must FAIL (one transfer is 4.2M).
  const tightCap = 4_000_000n;
  const fail = await disclose(viewKey, notes, { kind: "cap", max: tightCap });
  console.log(`predicate [all <= ${tightCap}] => ${fail.ok ? "PASS (unexpected!)" : "FAIL ✅ (correctly caught)"}`);

  // 6. A wrong total must FAIL.
  const wrong = await disclose(viewKey, notes, { kind: "total", value: realTotal + 1n });
  console.log(`predicate [total == ${realTotal + 1n}] => ${wrong.ok ? "PASS (unexpected!)" : "FAIL ✅ (correctly caught)"}`);

  const allGood = tot.ok && within.ok && !fail.ok && !wrong.ok;
  console.log(`\n${allGood ? "✅ DISCLOSURE DEMO PASSED" : "❌ DEMO FAILED"}`);
  if (!allGood) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
