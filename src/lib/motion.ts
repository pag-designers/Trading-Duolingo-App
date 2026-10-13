import type { Transition } from "framer-motion";

/** Shared motion tokens. Animate transform/opacity only so phones stay at 60 fps. */
export const spring = {
  pop: { type: "spring", stiffness: 520, damping: 24, mass: 0.7 } satisfies Transition,
};

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
};
