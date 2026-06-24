"use client";
import { useCallback, useEffect, useState } from "react";
import { demo, txUrl, contractUrl, short } from "@/lib/demoData";

export const ACCENTS = {
  indigo: "#6366f1",
  blue: "#38bdf8",
  green: "#34d399",
  orange: "#fb923c",
  violet: "#8b5cf6",
  red: "#f87171",
} as const;

/** Live data hook — fetches a JSON API route; exposes loading/error/reload. */
export function useLive<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function LiveDot({ label = "live on testnet" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-spectrum-green">
      <span className="h-1.5 w-1.5 rounded-full bg-spectrum-green animate-pulse" />
      {label}
    </span>
  );
}

export function MockBadge({ title }: { title: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-full border border-spectrum-yellow/40 bg-spectrum-yellow/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-spectrum-yellow"
    >
      mock
    </span>
  );
}

export function TxLink({ hash, label }: { hash: string; label?: string }) {
  return (
    <a
      href={txUrl(hash)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-hair bg-white/[0.03] px-2.5 py-1 font-mono text-xs text-white/80 hover:border-white/30 hover:text-white transition"
    >
      <span className="text-mute">tx</span>
      {label ?? short(hash, 6)}
      <span aria-hidden>↗</span>
    </a>
  );
}

export function ContractLink({ id, label }: { id: string; label?: string }) {
  return (
    <a
      href={contractUrl(id)}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs text-mute hover:text-white transition"
      title={id}
    >
      {label ?? short(id, 5)} ↗
    </a>
  );
}

export function Mono({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-xs break-all text-white/80 ${className}`}>{children}</span>;
}

export function Card({
  children,
  accent,
  className = "",
}: {
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-hair bg-panel p-5 ${className}`}
      style={accent ? { boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.03), 0 0 40px -28px ${accent}` } : undefined}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function ErrorNote({ error, reload }: { error: string; reload: () => void }) {
  return (
    <div className="rounded-xl border border-spectrum-red/30 bg-spectrum-red/5 p-4 text-sm text-spectrum-red">
      <p className="font-medium">Live read failed</p>
      <p className="mt-1 text-xs text-spectrum-red/80 break-all">{error}</p>
      <button onClick={reload} className="mt-2 rounded-md border border-spectrum-red/40 px-2.5 py-1 text-xs hover:bg-spectrum-red/10">
        Retry
      </button>
    </div>
  );
}

export { demo };
