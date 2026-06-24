import Link from "next/link";
import { PrismMark } from "./PrismMark";
import { WalletConnect } from "./WalletConnect";

export function Header() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-hair">
      <div className="mx-auto flex max-w-content items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <PrismMark size={28} />
          <span className="text-sm font-semibold tracking-tight">Prism</span>
          <span className="hidden md:inline text-xs text-mute">· confidential RWA settlement on Stellar</span>
        </Link>
        <WalletConnect />
      </div>
    </header>
  );
}
