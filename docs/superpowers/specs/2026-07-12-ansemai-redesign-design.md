# AnsemAI redesign: terminal split-view, researched knowledge base, sharper logic

Date: 2026-07-12
Status: Approved by user, ready for implementation planning

## Context

AnsemAI is a single-page Next.js (App Router) chat assistant for the `$ANSEM / The Black Bull`
Solana memecoin community. It answers scoped questions (official links/contract, scam checks,
holder/market data, beginner FAQs) using a local JSON knowledge base
(`data/ansem-config.json`), live DexScreener/Solana-RPC data, and an optional OpenAI-compatible
LLM with a strict local-answer fallback when no key is configured. There is deliberately no admin
UI; content is curated via `scripts/manage-config.mjs`.

The current UI is a single centered chat column on a dark green/black theme. The knowledge base
covers only official links/contract/tokenomics basics and generic risk language. This spec covers
three coupled workstreams: a visual redesign, an expanded and fact-checked knowledge base, and
tighter backend prompting/logic — all landing together since the new knowledge base is what makes
the new UI panel and the new checker logic meaningful.

## Research findings (to encode as cited knowledge documents)

Sourced via web search (see citations inline in the doc content, not fabricated):

- **Origin**: $ANSEM ("The Black Bull") launched on Pump.fun mid-June 2026 by an anonymous
  deployer, who airdropped roughly 65% of supply to Ansem's (@blknoiz06) public wallet. Ansem did
  not launch the token himself; he later publicly embraced it and pledged to route Pump.fun
  creator fees back to holders via recurring airdrops.
- **Who is Ansem**: real name Zion Thomas; Solana trader/influencer, ~750K X followers, known
  informally as "The Solana Guy"; co-founder of the Bullpen trading terminal. This is third-party
  biographical reporting, not an official project bio.
- **Concentration risk**: on-chain screening tools (RugCheck and others cited in coverage) flag
  that the top holder wallets hold a large majority of supply — a manipulation/volatility risk
  distinct from "is this a scam," stated as risk framing, not accusation.
- **Known impersonators**: confirmed-fake or unofficial-but-confusing domains/accounts —
  `blackbullsolclaim.pro` (active wallet-drainer airdrop scam per pcrisk.com), `blackbullsol.club`,
  `ansemblackbull.com`, and the fan account `@BlackBullSol` (explicitly labeled "Fan:" by X, not
  official). Only `blackbullsol.com` and `@blknoiz06` are treated as official/trusted in this
  project's config.
- **Rumor debunk**: a July 2025/2026-circulating "Ansem was arrested" rumor was false — Ansem
  addressed it directly in his own community chat. Modeled as a reusable "debunked rumor" document
  shape so future rumors can be added the same way via `manage-config.mjs`.

All of this is added as neutral, attributed `KnowledgeDocument` entries (existing shape:
`title` / `kind` / `content`), consistent with the app's existing tone of citing sources and
distinguishing official/confirmed vs. third-party vs. unverified claims. Nothing here changes the
`officialContract` / `officialWebsite` / `trustedXAccounts` in the current config — those already
match what the research confirms as official.

## 1. Knowledge base additions (`data/ansem-config.json`)

Add new documents (kinds: `history`, `faq`, `risk`, `security`, `rumor`) covering the five findings
above, written the same way existing docs are (plain content strings, no markdown). Add a new
top-level config array:

```ts
knownImpersonators: Array<{
  label: string;        // e.g. "Fake airdrop-claim site"
  pattern: string;       // domain or handle to match against user-submitted links, e.g. "blackbullsol.club"
  note: string;          // short reason, e.g. "Wallet-drainer scam site impersonating the official domain"
}>
```

`lib/types.ts` gains this field on `AnsemConfig`. `scripts/manage-config.mjs` gains an
`add-impersonator` subcommand mirroring the existing `add-doc` / `add-announcement-source`
pattern, so curation stays script-driven with no admin UI (unchanged project constraint).

## 2. Backend logic (`lib/answer-engine.ts`, `lib/intents.ts`)

- **Scam-checker upgrade**: `verifyUserInput` currently only checks submitted URLs/addresses/handles
  against the official allowlist. Add a check against `config.knownImpersonators` (substring/domain
  match) so a submitted link/handle can be flagged explicitly — "this matches a known impersonator:
  `<note>`" — instead of the generic "couldn't verify." Falls back to today's generic message when
  there's no match either way.
- **System prompt rewrite**: replace the current single-paragraph system prompt with one that keeps
  every existing hard rule (scope refusal, no invention, exact refusal phrase, scam warnings, "not
  financial advice") and adds explicit instruction to separate "official/confirmed,"
  "third-party-reported," and "unverified" when the local context contains mixed-provenance
  documents (which it now does, e.g. the "who is Ansem" bio vs. the official contract).
- **Local composer enrichment**: `localAnswer`'s beginner/risk/who-is-Ansem branches currently
  return fairly thin canned text. Update them to surface the new documents (still via
  `findRelevantDocs`, no new retrieval mechanism) so the zero-API-key fallback path is substantially
  more informative, matching the project's "free tier first" posture.
- **Intent detection**: add a handful of phrasings found during research to existing keyword buckets
  in `lib/intents.ts` (e.g. "is this legit", "who really made this", "concentration", "rug") — no
  structural change, same keyword-bucket approach.

No changes to `lib/chain-data.ts` or `lib/live-data.ts` logic itself, but see below — their output
shapes are reused by a new API route for the UI panel.

## 3. New API route: `/api/market`

A small `GET` route (`app/api/market/route.ts`) that calls the existing `getDexScreenerMarket` and
`getHolderSnapshot` functions (already pure/reusable) and returns their structured data as JSON
(not the chat-formatted text) for the new Signal Rail to poll. Reuses `getConfig()`. No new
external API integrations — same DexScreener + Solana RPC calls the chat path already makes.
Needs a small refactor: extract the raw numeric fields (price, change, mcap, liquidity, volume,
top-10 holder %) that `getDexScreenerMarket`/`getHolderSnapshot` currently only emit as pre-formatted
text lines, into a small typed struct each function returns alongside its `LiveResult` text, so the
same underlying fetch serves both the chat text answer and the panel's structured numbers.

## 4. Visual redesign — Terminal split-view

- `app/page.tsx` restructured into two columns on wide viewports: existing `Chat` panel
  (center/left) and a new `SignalRail` (right), collapsible into a toggle/sheet below a breakpoint
  (mobile stays single-column, rail becomes a slide-over or below-the-fold section — decide exact
  mechanism at implementation time, not a design commitment here).
- **New component** `components/signal-rail.tsx` (client component): polls `/api/market` on an
  interval (matching the DexScreener revalidate window, ~30s), renders:
  - Live price / 24h change / market cap / liquidity / 24h volume, tabular-nums, subtle
    pulse-on-update animation.
  - Holder concentration line (top-10 %) from the holder snapshot.
  - "Official sources" quick-reference card (contract short-form with copy button, website,
    trusted dev X account) — sourced from `getConfig()` via a small server-fetched prop or a
    lightweight `/api/config-summary` (implementation detail, not a new external dependency
    either way).
  - "Known impersonators" ticker/list rendering `config.knownImpersonators`, each with a
    "not official" badge.
  - Loading state: skeleton shimmer blocks, not blank space. Error state: "couldn't fetch live
    data" message consistent with the chat path's existing error language.
- **Shared visual pass**: header, footer, message bubbles, and source-citation cards get a
  consistency pass against the new rail's card styling (border/radius/spacing scale), plus general
  polish (empty state, loading state in chat itself). Keep the existing dark green/black palette,
  bull crest, and noise/grid atmosphere from `globals.css` as the base — this is refinement and
  extension of the current identity, not a palette replacement.

## Out of scope

- No admin UI (unchanged project constraint).
- No new paid API integrations — panel reuses existing DexScreener/Solana RPC calls only.
- No embedding/semantic search work (README already flags this as a separate future item).
- No change to rate limiting, Supabase document merge, or the LLM provider fallback chain beyond
  the system prompt content itself.

## Testing

- Extend `tests/chat.spec.ts` (Playwright) with a smoke check that the Signal Rail renders and
  shows either live numbers or an explicit "couldn't fetch" state (never a blank panel).
- Manual verification: run dev server, exercise starter questions plus a few of the new
  knowledge-base topics (who is Ansem, concentration risk, impersonator domains, rumor debunk) and
  confirm citations render correctly on both the LLM path (if a key is set) and the no-key local
  fallback path.
