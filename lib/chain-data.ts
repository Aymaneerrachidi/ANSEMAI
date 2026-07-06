import type { AnsemConfig } from "@/lib/types";
import type { LiveResult } from "@/lib/live-data";

type RpcResponse<T> = { result?: T; error?: { message: string } };

type TokenSupplyResult = { value: { amount: string; decimals: number } };
type LargestAccountsResult = { value: Array<{ address: string; amount: string }> };

function rpcEndpoint() {
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  if (process.env.HELIUS_API_KEY) return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  return "https://api.mainnet-beta.solana.com";
}

async function rpcCall<T>(endpoint: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);

  const data = (await response.json()) as RpcResponse<T>;
  if (data.error) throw new Error(data.error.message);
  if (!data.result) throw new Error(`Empty RPC result for ${method}`);
  return data.result;
}

function formatAmount(raw: string, decimals: number) {
  const value = Number(raw) / 10 ** decimals;
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export async function getHolderSnapshot(config: AnsemConfig): Promise<LiveResult> {
  const solscanHoldersUrl = config.officialContract ? `https://solscan.io/token/${config.officialContract}#holders` : undefined;

  if (!config.officialContract) {
    return {
      text: "I could not fetch holder/supply data because the official contract address has not been added to the project configuration yet. I couldn't verify this from official sources.",
      sources: [{ title: "Project configuration", detail: "Official contract missing" }]
    };
  }

  const endpoint = rpcEndpoint();

  try {
    const [supply, largest] = await Promise.all([
      rpcCall<TokenSupplyResult>(endpoint, "getTokenSupply", [config.officialContract]),
      rpcCall<LargestAccountsResult>(endpoint, "getTokenLargestAccounts", [config.officialContract])
    ]);

    const decimals = supply.value.decimals;
    const totalSupply = Number(supply.value.amount);
    const top = largest.value.slice(0, 10);
    const topSum = top.reduce((sum, account) => sum + Number(account.amount), 0);
    const topShare = totalSupply > 0 ? ((topSum / totalSupply) * 100).toFixed(2) : "0";

    const lines = [
      "Live on-chain supply data for the configured contract (Solana RPC):",
      "",
      `Total supply: ${formatAmount(supply.value.amount, decimals)}`,
      `Top ${top.length} token accounts hold ${topShare}% of total supply.`,
      "",
      "Largest token accounts (address: balance):",
      ...top.map((account, index) => `${index + 1}. ${account.address}: ${formatAmount(account.amount, decimals)}`),
      "",
      "This is raw token-account balance data, not a labeled holder count (some large accounts can be exchanges, LPs, or program-owned). For a full unique-holder count and wallet labels, check Solscan.",
      "",
      "Not financial advice."
    ];

    return {
      text: lines.join("\n"),
      sources: [
        { title: endpoint.includes("helius") ? "Solana RPC via Helius" : "Solana public RPC", detail: "getTokenSupply / getTokenLargestAccounts" },
        ...(solscanHoldersUrl ? [{ title: "Solscan token holders", url: solscanHoldersUrl }] : [])
      ]
    };
  } catch {
    return {
      text: "I could not fetch live holder/supply data right now (the Solana RPC endpoint did not respond or timed out). I couldn't verify this from official sources.\n\nYou can check holder counts directly on Solscan in the meantime.",
      sources: solscanHoldersUrl ? [{ title: "Solscan token holders", url: solscanHoldersUrl }] : []
    };
  }
}
