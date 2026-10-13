"use client";

import { Slider as RadixSlider } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Slider({
  className,
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<typeof RadixSlider.Root>) {
  return (
    <RadixSlider.Root
      className={cn("relative flex h-12 w-full touch-none items-center", className)}
      {...props}
    >
      <RadixSlider.Track className="relative h-3 grow rounded-full bg-surface-2">
        <RadixSlider.Range className="absolute h-full rounded-full bg-brand" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        aria-label={ariaLabel}
        className="block size-7 rounded-full border-4 border-brand bg-surface shadow focus-visible:outline-offset-4"
      />
    </RadixSlider.Root>
  );
}
