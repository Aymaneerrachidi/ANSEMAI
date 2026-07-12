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
    <footer className="mx-auto flex w-full max-w-[1240px] shrink-0 flex-wrap items-center justify-between gap-2 px-2 text-xs text-[var(--muted)]">
      <p className="flex items-center gap-1.5">
        <span className="hidden sm:inline">Built by</span>
        <a
          href="https://x.com/gyrotrenches"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[var(--muted-strong)] underline-offset-2 transition-colors hover:text-[var(--primary)] hover:underline"
        >
          gyro
        </a>
        <span className="text-[var(--border-strong)]">·</span>
        <span>Not financial advice</span>
      </p>
      <button
        type="button"
        onClick={copyWallet}
        aria-label="Copy wallet address"
        className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 font-mono text-[var(--muted-strong)] transition-colors hover:border-[var(--border-glow)] hover:text-[var(--primary)]"
      >
        {copied ? <Check size={12} className="text-[var(--primary)]" /> : <Copy size={12} />}
        <span className="hidden sm:inline">{copied ? "Copied" : `Tip / airdrop: ${truncate(WALLET)}`}</span>
        <span className="sm:hidden">{copied ? "Copied" : truncate(WALLET)}</span>
      </button>
    </footer>
  );
}
