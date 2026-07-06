# AnsemAI

A focused ChatGPT-style support and education assistant for the `$ANSEM / The Black Bull` community.

The MVP is intentionally not a trading dashboard and has no public admin panel. It is a single ChatGPT-style assistant that answers beginner and holder questions, checks links/contracts/accounts against official sources, cites sources, warns about scams, and fetches live market data from DexScreener only when asked.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Free API posture

- DexScreener public API is used for price/liquidity/volume questions.
- Holder/supply questions use Solana's public JSON-RPC (`getTokenSupply` / `getTokenLargestAccounts`) with zero configuration. That public endpoint hard rate-limits `getTokenLargestAccounts`, so answers can fall back to "couldn't fetch live data" under load — set `HELIUS_API_KEY` (free tier, no card required) or `SOLANA_RPC_URL` to a more reliable RPC for consistent answers. See `lib/chain-data.ts`.
- Official-source answers use code-configured links, trusted accounts, and text docs in `data/ansem-config.json`.
- An OpenAI-compatible LLM is optional. Recommended free option: Gemini Developer API using `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`. If no key is set, AnsemAI uses a strict local answer composer that refuses unverified claims.
- Birdeye, X API, Redis, and other keyed services are modeled as optional code/env settings. The app does not require them to run.
- `/api/chat` has a built-in in-memory rate limit (20 requests/minute per IP, see `lib/rate-limit.ts`) and a 2000-character message cap. This is per-process, not distributed — fine for a single-instance deploy, not for multi-region.

## Keeping announcements current (no paid X/Twitter API needed)

X's API no longer has a real free tier (pay-per-read, ~$0.005/read as of 2026), and Nitter/RSS-scraping workarounds are unreliable and against X's terms, so this app does **not** auto-pull tweets. Instead, curate manually with the bundled script — copy the text of an official tweet/Telegram/Discord post and run:

```bash
npm run config -- add-doc --title "2026-07-06 update" --kind announcement --content "Paste the official post text here."
npm run config -- add-announcement-source --label "Official X" --type x --url "https://x.com/blknoiz06/status/..."
npm run config -- list
```

This appends to `data/ansem-config.json` with no external API, so "latest update" questions stay answerable and cited. If you later want semi-automation, a self-hosted [RSS-Bridge](https://github.com/RSS-Bridge/rss-bridge) feed you pipe into `add-doc` is the least-fragile free option, but treat it as best-effort, not production-grade.

## Configuration

Edit `data/ansem-config.json` (or run `npm run config`) or set environment variables to add:

- Official contract address
- Official links and dashboard link
- Trusted X accounts
- Telegram/Discord announcement sources
- FAQs, docs, announcements, tokenomics, and roadmap text
- LLM provider settings

There is deliberately no admin UI on the website.

## Supabase (optional)

`supabase/schema.sql` defines `ansem_documents` (pgvector-ready), `ansem_sources`, and `ansem_settings`. When `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, `getConfig()` merges documents from `ansem_documents` on top of the local JSON file (`lib/config-store.ts`), so you can scale document storage without giving up the zero-config local file for links/accounts/keys.

Push local docs to Supabase with:

```bash
npm run supabase:migrate
```

Note: this does **not** generate embeddings (no embedding provider is wired up), so the `embedding` column stays empty and vector similarity search is not active — documents are still matched by keyword scoring, same as the local path. Add an embedding job before relying on `ansem_documents_embedding_idx` for real semantic search.

## Testing

```bash
npm run test:e2e
```

Runs Playwright smoke tests (`tests/chat.spec.ts`) against a local dev server: page loads, a starter question returns a cited answer, and out-of-scope questions are refused.

## Production Notes

Add a real embedding/ingestion job (see Supabase section) before treating pgvector search as production-ready. Consider swapping the in-memory rate limiter for Redis/Upstash if you deploy across multiple instances or regions.
