"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, ShieldAlert, ShieldCheck, TrendingDown, TrendingUp, Users } from "lucide-react";

type OkResult<T> = { ok: true; data: T };
type ErrResult = { ok: false; message: string };

type MarketData = {
  priceUsd?: number;
  change24hPct?: number;
  marketCapUsd?: number;
  liquidityUsd?: number;
  volume24hUsd?: number;
  pairUrl?: string;
};

type HolderData = {
  totalSupply: number;
  topHolderSharePct: number;
  solscanUrl?: string;
};

type KnownImpersonator = {
  label: string;
  kind: "domain" | "handle";
  pattern: string;
  note: string;
};

type MarketApiResponse = {
  market: OkResult<MarketData> | ErrResult;
  holders: OkResult<HolderData> | ErrResult;
  officialSources: {
    contract: string | null;
    website: string | null;
    devAccount: { handle: string; label: string; url: string } | null;
  };
  knownImpersonators: KnownImpersonator[];
};

const POLL_MS = 30_000;

function formatUsd(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: value < 1 ? 6 : 2 })}`;
}

function truncateMiddle(value: string, head = 4, tail = 4) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function SkeletonLine({ width = "70%" }: { width?: string }) {
  return <div className="skeleton h-4" style={{ width }} />;
}

export function SignalRail() {
  const [data, setData] = useState<MarketApiResponse | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [copied, setCopied] = useState(false);
  const lastPriceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let timer: number;

    async function poll() {
      try {
        const response = await fetch("/api/market", { cache: "no-store" });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const payload = (await response.json()) as MarketApiResponse;
        if (cancelled) return;

        const nextPrice = payload.market.ok ? payload.market.data.priceUsd : undefined;
        if (nextPrice !== undefined && lastPriceRef.current !== undefined && nextPrice !== lastPriceRef.current) {
          setPulsing(true);
          window.setTimeout(() => setPulsing(false), 900);
        }
        lastPriceRef.current = nextPrice;

        setData(payload);
        setFetchError(false);
      } catch {
        if (!cancelled) setFetchError(true);
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

  async function copyContract(contract: string) {
    try {
      await navigator.clipboard.writeText(contract);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable, ignore
    }
  }

  const market = data?.market;
  const holders = data?.holders;
  const change = market?.ok ? market.data.change24hPct : undefined;
  const isUp = typeof change === "number" && change >= 0;

  return (
    <aside className="flex w-full flex-col gap-3">
      <section className="rail-card p-4">
        <div className="rail-card-title mb-3">
          <span className="pulse-dot" style={{ width: 6, height: 6 }} />
          Live signal
        </div>

        {fetchError && !data ? (
          <p className="text-xs text-[var(--muted)]">Couldn&apos;t fetch live market data right now.</p>
        ) : !data ? (
          <div className="flex flex-col gap-2">
            <SkeletonLine width="55%" />
            <SkeletonLine width="80%" />
            <SkeletonLine width="65%" />
          </div>
        ) : !market?.ok ? (
          <p className="text-xs text-[var(--muted)]">{market?.message ?? "Couldn't fetch live data."}</p>
        ) : (
          <div className={`flex flex-col gap-2.5 ${pulsing ? "stat-pulse" : ""}`}>
            <div className="flex items-baseline justify-between">
              <span className="rail-stat-value text-2xl font-semibold tracking-tight">
                {formatUsd(market.data.priceUsd) ?? "—"}
              </span>
              {typeof change === "number" ? (
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${isUp ? "rail-stat-up" : "rail-stat-down"}`}
                  style={{ background: isUp ? "var(--primary-soft)" : "var(--danger-soft)" }}
                >
                  {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {isUp ? "+" : ""}
                  {change.toFixed(2)}%
                </span>
              ) : null}
            </div>
            <dl className="grid grid-cols-2 gap-x-2 gap-y-2 border-t border-[var(--border)] pt-2.5 text-xs text-[var(--muted-strong)]">
              <dt className="text-[var(--muted)]">Market cap</dt>
              <dd className="rail-stat-value text-right">{formatUsd(market.data.marketCapUsd) ?? "—"}</dd>
              <dt className="text-[var(--muted)]">Liquidity</dt>
              <dd className="rail-stat-value text-right">{formatUsd(market.data.liquidityUsd) ?? "—"}</dd>
              <dt className="text-[var(--muted)]">24h volume</dt>
              <dd className="rail-stat-value text-right">{formatUsd(market.data.volume24hUsd) ?? "—"}</dd>
            </dl>
            {market.data.pairUrl ? (
              <a
                href={market.data.pairUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--muted)] transition-colors hover:text-[var(--primary)]"
              >
                <ExternalLink size={11} />
                View on DexScreener
              </a>
            ) : null}
          </div>
        )}
      </section>

      <section className="rail-card p-4">
        <div className="rail-card-title mb-3">
          <Users size={12} />
          Holder concentration
        </div>
        {!data ? (
          <SkeletonLine width="60%" />
        ) : !holders?.ok ? (
          <p className="text-xs text-[var(--muted)]">{holders?.message ?? "Couldn't fetch holder data."}</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="text-xs leading-5 text-[var(--muted-strong)]">
              Top 10 wallets hold{" "}
              <span className="rail-stat-value font-semibold text-[var(--foreground)]">
                {holders.data.topHolderSharePct.toFixed(2)}%
              </span>{" "}
              of total supply.
            </p>
            <div className="meter-track">
              <div
                className="meter-fill"
                style={{ width: `${Math.min(100, Math.max(0, holders.data.topHolderSharePct))}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {data?.officialSources ? (
        <section className="rail-card p-4">
          <div className="rail-card-title mb-3">
            <ShieldCheck size={12} className="text-[var(--primary)]" />
            Official sources
          </div>
          <div className="flex flex-col gap-2 text-xs">
            {data.officialSources.contract ? (
              <button
                type="button"
                onClick={() => copyContract(data.officialSources.contract as string)}
                className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 font-mono text-[var(--muted-strong)] transition-colors hover:border-[var(--border-glow)] hover:text-[var(--primary)]"
              >
                {truncateMiddle(data.officialSources.contract)}
                {copied ? <Check size={13} className="text-[var(--primary)]" /> : <Copy size={13} />}
              </button>
            ) : null}
            {data.officialSources.website ? (
              <a
                href={data.officialSources.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-1 text-[var(--muted-strong)] transition-colors hover:text-[var(--primary)]"
              >
                <ExternalLink size={12} />
                Official website
              </a>
            ) : null}
            {data.officialSources.devAccount ? (
              <a
                href={data.officialSources.devAccount.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-1 text-[var(--muted-strong)] transition-colors hover:text-[var(--primary)]"
              >
                <ExternalLink size={12} />@{data.officialSources.devAccount.handle}
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      {data?.knownImpersonators && data.knownImpersonators.length > 0 ? (
        <section className="rail-card p-4">
          <div className="rail-card-title mb-3">
            <ShieldAlert size={12} className="text-[var(--warning)]" />
            Known impersonators
          </div>
          <ul className="flex flex-col gap-3">
            {data.knownImpersonators.map((entry) => (
              <li key={entry.pattern} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--muted-strong)]">
                    {entry.kind === "handle" ? `@${entry.pattern}` : entry.pattern}
                  </span>
                  <span className="badge-not-official">Not official</span>
                </div>
                <p className="text-[11px] leading-4 text-[var(--muted)]">{entry.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
