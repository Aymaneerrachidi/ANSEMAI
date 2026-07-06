import { LockKeyhole } from "lucide-react";
import { BullLogo } from "@/components/bull-logo";
import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="app-shell flex h-screen min-h-[640px] flex-col p-3">
      <header className="hero-bar relative mx-auto flex h-16 w-full max-w-7xl shrink-0 items-center justify-between overflow-hidden rounded-lg px-4 text-white">
        <div className="flex items-center gap-3">
          <BullLogo size={38} />
          <div>
            <h1 className="font-display text-[15px] font-semibold leading-5 tracking-wide text-[var(--foreground)]">
              ANSEM<span className="text-[var(--primary)]">AI</span>
            </h1>
            <p className="text-xs text-[var(--muted)]">$ANSEM / The Black Bull official-source assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--muted-strong)] sm:flex">
            <span className="pulse-dot" />
            <LockKeyhole size={13} className="text-[var(--primary)]" />
            Official sources only
          </div>
        </div>
      </header>
      <div className="panel-glow mx-auto mt-3 flex min-h-0 w-full max-w-7xl flex-1 overflow-hidden rounded-lg bg-[var(--surface)]">
        <Chat />
      </div>
    </main>
  );
}
