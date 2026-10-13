"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { FOCUS_MAX } from "@/lib/lesson/xp";
import { cn } from "@/lib/utils";

/**
 * The Focus meter replaces hearts. It only ever fills (right answers) — a mistake never drains it —
 * and when it is full it pops and starts again. Purely cosmetic: it never blocks anything.
 */
export function FocusMeter({ value, justFilled }: { value: number; justFilled: boolean }) {
  return (
    <div
      role="meter"
      aria-label="Focus"
      aria-valuemin={0}
      aria-valuemax={FOCUS_MAX}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${FOCUS_MAX}`}
      data-testid="focus-meter"
      className="flex items-center gap-1.5"
    >
      <Sparkles className={cn("size-6", justFilled ? "text-reward" : "text-brand")} aria-hidden />
      <div className="flex gap-1">
        {Array.from({ length: FOCUS_MAX }, (_, i) => (
          <motion.span
            key={i}
            animate={{ scale: justFilled ? [1, 1.4, 1] : 1 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className={cn(
              "h-3 w-5 rounded-full",
              i < value || justFilled ? "bg-reward" : "bg-surface-2",
            )}
          />
        ))}
      </div>
    </div>
  );
}
