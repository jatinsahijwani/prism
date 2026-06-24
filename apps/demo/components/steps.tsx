"use client";
import { useState } from "react";
import {
  ACCENTS,
  Card,
  ContractLink,
  ErrorNote,
  LiveDot,
  MockBadge,
  Mono,
  Skeleton,
  TxLink,
  demo,
  useLive,
} from "./ui";

const fmtUSD = (n: string | number) =>
  "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtInsn = (n: number) => (n / 1_000_000).toFixed(1) + "M";

function Check({ ok, children }: { ok: boolean | undefined; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span
        className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold"
        style={{ background: ok ? "rgba(52,211,153,.15)" : "#14151c", color: ok ? "#34d399" : "#8a8d9b" }}
      >
        {ok === undefined ? "…" : ok ? "✓" : "—"}
      </span>
      {children}
    </div>
  );
}

// ─────────────────────────────── Step 1 — Setup ───────────────────────────────
export function Step1() {
  const { data, loading, error, reload } = useLive<any>("/api/setup");
  return (
    <div className="space-y-5">
      <p className="text-mute">
        An asset issuer onboards: it registers the regulator&apos;s <b className="text-white">viewing key</b> and an
        association-set provider (ASP) approves a <b className="text-white">compliant set</b> of participants. Everything
        below is read live from the deployed contracts.
      </p>
      {error ? (
        <ErrorNote error={error} reload={reload} />
      ) : (
        <Card accent={ACCENTS.indigo}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Issuer configuration</h3>
            <LiveDot />
          </div>
          <div className="mt-4 space-y-3">
            <Check ok={loading ? undefined : data?.auditorRegistered}>
              Auditor viewing key registered{" "}
              {data?.auditorAx && <Mono className="ml-1">A.x = {data.auditorAx.slice(0, 18)}…</Mono>}
            </Check>
            <Check ok={loading ? undefined : data?.rootApproved}>
              ASP approved the settlement root (compliance gate)
            </Check>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
            <span>disclosure <ContractLink id={demo.contracts.disclosure} /></span>
            <span>asp <ContractLink id={demo.contracts.aspOmni} /></span>
          </div>
        </Card>
      )}
    </div>
  );
}

// ──────────────────── Step 2 — Confidential settlement ────────────────────
export function Step2({ disclosed }: { disclosed: any | null }) {
  const { data, loading, error, reload } = useLive<any>("/api/notes");
  const note = data?.notes?.[0];
  return (
    <div className="space-y-5">
      <p className="text-mute">
        A payment is settled privately. The amount is encrypted to the auditor key before it ever touches the chain.
        Compare what the network stores against what an authorized auditor can later see.
      </p>
      {error ? (
        <ErrorNote error={error} reload={reload} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* chain side */}
          <Card accent={ACCENTS.blue}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">What the chain sees</h3>
              <LiveDot />
            </div>
            {loading || !note ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-xs">
                <Field label="ephemeral key R.x"><Mono>{note.rx.slice(0, 30)}…</Mono></Field>
                <Field label="ciphertext"><Mono>{note.ciphertext.slice(0, 30)}…</Mono></Field>
                <Field label="amount">
                  <span className="rounded bg-white/5 px-2 py-0.5 text-mute">encrypted · not visible</span>
                </Field>
              </div>
            )}
            <p className="mt-4 text-xs text-mute">3 notes stored on-chain, each proof-verified:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {demo.txs.putNotes.map((h, i) => (
                <TxLink key={h} hash={h} label={`note ${i}`} />
              ))}
            </div>
          </Card>
          {/* auditor side */}
          <Card accent={disclosed ? ACCENTS.violet : undefined} className={disclosed ? "" : "opacity-90"}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">What the auditor sees</h3>
              {!disclosed && <span className="text-[11px] uppercase tracking-wider text-mute">🔒 unlocks at step 5</span>}
            </div>
            {disclosed ? (
              <div className="mt-4 space-y-3">
                {disclosed.amounts.map((a: string, i: number) => (
                  <Field key={i} label={`note ${i} amount`}>
                    <span className="font-semibold text-white">{fmtUSD(a)}</span>
                  </Field>
                ))}
                <div className="border-t border-hair pt-3">
                  <Field label="total settled">
                    <span className="font-semibold spectrum-text">{fmtUSD(disclosed.total)}</span>
                  </Field>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid place-items-center py-8 text-center">
                <div className="text-3xl">🔒</div>
                <p className="mt-2 max-w-[14rem] text-xs text-mute">
                  Only the holder of the viewing key can decrypt these amounts. Reach step 5 to reveal them live.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-mute">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

// ─────────────────────────── Step 3 — Aggregation ───────────────────────────
export function Step3() {
  const { data, loading, error, reload } = useLive<any>("/api/aggregation");
  const rows = (data?.rows ?? demo.aggregation.rows) as { k: number; prism: number; naive: number }[];
  const ceiling = demo.aggregation.ceiling;
  const scale = Math.max(...rows.map((r) => r.naive));
  return (
    <div className="space-y-5">
      <p className="text-mute">
        Soroban caps a contract call at ~100M instructions. Verifying K settlements naïvely costs K× and blows the
        ceiling fast. Prism folds K into <b className="text-white">one</b> proof — so the on-chain verify stays flat.
      </p>
      {error ? (
        <ErrorNote error={error} reload={reload} />
      ) : (
        <Card accent={ACCENTS.green}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">On-chain verify cost vs. batch size K</h3>
            <span className="text-xs text-mute">measured</span>
          </div>
          <div className="relative mt-5 space-y-3">
            {/* ceiling marker */}
            <div
              className="pointer-events-none absolute top-0 bottom-6 w-px bg-spectrum-red/60"
              style={{ left: `calc(7rem + ${(ceiling / scale) * 100}% * 0.999)` }}
            >
              <span className="absolute -top-4 -translate-x-1/2 whitespace-nowrap text-[10px] text-spectrum-red">
                100M ceiling
              </span>
            </div>
            {rows.map((r) => {
              const naiveOver = r.naive > ceiling;
              return (
                <div key={r.k} className="flex items-center gap-3 text-xs">
                  <span className="w-12 shrink-0 text-mute">K={r.k}</span>
                  <div className="relative h-8 flex-1">
                    {/* naive */}
                    <div
                      className="absolute top-0 h-3 rounded-r"
                      style={{ width: `${(r.naive / scale) * 100}%`, background: naiveOver ? "#f87171" : "#3a3b46" }}
                      title={`naive: ${fmtInsn(r.naive)}`}
                    />
                    {/* prism */}
                    <div
                      className="absolute top-4 h-3 rounded-r"
                      style={{ width: `${(r.prism / scale) * 100}%`, background: "#34d399" }}
                      title={`prism: ${fmtInsn(r.prism)}`}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right">
                    {naiveOver ? <span className="text-spectrum-red">naive {fmtInsn(r.naive)}</span> : <span className="text-mute">naive {fmtInsn(r.naive)}</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[11px] text-mute">
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded bg-spectrum-green" /> Prism (flat ~{fmtInsn(demo.aggregation.flatVerify)})</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded bg-spectrum-red" /> naive K× (fails ≥ K=4)</span>
          </div>
          <p className="mt-4 text-sm">
            <span className="spectrum-text font-semibold">Previously impossible on Stellar.</span>{" "}
            K=8 settled in one verify — {fmtInsn(data?.settleK8Instructions ?? demo.aggregation.settleK8Instructions)} total.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <TxLink hash={demo.txs.settleK8} label="K=8 settle" />
            <span className="inline-flex items-center gap-1.5 text-xs">
              <LiveDot label="" />
              <span className="text-mute">a settled nullifier is spent on-chain:</span>
              <b style={{ color: data?.settledNullifierSpent ? "#34d399" : "#8a8d9b" }}>
                {loading ? "…" : String(!!data?.settledNullifierSpent)}
              </b>
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────── Step 4 — Omnichain ───────────────────────────
export function Step4() {
  const { data, loading, error, reload } = useLive<any>("/api/omnichain");
  return (
    <div className="space-y-5">
      <p className="text-mute">
        Nullifiers are chain-agnostic, so the same identity yields the same nullifier on EVM and Stellar. A relayer
        mirrors the EVM spent-set; <code className="text-white">settle()</code> then rejects any identity already spent
        on EVM.
      </p>
      <div className="flex items-center gap-2 text-xs text-mute">
        EVM source of truth <MockBadge title="Attestation mode: a trusted relayer mirrors the EVM spent-set. SCF replaces it with on-chain verification of proven EVM state." />
        <span>· relayer sync {data?.syncTx && <TxLink hash={data.syncTx} label="sync" />}</span>
      </div>
      {error ? (
        <ErrorNote error={error} reload={reload} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card accent={ACCENTS.red}>
            <h3 className="text-sm font-semibold">Identity A — already spent on EVM</h3>
            <div className="mt-3 space-y-2 text-sm">
              <Check ok={loading ? undefined : data?.aForeignSpent}>foreign-spent on EVM (mirror)</Check>
              <div className="mt-2 rounded-lg border border-spectrum-red/30 bg-spectrum-red/5 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⛔</span>
                  <span className="font-semibold text-spectrum-red">
                    {loading ? "simulating…" : data?.aBlocked ? "Settle BLOCKED" : "—"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-spectrum-red/80">
                  live settle simulation → {loading ? "…" : `Error(Contract, #${data?.aErrorCode}) ForeignSpent`}
                </p>
              </div>
              <LiveDot label="live settle simulation" />
            </div>
          </Card>
          <Card accent={ACCENTS.green}>
            <h3 className="text-sm font-semibold">Identity B — fresh</h3>
            <div className="mt-3 space-y-2 text-sm">
              <Check ok={loading ? undefined : data ? !data.bForeignSpent : undefined}>not spent on EVM</Check>
              <div className="mt-2 rounded-lg border border-spectrum-green/30 bg-spectrum-green/5 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <span className="font-semibold text-spectrum-green">Settled successfully</span>
                </div>
                <p className="mt-1 text-xs text-spectrum-green/80">a fresh identity settles normally on Stellar.</p>
              </div>
              {data?.freshSettleTx && <TxLink hash={data.freshSettleTx} label="fresh settle" />}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────── Step 5 — Selective disclosure ───────────────────
export function Step5({ onDisclosed }: { onDisclosed: (d: any) => void }) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decrypt() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/disclose", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      onDisclosed(json);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-mute">
        The auditor holds the viewing key. It fetches the on-chain ciphertexts and decrypts them{" "}
        <b className="text-white">live, in this request</b> (Baby Jubjub ECDH + Poseidon), then checks a predicate —
        without ever de-shielding the asset publicly.
      </p>
      <Card accent={ACCENTS.violet}>
        {!data && !error && (
          <button
            onClick={decrypt}
            disabled={loading}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90 transition disabled:opacity-60"
          >
            {loading ? "Decrypting on-chain ciphertexts…" : "Decrypt with viewing key"}
          </button>
        )}
        {error && <ErrorNote error={error} reload={decrypt} />}
        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Auditor view (decrypted live)</h3>
              <LiveDot label="decrypted from chain" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {data.amounts.map((a: string, i: number) => (
                <div key={i} className="rounded-lg border border-hair bg-white/[0.02] p-3 text-center">
                  <div className="text-[11px] text-mute">note {i}</div>
                  <div className="mt-1 font-semibold text-white">{fmtUSD(a)}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Predicate
                ok={data.totalPass}
                label={`total settled == ${fmtUSD(data.expectedTotal)}`}
                detail={`decrypted total = ${fmtUSD(data.total)}`}
              />
              <Predicate ok={data.allUnderCapOk} label={`every transfer ≤ ${fmtUSD(data.capOk)}`} />
              <Predicate
                ok={!data.allUnderCapFail}
                inverted
                label={`every transfer ≤ ${fmtUSD(data.capFail)}`}
                detail="correctly fails — one transfer exceeds the cap"
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Predicate({ ok, label, detail, inverted }: { ok: boolean; label: string; detail?: string; inverted?: boolean }) {
  const pass = ok;
  return (
    <div
      className="flex items-center justify-between rounded-lg border p-3 text-sm"
      style={{
        borderColor: pass ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)",
        background: pass ? "rgba(52,211,153,.05)" : "rgba(248,113,113,.05)",
      }}
    >
      <div>
        <span className="font-mono text-xs">{label}</span>
        {detail && <span className="ml-2 text-xs text-mute">{detail}</span>}
      </div>
      <span className="font-semibold" style={{ color: pass ? "#34d399" : "#f87171" }}>
        {inverted ? (pass ? "✓ rejected" : "leaked") : pass ? "PASS" : "FAIL"}
      </span>
    </div>
  );
}

// ─────────────────────────────── Summary ───────────────────────────────
export function Summary({ disclosed }: { disclosed: any | null }) {
  const items = [
    { c: "#34d399", title: "Proof aggregation", body: "K=8 settlements in one ~flat verify; naive K× breaks the 100M ceiling at K=4.", id: demo.contracts.aggregatorK8, tx: demo.txs.settleK8 },
    { c: "#fb923c", title: "Omnichain nullifiers", body: "An identity spent on EVM is rejected on Stellar; a fresh identity settles.", id: demo.contracts.omnichainMirror, tx: demo.txs.evmSync },
    { c: "#8b5cf6", title: "Selective disclosure", body: disclosed ? `Auditor verified total settled = ${fmtUSD(disclosed.total)} — privately.` : "Auditor decrypts on-chain ciphertexts and verifies predicates.", id: demo.contracts.disclosure, tx: demo.txs.putNotes[0] },
  ];
  return (
    <div className="space-y-5">
      <p className="text-mute">
        Three differentiators, all live on Stellar testnet — the ZK module a regulated-asset issuer plugs into the
        SEP-57 / confidential-token interface.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <Card key={it.title} accent={it.c}>
            <div className="h-1 w-10 rounded-full" style={{ background: it.c }} />
            <h3 className="mt-3 text-sm font-semibold">{it.title}</h3>
            <p className="mt-1.5 text-xs text-mute">{it.body}</p>
            <div className="mt-3 flex items-center justify-between">
              <ContractLink id={it.id} />
              <TxLink hash={it.tx} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
