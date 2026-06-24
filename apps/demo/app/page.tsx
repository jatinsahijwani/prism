import Link from "next/link";
import { PrismMark } from "@/components/PrismMark";

// Placeholder landing — full hero lands in build step 2.
export default function Home() {
  return (
    <main className="mx-auto max-w-content px-5 py-24 text-center">
      <div className="flex justify-center">
        <PrismMark size={96} animated />
      </div>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight">Prism</h1>
      <p className="mt-3 text-mute">The confidential-compliance layer for real-world assets on Stellar.</p>
      <Link
        href="/demo"
        className="mt-8 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90 transition"
      >
        Launch demo
      </Link>
    </main>
  );
}
