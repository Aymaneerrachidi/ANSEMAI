"use client";

import { useState } from "react";
import { Activity, X } from "lucide-react";
import { SignalRail } from "@/components/signal-rail";

export function SignalRailPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show live signal panel"
        className="flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 text-xs font-medium text-[var(--muted-strong)] transition-colors hover:border-[var(--border-glow)] hover:text-[var(--primary)]"
      >
        <Activity size={15} className="text-[var(--primary)]" />
        <span className="hidden sm:inline">Live signal</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="rail-sheet-enter scrollbar max-h-[82vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border border-[var(--border-strong)] bg-[var(--bg)] p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border-strong)]" />
            <div className="mb-3 flex items-center justify-between">
              <span className="wordmark text-lg text-[var(--foreground)]">Live signal</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close live signal panel"
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X size={18} />
              </button>
            </div>
            <SignalRail />
          </div>
        </div>
      ) : null}
    </div>
  );
}
