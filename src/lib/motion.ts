import type { Transition, Variants } from "framer-motion";

/** Shared motion tokens. Animate transform/opacity only so phones stay at 60 fps. */
export const spring = {
  pop: { type: "spring", stiffness: 520, damping: 24, mass: 0.7 } satisfies Transition,
  soft: { type: "spring", stiffness: 260, damping: 26 } satisfies Transition,
  bouncy: { type: "spring", stiffness: 380, damping: 14 } satisfies Transition,
};

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  pop: [0.34, 1.56, 0.64, 1] as const,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: ease.out } },
};

export const stagger = (gap = 0.05): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap } },
});

/** Gentle horizontal shake for a wrong answer (small, never violent). */
export const gentleShake = { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4 } };
