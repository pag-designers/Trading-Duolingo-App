import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-14 w-full rounded-2xl border-2 border-border bg-surface px-4 text-lg font-semibold text-foreground placeholder:text-muted/70 focus:border-brand",
        className,
      )}
      {...props}
    />
  );
}
