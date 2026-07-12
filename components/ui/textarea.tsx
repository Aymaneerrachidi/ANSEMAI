import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-[var(--border-strong)] focus:shadow-[0_0_0_3px_var(--primary-soft)]",
        className
      )}
      {...props}
    />
  );
}
