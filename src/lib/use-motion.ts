"use client";

import { useReducedMotion } from "framer-motion";
import { useSettings } from "@/store/settings";

/**
 * Should animations be skipped? True when the device asks for reduced motion OR the learner turned on
 * "Reduce motion" in Settings. Use this instead of framer-motion's own hook, which only knows the device.
 */
export function useMotionReduced(): boolean {
  const device = useReducedMotion();
  const inApp = useSettings((s) => s.reducedMotion);
  return !!device || inApp;
}
