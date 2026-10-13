import {
  ChartCandlestick,
  Crown,
  Dumbbell,
  FlaskConical,
  Gift,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { NodeType } from "@/lib/content/schema";

export const NODE_META: Record<NodeType, { label: string; icon: LucideIcon; blurb: string }> = {
  lesson: { label: "Lesson", icon: Star, blurb: "Short slides and quick questions." },
  practice: { label: "Practice", icon: Dumbbell, blurb: "A fast round to lock it in." },
  chart: { label: "Chart challenge", icon: ChartCandlestick, blurb: "Work on a real chart." },
  trade: { label: "Trade challenge", icon: FlaskConical, blurb: "Try it with pretend money." },
  boss: { label: "Boss", icon: Crown, blurb: "The big test at the end of the unit." },
  chest: { label: "Treasure chest", icon: Gift, blurb: "A bonus for your hard work." },
};

/** Horizontal wiggle (in rem) that makes the path wind like a river. */
export const WIGGLE = [0, 2.5, 4, 2.5, 0, -2.5, -4, -2.5] as const;
