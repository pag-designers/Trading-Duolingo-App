import { TriangleAlert } from "lucide-react";
import { RISK_REMINDER } from "@/lib/copy";
import { cn } from "@/lib/utils";

/** The one-line honesty reminder. Every screen that touches trading shows this (BRIEF §0). */
export function RiskReminder({ className }: { className?: string }) {
  return (
    <p
      role="note"
      data-testid="risk-reminder"
      className={cn(
        "flex items-start gap-2 rounded-2xl border-2 border-reward-press/40 bg-surface-2 px-4 py-3 text-base font-bold text-foreground",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-flame-text" aria-hidden />
      <span>{RISK_REMINDER}</span>
    </p>
  );
}
