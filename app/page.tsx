import { LockKeyhole } from "lucide-react";
import { BullLogo } from "@/components/bull-logo";
import { Chat } from "@/components/chat";
import { MarketTicker } from "@/components/market-ticker";
import { SiteFooter } from "@/components/site-footer";
import { SignalRail } from "@/components/signal-rail";
import { SignalRailPanel } from "@/components/signal-rail-panel";

export default function Home() {
  return (
    <main className="app-shell flex h-screen min-h-[640px] flex-col gap-3 p-3 sm:gap-4 sm:p-4">
      <header className="hero-bar mx-auto flex w-full max-w-[1240px] shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3.5">
          <div className="brand-medallion h-11 w-11">
            <BullLogo size={26} />
          </div>
          <div className="leading-tight">
            <h1 className="wordmark text-[22px] text-[var(--foreground)] sm:text-[24px]">
              Ansem<span className="text-[var(--primary)]">AI</span>
            </h1>
            <p className="mt-0.5 hidden text-[11.5px] text-[var(--muted)] sm:block">
              The Black Bull desk · official-source assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <MarketTicker />
          <div className="trust-pill hidden md:inline-flex">
            <LockKeyhole size={13} className="text-[var(--primary)]" />
            Official sources only
          </div>
          <SignalRailPanel />
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1240px] flex-1 gap-3 overflow-hidden sm:gap-4">
        <div className="panel-glow flex min-h-0 flex-1 overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)]">
          <Chat />
        </div>
        <div className="scrollbar hidden min-h-0 w-[300px] shrink-0 overflow-y-auto pr-0.5 lg:block">
          <SignalRail />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
