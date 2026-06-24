// Server-side helpers: live Soroban reads via the Prism SDK, returned as plain JSON.
// (Imported only from API routes — keeps stellar-sdk/circomlibjs off the browser bundle.)
import { demo } from "./demoData";

export const toHex = (b: unknown): string => {
  if (b == null) return "";
  if (Buffer.isBuffer(b)) return b.toString("hex");
  if (b instanceof Uint8Array) return Buffer.from(b).toString("hex");
  if (typeof b === "string") return b;
  return String(b);
};

export const C = demo.contracts;
