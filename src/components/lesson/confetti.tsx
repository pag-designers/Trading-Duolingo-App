"use client";

import { motion } from "framer-motion";
import { useMotionReduced } from "@/lib/use-motion";
import { useMemo } from "react";
import { seededRng } from "@/lib/lesson/pool";

const COLORS = [
  "var(--brand)",
  "var(--reward)",
  "var(--gain)",
  "var(--loss)",
  "var(--flame)",
  "var(--info)",
];

/**
 * A burst of confetti. Transform and opacity only, so it stays smooth on phones. With reduced motion
 * it shows nothing (the sound and the text still celebrate).
 */
export function Confetti({ count = 28, seed = 1 }: { count?: number; seed?: number }) {
  const reduce = useMotionReduced();
  const pieces = useMemo(() => {
    const rng = seededRng(seed);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length]!,
      x: (rng() - 0.5) * 420,
      up: 120 + rng() * 160,
      fall: 120 + rng() * 140,
      rotate: (rng() - 0.5) * 720,
      delay: rng() * 0.12,
      size: 8 + rng() * 6,
      round: rng() > 0.5,
    }));
  }, [count, seed]);

  if (reduce) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
      data-testid="confetti"
    >
      <div className="absolute top-1/3 left-1/2">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute block"
            style={{
              width: p.size,
              height: p.round ? p.size : p.size * 0.5,
              background: p.color,
              borderRadius: p.round ? "50%" : 2,
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: p.x, y: [0, -p.up, p.fall], opacity: [1, 1, 0], rotate: p.rotate }}
            transition={{ duration: 1.5, delay: p.delay, ease: "easeOut", times: [0, 0.35, 1] }}
          />
        ))}
      </div>
    </div>
  );
}
