import type { AnsemConfig, Source } from "@/lib/types";

export type LiveResult = {
  text: string;
  sources: Source[];
};

type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  labels?: string[];
  pairCreatedAt?: number;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  priceNative?: string;
  liquidity?: { usd?: number };
  volume?: { m5?: number; h1?: number; h6?: number; h24?: number };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  txns?: {
    m5?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
    h6?: { buys?: number; sells?: number };
    h24?: { buys?: number; sells?: number };
  };
  fdv?: number;
  marketCap?: number;
};

function formatUsd(value?: number) {
  return typeof value === "number" ? `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : undefined;
}

function formatChange(value?: number) {
  return typeof value === "number" ? `${value > 0 ? "+" : ""}${value}%` : undefined;
}

function formatTxns(pair: DexPair, window: "m5" | "h1" | "h6" | "h24") {
  const txns = pair.txns?.[window];
  if (!txns) return undefined;
  return `${txns.buys ?? 0} buys / ${txns.sells ?? 0} sells`;
}

async function fetchAnsemPair(config: AnsemConfig): Promise<{ pair: DexPair } | { error: LiveResult }> {
  if (!config.officialContract) {
    return {
      error: {
        text: "I could not fetch live market data because the official contract address has not been added to the project configuration yet. I couldn't verify this from official sources.\n\nNot financial advice.",
        sources: [{ title: "Project configuration", detail: "Official contract missing" }]
      }
    };
  }

  const baseUrl = process.env.DEXSCREENER_BASE_URL ?? "https://api.dexscreener.com/latest/dex";
  const response = await fetch(`${baseUrl}/search?q=${encodeURIComponent(config.officialContract)}`, {
    next: { revalidate: 30 }
  });

  if (!response.ok) {
    return {
      error: {
        text: "DexScreener did not return live data right now. I couldn't verify current price, liquidity, or volume from the live source.\n\nNot financial advice.",
        sources: [{ title: "DexScreener", url: "https://dexscreener.com" }]
      }
    };
  }

  const data = (await response.json()) as { pairs?: DexPair[] };
  const pair =
    data.pairs
      ?.filter((item) => item.baseToken?.address?.toLowerCase() === config.officialContract.toLowerCase())
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? data.pairs?.[0];

  if (!pair) {
    return {
      error: {
        text: "DexScreener did not find a pair for the configured official contract. I couldn't verify live market data from DexScreener.\n\nNot financial advice.",
        sources: [{ title: "DexScreener", url: "https://dexscreener.com" }]
      }
    };
  }

  return { pair };
}

export type MarketSnapshot = {
  priceUsd?: number;
  change24hPct?: number;
  marketCapUsd?: number;
  liquidityUsd?: number;
  volume24hUsd?: number;
  pairUrl?: string;
};

export type MarketSnapshotResult = { ok: true; data: MarketSnapshot } | { ok: false; message: string };

export async function getMarketSnapshot(config: AnsemConfig): Promise<MarketSnapshotResult> {
  const result = await fetchAnsemPair(config);
  if ("error" in result) return { ok: false, message: result.error.text };
  const { pair } = result;

  return {
    ok: true,
    data: {
      priceUsd: pair.priceUsd ? Number(pair.priceUsd) : undefined,
      change24hPct: pair.priceChange?.h24,
      marketCapUsd: pair.marketCap,
      liquidityUsd: pair.liquidity?.usd,
      volume24hUsd: pair.volume?.h24,
      pairUrl: pair.url
    }
  };
}

export async function getDexScreenerMarketCap(config: AnsemConfig): Promise<LiveResult> {
  const result = await fetchAnsemPair(config);
  if ("error" in result) return result.error;
  const { pair } = result;

  const marketCap = formatUsd(pair.marketCap);
  const text = marketCap
    ? `Market cap: ${marketCap}${typeof pair.fdv === "number" && pair.fdv !== pair.marketCap ? ` (FDV: ${formatUsd(pair.fdv)})` : ""}\n\nNot financial advice.`
    : "DexScreener did not report a market cap for this pair right now.\n\nNot financial advice.";

  return {
    text,
    sources: [{ title: "DexScreener pair", url: pair.url ?? "https://dexscreener.com", detail: pair.pairAddress }]
  };
}

export async function getDexScreenerMarket(config: AnsemConfig): Promise<LiveResult> {
  const result = await fetchAnsemPair(config);
  if ("error" in result) return result.error;
  const { pair } = result;

  const createdAt = pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toISOString() : undefined;
  const lines = [
    `Live DexScreener data for ${pair.baseToken?.symbol ?? "$ANSEM"}:`,
    "",
    pair.priceUsd ? `Price USD: $${pair.priceUsd}` : undefined,
    pair.priceNative ? `Price native: ${pair.priceNative} ${pair.quoteToken?.symbol ?? ""}`.trim() : undefined,
    typeof pair.marketCap === "number" ? `Market cap: ${formatUsd(pair.marketCap)}` : undefined,
    typeof pair.fdv === "number" ? `FDV: ${formatUsd(pair.fdv)}` : undefined,
    formatUsd(pair.liquidity?.usd) ? `Liquidity: ${formatUsd(pair.liquidity?.usd)}` : undefined,
    formatUsd(pair.volume?.m5) ? `5m volume: ${formatUsd(pair.volume?.m5)}` : undefined,
    formatUsd(pair.volume?.h1) ? `1h volume: ${formatUsd(pair.volume?.h1)}` : undefined,
    formatUsd(pair.volume?.h6) ? `6h volume: ${formatUsd(pair.volume?.h6)}` : undefined,
    formatUsd(pair.volume?.h24) ? `24h volume: ${formatUsd(pair.volume?.h24)}` : undefined,
    formatChange(pair.priceChange?.m5) ? `5m change: ${formatChange(pair.priceChange?.m5)}` : undefined,
    formatChange(pair.priceChange?.h1) ? `1h change: ${formatChange(pair.priceChange?.h1)}` : undefined,
    formatChange(pair.priceChange?.h6) ? `6h change: ${formatChange(pair.priceChange?.h6)}` : undefined,
    formatChange(pair.priceChange?.h24) ? `24h change: ${formatChange(pair.priceChange?.h24)}` : undefined,
    formatTxns(pair, "m5") ? `5m transactions: ${formatTxns(pair, "m5")}` : undefined,
    formatTxns(pair, "h1") ? `1h transactions: ${formatTxns(pair, "h1")}` : undefined,
    formatTxns(pair, "h6") ? `6h transactions: ${formatTxns(pair, "h6")}` : undefined,
    formatTxns(pair, "h24") ? `24h transactions: ${formatTxns(pair, "h24")}` : undefined,
    "",
    pair.chainId ? `Chain: ${pair.chainId}` : undefined,
    pair.dexId ? `DEX: ${pair.dexId}` : undefined,
    pair.pairAddress ? `Pair: ${pair.pairAddress}` : undefined,
    pair.baseToken?.address ? `Base token: ${pair.baseToken.address}` : undefined,
    pair.quoteToken?.address ? `Quote token: ${pair.quoteToken.address}` : undefined,
    pair.labels?.length ? `Labels: ${pair.labels.join(", ")}` : undefined,
    createdAt ? `Pair created: ${createdAt}` : undefined,
    "",
    "Market moves can reflect liquidity, broader sentiment, news, wallet activity, or normal volatility. I can only confirm the numbers above from DexScreener.",
    "",
    "Not financial advice."
  ].filter(Boolean);

  return {
    text: lines.join("\n"),
    sources: [{ title: "DexScreener pair", url: pair.url ?? "https://dexscreener.com", detail: pair.pairAddress }]
  };
}
