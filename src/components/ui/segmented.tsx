"use client";

import { ToggleGroup } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: ReactNode; ariaLabel?: string }[];
  label: string;
  className?: string;
}

/** A single-choice button row (theme picker, accessory picker …). 48px+ tap targets. */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={label}
      onValueChange={(v) => v && onValueChange(v as T)}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          aria-label={o.ariaLabel}
          className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-surface px-4 font-bold text-foreground transition-colors hover:bg-surface-2 data-[state=on]:border-brand data-[state=on]:bg-brand-soft data-[state=on]:text-brand"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
