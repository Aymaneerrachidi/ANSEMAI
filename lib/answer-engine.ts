import OpenAI from "openai";
import { detectIntent, extractUrlsAndAddresses } from "@/lib/intents";
import { getDexScreenerMarket, getDexScreenerMarketCap, type LiveResult } from "@/lib/live-data";
import { getHolderSnapshot } from "@/lib/chain-data";
import type { AnsemConfig, Source } from "@/lib/types";

function officialSources(config: AnsemConfig): Source[] {
  return [
    config.officialWebsite ? { title: "Official website", url: config.officialWebsite } : undefined,
    config.officialDashboard ? { title: "Official dashboard", url: config.officialDashboard } : undefined,
    config.officialContract ? { title: "Official contract", detail: config.officialContract } : undefined,
    ...config.officialLinks.map((link) => ({ title: link.label, url: link.url })),
    ...config.trustedXAccounts.map((account) => ({ title: account.label, url: account.url, detail: `@${account.handle}` })),
    ...config.announcementSources.map((source) => ({ title: source.label, url: source.url, detail: source.type })),
    ...config.documents.map((doc) => ({ title: doc.title, detail: doc.kind }))
  ].filter(Boolean) as Source[];
}

function findRelevantDocs(config: AnsemConfig, query: string) {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9$]+/)
    .filter((term) => term.length > 2);

  return config.documents
    .map((doc) => {
      const haystack = `${doc.title} ${doc.kind} ${doc.content}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.doc);
}

function scamWarning() {
  return "Safety note: watch for fake contracts, fake X accounts, fake Telegrams, fake Discords, airdrops, presales, support DMs, and wallet approval links. Never share seed phrases or private keys.";
}

function isAnsemScoped(query: string) {
  const text = query.toLowerCase();
  if (/\b(mc|mcap|fdv)\b/.test(text) || text.includes("market cap") || text.includes("marketcap")) return true;
  if (/^(hi|hey|hello)\b/.test(text) && /\b(llm|model|bot|assistant)\b/.test(text)) return true;

  const scopeTerms = [
    "ansem",
    "$ansem",
    "black bull",
    "blknoiz",
    "contract",
    "dashboard",
    "holder",
    "holders",
    "liquidity",
    "price",
    "market",
    "market cap",
    "mcap",
    "volume",
    "supply",
    "wallet",
    "transaction",
    "tx",
    "dexscreener",
    "solscan",
    "birdeye",
    "helius",
    "telegram",
    "discord",
    "x account",
    "twitter",
    "roadmap",
    "tokenomics",
    "announcement",
    "update",
    "post",
    "posted",
    "tweet",
    "on x",
    "scam",
    "fake",
    "official",
    "legit",
    "rug",
    "impersonator",
    "concentration",
    "concentrated",
    "who really made",
    "who actually made",
    "zion thomas"
  ];

  return scopeTerms.some((term) => text.includes(term));
}

function outOfScopeAnswer(config: AnsemConfig): LiveResult {
  return {
    text:
      "I can only answer questions about $ANSEM / The Black Bull, official sources, scam checks, contracts, holder information, announcements, and live token-market data. Ask me an $ANSEM-related question and I will verify it against official sources.",
    sources: officialSources(config)
  };
}

function normalizeHost(value: string): string {
  try {
    const withScheme = value.includes("://") ? value : `https://${value}`;
    return new URL(withScheme).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
  }
}

function normalizeHandle(value: string): string {
  return value.replace(/^@/, "").toLowerCase();
}

function findImpersonatorMatch(config: AnsemConfig, kind: "domain" | "handle", normalizedValue: string) {
  return (config.knownImpersonators ?? []).find((entry) => {
    if (entry.kind !== kind) return false;
    if (kind === "handle") return normalizedValue === entry.pattern;
    return normalizedValue === entry.pattern || normalizedValue.endsWith(`.${entry.pattern}`);
  });
}

function verifyUserInput(config: AnsemConfig, query: string): LiveResult {
  const { urls, addresses, handles } = extractUrlsAndAddresses(query);
  const officialUrls = new Set([
    config.officialWebsite,
    config.officialDashboard,
    ...config.officialLinks.map((link) => link.url),
    ...config.trustedXAccounts.map((account) => account.url),
    ...config.announcementSources.map((source) => source.url)
  ].filter(Boolean).map((url) => url.toLowerCase().replace(/\/$/, "")));
  const trustedHandles = new Set(config.trustedXAccounts.map((account) => account.handle.toLowerCase()));

  const findings: string[] = [];

  for (const address of addresses) {
    if (config.officialContract && address.toLowerCase() === config.officialContract.toLowerCase()) {
      findings.push(`${address}: matches the configured official contract.`);
    } else {
      findings.push(`${address}: I couldn't verify this from official sources.`);
    }
  }

  for (const url of urls) {
    const normalized = url.toLowerCase().replace(/\/$/, "");
    if (officialUrls.has(normalized)) {
      findings.push(`${url}: listed as an official source.`);
      continue;
    }
    const impersonator = findImpersonatorMatch(config, "domain", normalizeHost(url));
    findings.push(
      impersonator
        ? `${url}: matches a known impersonator (${impersonator.label}) - ${impersonator.note}`
        : `${url}: I couldn't verify this from official sources.`
    );
  }

  for (const handle of handles) {
    const clean = normalizeHandle(handle);
    if (trustedHandles.has(clean)) {
      findings.push(`${handle}: listed as a trusted X account.`);
      continue;
    }
    const impersonator = findImpersonatorMatch(config, "handle", clean);
    findings.push(
      impersonator
        ? `${handle}: matches a known impersonator (${impersonator.label}) - ${impersonator.note}`
        : `${handle}: I couldn't verify this from official sources.`
    );
  }

  if (findings.length === 0) {
    findings.push("Send me the contract, link, or account handle and I will compare it against the configured official sources.");
  }

  return {
    text: `${findings.join("\n")}\n\n${scamWarning()}`,
    sources: officialSources(config)
  };
}

function localAnswer(config: AnsemConfig, query: string): LiveResult {
  const intent = detectIntent(query);
  const docs = findRelevantDocs(config, query);
  const sources = officialSources(config);
  const text = query.toLowerCase();

  if (intent === "checker") return verifyUserInput(config, query);

  if (/\b(which|what)\s+(llm|model)\b/.test(text) || /\b(llm|model)\s+(are|is)\b/.test(text)) {
    return {
      text:
        "I am AnsemAI, the $ANSEM / The Black Bull assistant. I am configured to answer only ANSEM-related questions, verify official sources, check scam links/contracts/accounts, and fetch live market data when asked.",
      sources
    };
  }

  if (/\bwho\s+is\s+ansem\b/.test(text) || /\bwho\s+(really|actually)?\s*made\s+(this|the token|ansem|black bull)\b/.test(text)) {
    const devAccount = config.trustedXAccounts.find((account) => account.handle.toLowerCase() === "blknoiz06") ?? config.trustedXAccounts[0];
    const bioDocs = config.documents.filter((doc) => /who is ansem|how \$ansem originated/i.test(doc.title));
    const context = bioDocs.map((doc) => doc.content).join("\n\n");
    const accountLine = devAccount
      ? `The trusted dev X account configured here is @${devAccount.handle} (${devAccount.url}).`
      : "I couldn't verify a trusted dev account from the configured official sources.";
    return {
      text: context ? `${context}\n\n${accountLine}` : `I don't have a deeper bio configured yet, so I won't invent one. ${accountLine}`,
      sources
    };
  }

  if (intent === "contract") {
    return {
      text: config.officialContract
        ? `The configured official contract is:\n\n${config.officialContract}\n\nAlways compare contracts character by character and avoid links from DMs or replies. ${scamWarning()}`
        : `The official contract has not been added to the project configuration yet. I couldn't verify this from official sources.\n\n${scamWarning()}`,
      sources
    };
  }

  if (intent === "dashboard") {
    return {
      text: config.officialDashboard
        ? `The configured official dashboard is:\n\n${config.officialDashboard}\n\nUse only official links and avoid dashboard links from replies, ads, or DMs.`
        : "The official dashboard link has not been added to the project configuration yet. I couldn't verify this from official sources.",
      sources
    };
  }

  if (intent === "latest") {
    const announcementDocs = config.documents.filter((doc) => /announcement|update|roadmap/i.test(`${doc.kind} ${doc.title}`));
    const latest = announcementDocs.at(-1);
    return {
      text: latest
        ? `Latest configured official update:\n\n${latest.title}\n\n${latest.content}\n\nI can only summarize updates that are present in trusted sources or uploaded docs.`
        : "No official announcements have been uploaded or configured yet. I couldn't verify this from official sources.",
      sources
    };
  }

  if (intent === "beginner") {
    const context = docs.map((doc) => doc.content).join("\n\n");
    return {
      text: context
        ? `$ANSEM / The Black Bull, in simple words:\n\n${context}\n\nI am only using configured official docs here.`
        : "$ANSEM / The Black Bull is a community token, but the core description, tokenomics, roadmap, and official links have not been fully added to the project configuration yet. I couldn't verify more from official sources.\n\nFor now, use this assistant to verify official contracts, dashboards, links, and announcements before trusting anything.",
      sources
    };
  }

  if (intent === "risk") {
    const riskDocs = config.documents.filter((doc) => doc.kind === "risk");
    const context = riskDocs.map((doc) => doc.content).join("\n\n");
    return {
      text: context
        ? `${context}\n\n${scamWarning()}\n\nNot financial advice.`
        : `Key risks include market volatility, thin liquidity, fake contracts, impersonator accounts, malicious Telegram or Discord links, wallet-draining approvals, and unconfirmed rumors.\n\nI can only confirm project-specific risks from uploaded official docs. ${scamWarning()}\n\nNot financial advice.`,
      sources
    };
  }

  if (docs.length > 0) {
    return {
      text: docs.map((doc) => `${doc.title}\n${doc.content}`).join("\n\n"),
      sources: docs.map((doc) => ({ title: doc.title, detail: doc.kind }))
    };
  }

  return {
    text: "I couldn't verify this from official sources. Add official FAQs, docs, announcements, tokenomics, roadmap, links, or trusted accounts to the project configuration and I can answer with citations.",
    sources
  };
}

async function llmAnswer(config: AnsemConfig, query: string, local: LiveResult): Promise<LiveResult> {
  const providers = [
    {
      name: "primary",
      apiKey: process.env.LLM_API_KEY || config.apiKeys.llmApiKey || process.env.OPENAI_API_KEY || config.apiKeys.openai,
      baseURL: process.env.LLM_BASE_URL || config.apiKeys.llmBaseUrl || undefined,
      model: process.env.LLM_MODEL || config.apiKeys.llmModel || process.env.OPENAI_MODEL || "gpt-4.1-mini"
    },
    {
      name: "cohere",
      apiKey: process.env.COHERE_API_KEY || config.apiKeys.cohereApiKey,
      baseURL: process.env.COHERE_BASE_URL || config.apiKeys.cohereBaseUrl || "https://api.cohere.ai/compatibility/v1",
      model: process.env.COHERE_MODEL || config.apiKeys.cohereModel || "command-a-03-2025"
    }
  ].filter((provider) => provider.apiKey);

  const sourceText = local.sources
    .map((source, index) => `[${index + 1}] ${source.title}${source.url ? ` ${source.url}` : ""}${source.detail ? ` ${source.detail}` : ""}`)
    .join("\n");

  for (const provider of providers) {
    try {
      const client = new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL });
      const response = await client.chat.completions.create({
        model: provider.model,
        messages: [
          {
            role: "system",
            content: [
              "You are AnsemAI, a support and education assistant only for $ANSEM / The Black Bull, a Solana memecoin.",
              "Scope: refuse non-$ANSEM questions (general knowledge, coding, politics, entertainment, personal advice, unrelated crypto). Refuse by saying you can only answer $ANSEM / The Black Bull questions.",
              "Never invent information. Use only the verified local context and sources given to you below - do not add facts from your own training data about this project, even if you recall something about it.",
              "If a claim is not confirmed by the given context, say exactly: I couldn't verify this from official sources.",
              "Provenance discipline: the local context mixes three kinds of claims - (a) official/configured facts (contract, links, trusted accounts), (b) third-party-reported facts (e.g. biographical or origin-story claims attributed to crypto-news coverage), and (c) risk/security warnings. When you use (b), keep language like 'reported' or 'per third-party coverage' rather than stating it as confirmed fact. Do not blur (b) into (a).",
              "Warn about fake contracts, fake X accounts, fake Telegrams, fake Discords, known impersonator domains, and scam links when relevant to the question.",
              "Add 'Not financial advice.' for market-related answers."
            ].join(" ")
          },
          {
            role: "user",
            content: `User question: ${query}\n\nVerified local answer/context:\n${local.text}\n\nSources:\n${sourceText}`
          }
        ],
        temperature: 0.2
      });

      return {
        text: response.choices[0]?.message.content || local.text,
        sources: local.sources
      };
    } catch {
      continue;
    }
  }

  return local;
}

export async function answerQuestion(config: AnsemConfig, query: string): Promise<LiveResult> {
  if (!isAnsemScoped(query)) {
    return outOfScopeAnswer(config);
  }

  const intent = detectIntent(query);
  if (intent === "marketcap") {
    return getDexScreenerMarketCap(config);
  }
  if (intent === "market") {
    return getDexScreenerMarket(config);
  }
  if (intent === "holder") {
    return getHolderSnapshot(config);
  }

  const local = localAnswer(config, query);
  return llmAnswer(config, query, local);
}
