"use client";
import { useEffect, useState } from "react";
import { getKit } from "@/lib/walletKit";

export function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Restore a prior selection silently if available.
    (async () => {
      try {
        const kit = getKit();
        if (!kit) return;
        const { address } = await kit.getAddress();
        if (address) setAddress(address);
      } catch {
        /* not connected yet */
      }
    })();
  }, []);

  async function connect() {
    const kit = getKit();
    if (!kit) return;
    setBusy(true);
    try {
      await kit.openModal({
        onWalletSelected: async (option) => {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          setAddress(address);
        },
      });
    } catch {
      /* user closed modal */
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    setAddress(null);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden sm:flex items-center gap-1.5 text-xs text-mute">
        <span className="h-1.5 w-1.5 rounded-full bg-spectrum-green animate-pulse" />
        testnet
      </span>
      {address ? (
        <button
          onClick={disconnect}
          title={address}
          className="rounded-full hairline px-3 py-1.5 text-xs font-mono text-white/90 hover:bg-white/5 transition"
        >
          {address.slice(0, 4)}…{address.slice(-4)}
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={busy}
          className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-white/90 transition disabled:opacity-50"
        >
          {busy ? "Connecting…" : "Connect wallet"}
        </button>
      )}
    </div>
  );
}
