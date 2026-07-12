"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

type MarketApiResponse = {
  market:
    | { ok: true; data: { priceUsd?: number; change24hPct?: number } }
    | { ok: false; message: string };
};

const POLL_MS = 30_000;

function formatPrice(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value >= 1) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 6 })}`;
}

export function MarketTicker() {
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [change, setChange] = useState<number | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [pulse, setPulse] = useState(false);
  const lastPrice = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let timer: number;

    async function poll() {
      try {
        const res = await fetch("/api/market", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const payload = (await res.json()) as MarketApiResponse;
        if (cancelled) return;

        if (payload.market.ok) {
          const next = payload.market.data.priceUsd;
          if (next !== undefined && lastPrice.current !== undefined && next !== lastPrice.current) {
            setPulse(true);
            window.setTimeout(() => setPulse(false), 900);
          }
          lastPrice.current = next;
          setPrice(next);
          setChange(payload.market.data.change24hPct);
        }
        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      } finally {
        if (!cancelled) timer = window.setTimeout(poll, POLL_MS);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const priceLabel = formatPrice(price);
  const isUp = typeof change === "number" && change >= 0;

  return (
    <div className={`ticker-chip ${pulse ? "stat-pulse" : ""}`} aria-live="polite">
      <span className="flex items-center gap-2">
        <span className="pulse-dot" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">$ANSEM</span>
      </span>
      {ready ? (
        <span className="ticker-price text-sm text-[var(--foreground)]">{priceLabel ?? "—"}</span>
      ) : (
        <span className="skeleton h-4 w-14" />
      )}
      {typeof change === "number" ? (
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
            isUp ? "text-[var(--primary)]" : "text-[var(--danger)]"
          }`}
          style={{ background: isUp ? "var(--primary-soft)" : "var(--danger-soft)" }}
        >
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isUp ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      ) : null}
    </div>
  );
}
