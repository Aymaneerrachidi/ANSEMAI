export type Intent =
  | "marketcap"
  | "market"
  | "holder"
  | "checker"
  | "contract"
  | "dashboard"
  | "latest"
  | "beginner"
  | "risk"
  | "general";

const marketWords = ["price", "liquidity", "volume", "market cap", "mcap", "chart", "candle", "moving", "fdv"];
const holderWords = ["holders", "top wallet", "top wallets", "supply", "transaction", "tx", "wallet"];
const checkerWords = ["is this", "real", "fake", "legit", "scam", "verify", "official"];
const latestWords = ["latest", "recent", "post", "posted", "announcement", "update", "tweet", "x account", "on x"];
const otherMarketWords = ["price", "liquidity", "volume", "chart", "candle", "moving", "fdv"];

function asksMarketCapOnly(text: string) {
  const hasMcTerm = /\bmc\b/.test(text) || /\bmcap\b/.test(text) || text.includes("market cap") || text.includes("marketcap");
  if (!hasMcTerm) return false;
  return !otherMarketWords.some((word) => text.includes(word));
}

export function detectIntent(input: string): Intent {
  const text = input.toLowerCase();
  if (asksMarketCapOnly(text)) return "marketcap";
  if (marketWords.some((word) => text.includes(word)) || /\bmc\b/.test(text)) return "market";
  if (holderWords.some((word) => text.includes(word))) return "holder";
  if (text.includes("contract")) {
    const wantsVerification = ["is this", "real", "fake", "legit", "scam", "verify"].some((word) => text.includes(word));
    return wantsVerification ? "checker" : "contract";
  }
  if (text.includes("dashboard")) return "dashboard";
  if (latestWords.some((word) => text.includes(word))) return "latest";
  if (checkerWords.some((word) => text.includes(word))) return "checker";
  if (text.includes("beginner") || text.includes("new buyer") || text.includes("simple") || text.includes("what is")) return "beginner";
  if (text.includes("risk")) return "risk";
  return "general";
}

export function extractUrlsAndAddresses(input: string) {
  const urls = input.match(/https?:\/\/[^\s)]+/gi) ?? [];
  const addresses = input.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g) ?? [];
  const handles = input.match(/@[A-Za-z0-9_]{1,15}/g) ?? [];
  return { urls, addresses, handles };
}
