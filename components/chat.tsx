"use client";

import { FormEvent, useRef, useState } from "react";
import { BadgeCheck, CheckCircle2, ExternalLink, Send, ShieldCheck, Sparkles } from "lucide-react";
import { BullLogo } from "@/components/bull-logo";
import { Button } from "@/components/ui/button";
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

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me about $ANSEM official links, contracts, updates, holder FAQs, scams, or live market data. I will cite configured sources and say when I cannot verify something."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-raised)] px-5">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <CheckCircle2 size={16} className="text-[var(--ok)]" />
            Ansem coin assistant
          </div>
          <p className="hidden text-sm text-[var(--muted)] sm:block">$ANSEM questions only</p>
        </div>
        <div className="scrollbar flex-1 overflow-y-auto bg-[var(--bg)] px-5 py-5">
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((message, index) => (
              <article
                key={index}
                className={`msg-in ${message.role === "user" ? "ml-auto max-w-[82%]" : "max-w-[88%]"}`}
              >
                <div className="mb-2 flex items-center gap-2 text-sm text-[var(--muted)]">
                  {message.role === "assistant" ? <BullLogo size={22} /> : <BadgeCheck size={16} className="text-[var(--primary)]" />}
                  <span className="text-[var(--muted-strong)]">{message.role === "assistant" ? "AnsemAI" : "You"}</span>
                </div>
                <div
                  className={
                    message.role === "user"
                      ? "rounded-md border border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]"
                      : "message-text rounded-md border border-[var(--border)] border-l-2 border-l-[var(--primary)] bg-[var(--surface-raised)] px-4 py-3 text-sm leading-6 whitespace-pre-wrap text-[var(--foreground)] shadow-[0_1px_0_rgba(0,0,0,0.3)]"
                  }
                >
                  {message.content}
                </div>
                {message.sources && message.sources.length > 0 ? (
                  <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--muted-strong)]">
                      <ShieldCheck size={14} className="text-[var(--primary)]" />
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
                            className="flex items-center gap-2 text-xs text-[var(--muted-strong)] underline-offset-2 hover:text-[var(--primary)] hover:underline"
                          >
                            <ExternalLink size={13} />
                            {source.title}
                          </a>
                        ) : (
                          <p key={`${source.title}-${sourceIndex}`} className="text-xs text-[var(--muted)]">
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
            {messages.length === 1 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {starters.map((starter, index) => (
                  <button
                    type="button"
                    key={starter}
                    style={{ animationDelay: `${index * 60}ms` }}
                    onClick={() => void submit(starter)}
                    className="starter-in flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-3 text-left text-sm leading-5 text-[var(--muted-strong)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  >
                    <Sparkles size={15} className="text-[var(--primary)]" />
                    {starter}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <form onSubmit={onSubmit} className="border-t border-[var(--border)] bg-[var(--surface-raised)] px-5 py-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder="Ask AnsemAI..."
              className="min-h-11"
            />
            <Button
              type="button"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="h-11 w-11 px-0"
              onClick={() => void submit()}
            >
              <Send size={17} />
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
