"use client";

import { animate } from "framer-motion";
import { useMotionReduced } from "@/lib/use-motion";
import { useEffect, useState } from "react";

/** A number that rolls up to its value (or just shows it with reduced motion). */
export function CountUp({
  to,
  duration = 0.9,
  delay = 0,
}: {
  to: number;
  duration?: number;
  delay?: number;
}) {
  const reduce = useMotionReduced();
  const [value, setValue] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, duration, delay, reduce]);
  return <span className="tabular">{value}</span>;
}
