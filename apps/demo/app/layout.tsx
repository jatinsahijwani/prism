import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Prism — confidential, auditable RWA settlement on Stellar",
  description:
    "One ZK primitive in, a spectrum of problems solved out: proof aggregation, omnichain nullifiers, and standard-native selective disclosure — live on Stellar testnet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
