"use client";

import { Switch as RadixSwitch } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: ComponentProps<typeof RadixSwitch.Root>) {
  return (
    <RadixSwitch.Root
      className={cn(
        "relative h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-border-strong bg-surface-2 transition-colors data-[state=checked]:border-brand data-[state=checked]:bg-brand",
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="block size-6 translate-x-0.5 rounded-full bg-surface shadow transition-transform data-[state=checked]:translate-x-[1.5rem] data-[state=checked]:bg-brand-fg" />
    </RadixSwitch.Root>
  );
}
