"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, BadgeCheck, Radio, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { BullLogo } from "@/components/bull-logo";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage, Source } from "@/lib/types";

const starters = [
  "What is $ANSEM?",
  "What is the official contract?",
  "Is this X account real?",
  "Summarize latest official update",
  "How many holders are there?",
  "Why is the price moving?"
];

const INTRO =
  "Ask me about $ANSEM official links, contracts, updates, holder FAQs, scams, or live market data. I cite configured sources and say clearly when I can't verify something.";

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: INTRO }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isEmptyState = messages.length === 1;

  useEffect(() => {
    if (!isEmptyState) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isEmptyState]);

  async function submit(nextInput?: string) {
    const message = (nextInput ?? input).trim();
    if (!message || isLoading) return;

    setInput("");
    setIsLoading(true);
    setMessages((current) => [...current, { role: "user", content: message }, { role: "assistant", content: "", sources: [] }]);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);
      if (!response.body) throw new Error("No stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.replace(/^data: /, "");
          if (!line) continue;
          const event = JSON.parse(line) as { type: "chunk" | "sources" | "done"; value?: string | Source[] };

          if (event.type === "chunk") {
            setMessages((current) => {
              const copy = [...current];
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = { ...last, content: `${last.content}${event.value as string}` };
              return copy;
            });
          }

          if (event.type === "sources") {
            setMessages((current) => {
              const copy = [...current];
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = { ...last, sources: event.value as Source[] };
              return copy;
            });
          }
        }
      }
    } catch {
      setMessages((current) => {
        const copy = [...current];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "I couldn't verify this from official sources. The response stream stopped unexpectedly."
        };
        return copy;
      });
    } finally {
      window.clearTimeout(timeout);
      setIsLoading(false);
      abortRef.current = null;
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="flex min-h-0 flex-1 flex-col">
        {/* Panel header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-raised)]/60 px-5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--primary-soft)]">
              <Radio size={14} className="text-[var(--primary)]" />
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-[var(--foreground)]">Coin assistant</p>
              <p className="text-[11px] text-[var(--muted)]">Grounded in official sources</p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted)] sm:flex">
            <span className="pulse-dot" style={{ width: 5, height: 5 }} />
            Online
          </span>
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="scrollbar flex-1 overflow-y-auto bg-[var(--bg)] px-5 py-6">
          {isEmptyState ? (
            <div className="hero-in mx-auto flex h-full max-w-lg flex-col items-center justify-center py-4 text-center">
              <div className="hero-glow brand-medallion mb-4 h-12 w-12">
                <BullLogo size={28} />
              </div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                The Black Bull desk
              </p>
              <h2 className="wordmark text-[24px] leading-[1.08] text-[var(--foreground)] sm:text-[28px]">
                Ask the desk about <span className="text-[var(--primary)]">$ANSEM</span>
              </h2>
              <p className="mx-auto mt-2.5 max-w-sm text-[12.5px] leading-5 text-[var(--muted-strong)]">{INTRO}</p>

              <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
                {starters.map((starter, index) => (
                  <button
                    type="button"
                    key={starter}
                    style={{ animationDelay: `${index * 55}ms` }}
                    onClick={() => void submit(starter)}
                    className="starter-in rail-card group flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] leading-5 text-[var(--muted-strong)] transition-all hover:-translate-y-0.5 hover:border-[var(--border-glow)] hover:text-[var(--foreground)]"
                  >
                    <Sparkles size={14} className="shrink-0 text-[var(--primary)] transition-transform group-hover:scale-110" />
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {messages.map((message, index) => (
                <article key={index} className={`msg-in ${message.role === "user" ? "ml-auto max-w-[82%]" : "max-w-[90%]"}`}>
                  <div className="mb-2 flex items-center gap-2 text-[12px] text-[var(--muted)]">
                    {message.role === "assistant" ? (
                      <span className="grid h-6 w-6 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface-muted)]">
                        <BullLogo size={16} />
                      </span>
                    ) : (
                      <BadgeCheck size={15} className="text-[var(--primary)]" />
                    )}
                    <span className="font-medium text-[var(--muted-strong)]">
                      {message.role === "assistant" ? "AnsemAI" : "You"}
                    </span>
                  </div>
                  <div
                    className={
                      message.role === "user"
                        ? "msg-bubble msg-bubble-user px-4 py-3 text-[14px] leading-6"
                        : "msg-bubble msg-bubble-assistant message-text px-4 py-3.5 text-[14px] leading-6"
                    }
                  >
                    {message.role === "assistant" && message.content === "" && isLoading && index === messages.length - 1 ? (
                      <span className="typing-dots" aria-label="AnsemAI is typing">
                        <span />
                        <span />
                        <span />
                      </span>
                    ) : (
                      message.content
                    )}
                  </div>
                  {message.sources && message.sources.length > 0 ? (
                    <div className="rail-card mt-2.5 px-3.5 py-2.5">
                      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                        <ShieldCheck size={13} className="text-[var(--primary)]" />
                        Sources
                      </div>
                      <div className="flex flex-col gap-1">
                        {message.sources.slice(0, 8).map((source, sourceIndex) =>
                          source.url ? (
                            <a
                              key={`${source.title}-${sourceIndex}`}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-[12.5px] text-[var(--muted-strong)] underline-offset-2 transition-colors hover:text-[var(--primary)] hover:underline"
                            >
                              <ExternalLink size={13} className="shrink-0" />
                              {source.title}
                            </a>
                          ) : (
                            <p key={`${source.title}-${sourceIndex}`} className="text-[12.5px] text-[var(--muted)]">
                              {source.title}
                              {source.detail ? `: ${source.detail}` : ""}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className="border-t border-[var(--border)] bg-[var(--surface-raised)]/70 px-5 py-4 backdrop-blur-sm">
          <div className="composer mx-auto flex max-w-3xl items-end gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-1.5 pl-3 transition-colors focus-within:border-[var(--border-glow)] focus-within:shadow-[0_0_0_4px_var(--primary-softer)]">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder="Ask AnsemAI about $ANSEM…"
              className="min-h-11 flex-1 resize-none border-0 bg-transparent px-0 py-2.5 shadow-none focus:border-0 focus:shadow-none"
            />
            <button
              type="button"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              onClick={() => void submit()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[var(--primary)] text-[var(--primary-foreground)] transition-all hover:bg-[var(--primary-strong)] disabled:opacity-35 disabled:hover:bg-[var(--primary)]"
            >
              <ArrowUp size={18} strokeWidth={2.4} />
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl px-1 text-[10.5px] text-[var(--muted)]">
            AnsemAI can be wrong. Always verify the contract before you buy.
          </p>
        </form>
      </section>
    </div>
  );
}
