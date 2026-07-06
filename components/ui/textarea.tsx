import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-md border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(33,232,120,0.15)]",
        className
      )}
      {...props}
    />
  );
}
