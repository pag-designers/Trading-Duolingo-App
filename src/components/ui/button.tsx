"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes } from "react";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** Duolingo-style "pressable" button: a solid edge underneath that squashes on press. */
export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 rounded-2xl font-extrabold uppercase tracking-wide transition-[transform,box-shadow,background-color] duration-100 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-fg shadow-[0_4px_0_0_var(--brand-press)] hover:brightness-110",
        secondary:
          "border-2 border-border bg-surface text-brand shadow-[0_4px_0_0_var(--border-strong)] hover:bg-surface-2",
        reward:
          "bg-reward text-reward-fg shadow-[0_4px_0_0_var(--reward-press)] hover:brightness-105",
        ghost: "text-brand shadow-none hover:bg-brand-soft active:translate-y-0",
      },
      size: {
        md: "min-h-12 px-5 text-sm",
        lg: "min-h-14 px-7 text-base",
        icon: "size-12",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Play the small tap sound (respects the sound settings). */
  tapSound?: boolean;
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild,
  tapSound = true,
  onClick,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, block }), className)}
      type={asChild ? undefined : type}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (tapSound) playSound("tap");
        onClick?.(e);
      }}
      {...props}
    />
  );
}
