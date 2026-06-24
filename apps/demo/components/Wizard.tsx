"use client";
import { useState } from "react";
import { Step1, Step2, Step3, Step4, Step5, Summary } from "./steps";
import { ACCENTS } from "./ui";

const STEPS = [
  { title: "Setup", tag: "Issuer & auditor", accent: ACCENTS.indigo, what: "The issuer registered the regulator's viewing key and the ASP approved a compliant set." },
  { title: "Confidential settlement", tag: "Private payment", accent: ACCENTS.blue, what: "The amount was encrypted to the auditor key — the chain stores only R + ciphertext, never the amount." },
  { title: "Aggregation", tag: "N → 1 verify", accent: ACCENTS.green, what: "Eight settlements were proven by ONE on-chain verify, staying flat under the ~100M ceiling that naive verification breaks at K=4." },
  { title: "Omnichain", tag: "Cross-chain Sybil", accent: ACCENTS.orange, what: "An identity already spent on EVM was rejected on Stellar; a fresh identity settled normally." },
  { title: "Selective disclosure", tag: "Auditor predicate", accent: ACCENTS.violet, what: "The auditor decrypted the on-chain ciphertexts with the viewing key and proved the total — without public de-shielding." },
];

export function Wizard() {
  const [step, setStep] = useState(0);
  const [disclosed, setDisclosed] = useState<any | null>(null);
  const isSummary = step >= STEPS.length;
  const meta = STEPS[Math.min(step, STEPS.length - 1)];

  return (
    <div className="animate-fade-up">
      {/* progress */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            onClick={() => setStep(i)}
            className="group flex-1"
            title={s.title}
          >
            <div
              className="h-1 rounded-full transition-all"
              style={{ background: i <= step ? s.accent : "#1c1d26" }}
            />
            <div className="mt-1.5 hidden text-left text-[10px] uppercase tracking-wider sm:block" style={{ color: i === step ? s.accent : "#8a8d9b" }}>
              {i + 1}. {s.title}
            </div>
          </button>
        ))}
      </div>

      {isSummary ? (
        <>
          <Header n="✓" title="That's Prism" tag="Summary" accent="#ffffff" />
          <div className="mt-6"><Summary disclosed={disclosed} /></div>
          <div className="mt-8 flex justify-between">
            <button onClick={() => setStep(STEPS.length - 1)} className="btn-ghost">← Back</button>
            <button onClick={() => setStep(0)} className="btn-ghost">Restart ↺</button>
          </div>
        </>
      ) : (
        <>
          <Header n={String(step + 1)} title={meta.title} tag={meta.tag} accent={meta.accent} />
          <div className="mt-6">
            {step === 0 && <Step1 />}
            {step === 1 && <Step2 disclosed={disclosed} />}
            {step === 2 && <Step3 />}
            {step === 3 && <Step4 />}
            {step === 4 && <Step5 onDisclosed={setDisclosed} />}
          </div>

          {/* what just happened */}
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-hair bg-white/[0.02] p-3.5">
            <span className="mt-0.5 text-xs" style={{ color: meta.accent }}>▸</span>
            <p className="text-sm text-white/70"><b className="text-white/90">What just happened:</b> {meta.what}</p>
          </div>

          {/* nav */}
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost disabled:opacity-30">
              ← Back
            </button>
            <button
              onClick={() => setStep((s) => s + 1)}
              className="rounded-full px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              style={{ background: meta.accent }}
            >
              {step === STEPS.length - 1 ? "See summary →" : "Next →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Header({ n, title, tag, accent }: { n: string; title: string; tag: string; accent: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-black" style={{ background: accent }}>
        {n}
      </span>
      <div>
        <div className="text-[11px] uppercase tracking-wider" style={{ color: accent }}>{tag}</div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
    </div>
  );
}
