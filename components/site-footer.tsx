"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const WALLET = "DGQWMgfFZRKSsZTL2yawLA93CKfMmx7PkT1NGunroJra";

function truncate(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function SiteFooter() {
  const [copied, setCopied] = useState(false);

  async function copyWallet() {
    try {
      await navigator.clipboard.writeText(WALLET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable, ignore
    }
  }

  return (
    <footer className="mx-auto mt-3 flex w-full max-w-7xl shrink-0 flex-wrap items-center justify-between gap-2 px-1 text-xs text-[var(--muted)]">
      <p>
        Built by{" "}
        <a
          href="https://x.com/gyrotrenches"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[var(--muted-strong)] underline-offset-2 hover:text-[var(--primary)] hover:underline"
        >
          gyro
        </a>
      </p>
      <button
        type="button"
        onClick={copyWallet}
        aria-label="Copy wallet address"
        className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 font-mono text-[var(--muted-strong)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
      >
        {copied ? <Check size={12} className="text-[var(--primary)]" /> : <Copy size={12} />}
        <span className="hidden sm:inline">{copied ? "Copied" : `Tip / airdrop: ${truncate(WALLET)}`}</span>
        <span className="sm:hidden">{copied ? "Copied" : truncate(WALLET)}</span>
      </button>
    </footer>
  );
}
