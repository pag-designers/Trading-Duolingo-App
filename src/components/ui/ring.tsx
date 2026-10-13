import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RingProps {
  /** 0..1 */
  fraction: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
  className?: string;
  color?: string;
}

/** Circular progress (daily goal). Exposes its value to assistive tech. */
export function Ring({
  fraction,
  size = 72,
  stroke = 9,
  label,
  children,
  className,
  color = "var(--reward)",
}: RingProps) {
  const f = Math.min(1, Math.max(0, fraction));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(f * 100)}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - f)}
          style={{ transition: "stroke-dashoffset 600ms var(--ease-out)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
