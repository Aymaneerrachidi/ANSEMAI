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

The existing config already has generic "Who is Ansem" (`faq`) and "Risk explanation" (`risk`)
documents. The new, more detailed bio and concentration-risk documents **replace** these two
existing entries rather than sit alongside them (same `kind`, richer `content`) — avoids surfacing
two versions of the same topic once `localAnswer`'s who-is-Ansem/risk branches are rewired through
`findRelevantDocs`.

## 1. Knowledge base additions (`data/ansem-config.json`)

Add new documents (kinds: `history`, `faq`, `risk`, `security`, `rumor`) covering the five findings
above, written the same way existing docs are (plain content strings, no markdown). Add a new
top-level config array:

```ts
knownImpersonators: Array<{
  label: string;               // e.g. "Fake airdrop-claim site"
  kind: "domain" | "handle";   // which matcher to apply
  pattern: string;             // normalized domain (no protocol/www, lowercase) or handle (no leading @, lowercase)
  note: string;                // short reason, e.g. "Wallet-drainer scam site impersonating the official domain"
}>
```

`lib/types.ts` gains this field on `AnsemConfig`, defaulting to `[]` wherever read (the field won't
exist in the JSON file until this lands, so all readers — `officialSources`, the checker, the
Signal Rail — must tolerate `undefined`/missing).

Matching rules (`verifyUserInput` in `lib/answer-engine.ts`), to remove ambiguity between "official
allowlist" (exact match) and "impersonator list" (fuzzy match):

- Before matching, normalize both the submitted value and every `pattern`: strip `https://`/`http://`
  and leading `www.`, strip trailing slashes, lowercase.
- `kind: "domain"` patterns match a submitted URL if the normalized submitted host **equals the
  pattern, or ends with `.` + the pattern** (so `claim.blackbullsol.club` matches a
  `blackbullsol.club` pattern, but `evilfakeblackbullsol.club` does not — the dot boundary prevents
  suffix-string false positives).
- `kind: "handle"` patterns match a submitted `@handle` if the normalized handle (no `@`) equals the
  pattern exactly (handles don't get substring/subdomain-style matching).
- Impersonator matching runs only for values that did **not** already match the official allowlist —
  a value is either "listed as official," "matches a known impersonator: `<note>`," or "I couldn't
  verify this from official sources," never more than one of these.

`scripts/manage-config.mjs` gains an `add-impersonator` subcommand mirroring the existing `add-doc`
/ `add-announcement-source` pattern (writing normalized `pattern` values), so curation stays
script-driven with no admin UI (unchanged project constraint). The `list` subcommand is extended to
also print configured impersonators, for consistency with how it already lists other config arrays.

## 2. Backend logic (`lib/answer-engine.ts`, `lib/intents.ts`)

- **Scam-checker upgrade**: `verifyUserInput` currently only checks submitted URLs/addresses/handles
  against the official allowlist. Add a check against `config.knownImpersonators`, using exactly the
  matching rules defined in Section 1 (domain suffix-match with a dot boundary, handle exact-match,
  never both at once) so a submitted link/handle can be flagged explicitly — "this matches a known
  impersonator: `<note>`" — instead of the generic "couldn't verify." Falls back to today's generic
  message when there's no match either way.
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
- **Scope gate update (required, not optional)**: `isAnsemScoped()` in `lib/answer-engine.ts` is a
  separate gate that runs *before* `detectIntent`/`localAnswer` are ever reached (see
  `answerQuestion`). Its `scopeTerms` list must gain the same new terms ("legit", "rug",
  "concentration", "impersonator", etc.), or questions using those words are rejected by
  `outOfScopeAnswer` before the improved checker/intent logic ever sees them — today, e.g., "is this
  legit" already fails this way even though `detectIntent` alone would classify it correctly. Both
  lists change together in the same commit.

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

This route is public and unauthenticated like `/api/chat`, and `getHolderSnapshot` calls Solana RPC
with no cache window (`cache: "no-store"`) — so it must reuse the same `checkRateLimit` /
`clientKeyFromHeaders` utilities `/api/chat` already uses (`lib/rate-limit.ts`), keyed per-client,
before this becomes a free way to hammer the configured RPC endpoint. The DexScreener half can keep
relying on its existing `next: { revalidate: 30 }` fetch cache; the rate limit is specifically to
protect the RPC call. Use a route-prefixed key (e.g. `` `market:${ip}` ``) rather than sharing
`/api/chat`'s bare-IP bucket, so a browser tab polling the rail in the background doesn't eat into a
user's chat-request budget.

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
- **Shared visual pass** — scoped to these specific files/elements, so it doesn't become open-ended
  polish work:
  - `app/page.tsx` header (`hero-bar`): tighten spacing now that a rail sits alongside it; the
    "Official sources only" pill moves to reference the rail instead of floating alone.
  - `components/chat.tsx` message bubbles and the existing inline source-citation block (lines
    ~140-168): restyle to share the exact border/radius/padding scale used by the new
    `SignalRail` cards, so the two panels read as one system rather than two different eras of the
    app.
  - `components/chat.tsx` empty state (the starter-question grid shown when `messages.length === 1`):
    visual refresh only (spacing/hover states), no behavior change.
  - New loading state in `components/chat.tsx`: while a response is streaming and `content` is still
    empty, show a skeleton/typing indicator instead of an empty bubble (today an empty assistant
    bubble is pushed to state immediately on submit — see `chat.tsx` lines 36-37 — and stays visually
    empty until the first chunk arrives).
  - `components/site-footer.tsx`: no structural change, minor styling alignment only (border/color
    tokens) to match the new card system.
  - `app/globals.css`: extend, don't replace — add the new card/skeleton/pulse-on-update primitives
    the rail needs as new classes alongside the existing ones (`.panel-glow`, `.pulse-dot`, etc.),
    keep the current dark green/black palette, bull crest, and noise/grid atmosphere as the base.

## Out of scope

- No admin UI (unchanged project constraint).
- No new paid API integrations — panel reuses existing DexScreener/Solana RPC calls only.
- No embedding/semantic search work (README already flags this as a separate future item).
- No change to the rate-limiting *mechanism* or thresholds (still in-memory, still 20 req/min),
  Supabase document merge, or the LLM provider fallback chain beyond the system prompt content
  itself. (The new `/api/market` route does apply the existing mechanism to itself, per Section 3 —
  that's extending its use, not changing it.)

## Sequencing

Although coupled, the three workstreams touch disjoint files with different risk profiles and
should be planned/built as three ordered sub-steps, not one monolithic change:

1. **Content** — knowledge base documents + `knownImpersonators` config + `manage-config.mjs`
   subcommand + `lib/types.ts`. Independently testable (config loads, script runs).
2. **Backend logic** — `isAnsemScoped`/`lib/intents.ts` term updates, `verifyUserInput` impersonator
   matching, system prompt rewrite, local composer enrichment. Depends on (1) existing in config.
   Independently testable via `answerQuestion`/`localAnswer` without touching the UI.
3. **UI** — `/api/market` route + rate limiting, `SignalRail`, `app/page.tsx` layout, shared visual
   pass. Depends on (1) for `config.knownImpersonators` (the ticker renders each entry's `label` and
   `note` directly from config, not from anything `verifyUserInput` computes); does not depend on
   (2) at all.

## Testing

- Extend `tests/chat.spec.ts` (Playwright) with a smoke check that the Signal Rail renders and
  shows either live numbers or an explicit "couldn't fetch" state (never a blank panel).
- Manual verification: run dev server, exercise starter questions plus a few of the new
  knowledge-base topics (who is Ansem, concentration risk, impersonator domains, rumor debunk) and
  confirm citations render correctly on both the LLM path (if a key is set) and the no-key local
  fallback path.
