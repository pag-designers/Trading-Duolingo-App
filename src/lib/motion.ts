import type { Transition } from "framer-motion";

/** Shared motion tokens. Animate transform/opacity only so phones stay at 60 fps. */
export const spring = {
  pop: { type: "spring", stiffness: 520, damping: 24, mass: 0.7 } satisfies Transition,
};

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
};

/** Gentle horizontal shake for a wrong answer (small, never violent). */
export const gentleShake = { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4 } };
