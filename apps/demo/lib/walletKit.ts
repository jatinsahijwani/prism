"use client";
// Official Stellar Wallets Kit (browser-only). Single instance, testnet.
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  allowAllModules,
} from "@creit.tech/stellar-wallets-kit";

let kit: StellarWalletsKit | null = null;

export function getKit(): StellarWalletsKit | null {
  if (typeof window === "undefined") return null;
  if (!kit) {
    kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return kit;
}
