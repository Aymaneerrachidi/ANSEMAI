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
        "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] px-3.5 text-sm font-medium transition-colors disabled:opacity-40",
        variant === "primary" && "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-strong)]",
        variant === "secondary" &&
          "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)] hover:border-[var(--border-glow)] hover:bg-[var(--surface-hover)]",
        variant === "ghost" && "text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]",
        className
      )}
      {...props}
    />
  );
}
