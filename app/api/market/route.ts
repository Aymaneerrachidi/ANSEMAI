import { getConfig } from "@/lib/config-store";
import { getMarketSnapshot } from "@/lib/live-data";
import { getHolderSnapshotData } from "@/lib/chain-data";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(`market:${clientKeyFromHeaders(request.headers)}`);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const config = await getConfig();
  const [market, holders] = await Promise.all([getMarketSnapshot(config), getHolderSnapshotData(config)]);

  return Response.json({
    market,
    holders,
    officialSources: {
      contract: config.officialContract || null,
      website: config.officialWebsite || null,
      devAccount: config.trustedXAccounts[0] ?? null
    },
    knownImpersonators: config.knownImpersonators ?? []
  });
}
