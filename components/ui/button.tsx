import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={cn(
        "btn-shimmer inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-all disabled:opacity-40",
        variant === "primary" &&
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_0_0_1px_rgba(33,232,120,0.4),0_8px_20px_-8px_rgba(33,232,120,0.65)] hover:bg-[var(--glow)]",
        variant === "secondary" &&
          "border border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--surface-raised)]",
        variant === "ghost" && "text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]",
        className
      )}
      {...props}
    />
  );
}
