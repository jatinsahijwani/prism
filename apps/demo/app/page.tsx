import Link from "next/link";
import { PrismMark } from "@/components/PrismMark";

const FEATURES = [
  { c: "#34d399", t: "Proof aggregation", d: "K settlements, one on-chain verify" },
  { c: "#fb923c", t: "Omnichain nullifiers", d: "Sybil-resistant across EVM ↔ Stellar" },
  { c: "#8b5cf6", t: "Selective disclosure", d: "private on-chain, provable to an auditor" },
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      {/* ambient spectrum glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-10rem] h-[28rem] w-[44rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "conic-gradient(from 180deg, #8b5cf6, #38bdf8, #34d399, #fbbf24, #fb923c, #f87171, #8b5cf6)" }}
      />
      <div className="relative mx-auto max-w-content px-5 pb-24 pt-20 text-center">
        <div className="flex justify-center">
          <PrismMark size={120} animated />
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-hair bg-white/[0.03] px-3 py-1 text-[11px] text-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-spectrum-green animate-pulse" /> live on Stellar testnet
        </div>

        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          The confidential-compliance layer for <span className="spectrum-text">real-world assets</span> on Stellar
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-mute">
          One ZK primitive in, a spectrum of problems solved out. Settle regulated assets privately on-chain — yet
          prove the specifics to an auditor, scale to many settlements per transaction, and stay Sybil-resistant across
          chains.
        </p>

        <div className="mt-9 flex items-center justify-center gap-3">
          <Link href="/demo" className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90">
            Launch demo →
          </Link>
          <a
            href="https://stellar.expert/explorer/testnet"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            View on testnet
          </a>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl gap-3 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="rounded-2xl border border-hair bg-panel p-5 text-left">
              <div className="h-1 w-10 rounded-full" style={{ background: f.c }} />
              <h3 className="mt-3 text-sm font-semibold">{f.t}</h3>
              <p className="mt-1 text-xs text-mute">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
