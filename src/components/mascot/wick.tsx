"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Accessory } from "@/store/profile";

export const MOODS = ["happy", "cheer", "think", "oops", "sleepy", "wave"] as const;
export type Mood = (typeof MOODS)[number];

interface WickProps {
  mood?: Mood;
  accessory?: Accessory;
  /** Pixel width; height follows the 5:6 aspect ratio. */
  size?: number;
  /** Idle animation (bobbing, blinking). Turned off automatically for reduced motion. */
  animate?: boolean;
  /** Name used in the accessible label. */
  name?: string;
  /** Hide from assistive tech when Wick is purely decorative. */
  decorative?: boolean;
  className?: string;
}

const fillBox = { transformBox: "fill-box", transformOrigin: "center" } as const;

/**
 * Wick — Candlo's mascot: a small candlestick creature. The body is the candle body (green for an
 * "up candle", soft coral for "oops"); the thin lines top and bottom are the wicks.
 * See DECISIONS D-002.
 */
export function Wick({
  mood = "happy",
  accessory = "none",
  size = 160,
  animate = true,
  name = "Wick",
  decorative = false,
  className,
}: WickProps) {
  const reduce = useReducedMotion();
  const live = animate && !reduce;
  const down = mood === "oops";
  const body = down ? "var(--loss)" : "var(--gain)";
  const edge = down ? "var(--loss-press)" : "var(--gain-press)";
  const sleepy = mood === "sleepy";
  const squint = mood === "cheer";

  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={(size * 6) / 5}
      className={cn("inline-block shrink-0 overflow-visible", className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `${name}, the Candlo mascot, feeling ${mood}`}
      aria-hidden={decorative ? true : undefined}
    >
      {/* Ground shadow */}
      <ellipse cx="100" cy="226" rx="46" ry="7" fill="var(--foreground)" opacity="0.12" />

      <motion.g
        style={fillBox}
        animate={live ? { y: [0, -5, 0] } : undefined}
        transition={live ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        {/* Top wick = antenna */}
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
          animate={live ? { rotate: [-5, 5, -5] } : undefined}
          transition={live ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" } : undefined}
        >
          <line
            x1="100"
            y1="42"
            x2="100"
            y2="14"
            stroke={edge}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle
            cx="100"
            cy="11"
            r="8"
            fill="var(--reward)"
            stroke="var(--reward-press)"
            strokeWidth="3"
          />
        </motion.g>

        {/* Bottom wick + feet */}
        <line
          x1="100"
          y1="182"
          x2="100"
          y2="210"
          stroke={edge}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <ellipse cx="84" cy="214" rx="15" ry="8" fill={edge} />
        <ellipse cx="116" cy="214" rx="15" ry="8" fill={edge} />

        {/* Arms */}
        <motion.ellipse
          cx="46"
          cy="118"
          rx="11"
          ry="16"
          fill={edge}
          style={{ transformBox: "fill-box", transformOrigin: "80% 20%" }}
          animate={
            mood === "wave" || mood === "cheer"
              ? live
                ? { rotate: [0, -35, 0, -35, 0] }
                : { rotate: -35 }
              : undefined
          }
          transition={{ duration: 1.1, repeat: live ? Infinity : 0, repeatDelay: 0.8 }}
        />
        <ellipse cx="154" cy="118" rx="11" ry="16" fill={edge} />

        {/* Body: darker edge underneath gives the 3D "button" feel */}
        <rect x="44" y="46" width="112" height="142" rx="40" fill={edge} />
        <rect x="44" y="42" width="112" height="140" rx="40" fill={body} />
        <rect x="58" y="54" width="14" height="52" rx="7" fill="#fff" opacity="0.28" />

        {/* Accessories that sit behind the face */}
        {accessory === "beanie" && (
          <g>
            <path d="M52 78 C52 36 148 36 148 78 Z" fill="var(--brand)" />
            <rect x="48" y="72" width="104" height="14" rx="7" fill="var(--brand-press)" />
            <circle cx="100" cy="38" r="9" fill="var(--reward)" />
          </g>
        )}
        {accessory === "headband" && (
          <rect x="44" y="70" width="112" height="14" fill="var(--flame)" opacity="0.95" />
        )}

        {/* Cheeks */}
        <circle cx="68" cy="122" r="9" fill="#fff" opacity={down ? 0 : 0.3} />
        <circle cx="132" cy="122" r="9" fill="#fff" opacity={down ? 0 : 0.3} />

        {/* Eyes */}
        <motion.g
          style={fillBox}
          animate={live && !sleepy && !squint ? { scaleY: [1, 1, 0.1, 1, 1] } : undefined}
          transition={
            live ? { duration: 4.5, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1] } : undefined
          }
        >
          {sleepy || squint ? (
            <g stroke="#1f1b3a" strokeWidth="5" strokeLinecap="round" fill="none">
              <path d={squint ? "M72 104 Q80 94 88 104" : "M72 102 Q80 110 88 102"} />
              <path d={squint ? "M112 104 Q120 94 128 104" : "M112 102 Q120 110 128 102"} />
            </g>
          ) : (
            <g>
              <ellipse cx="80" cy="102" rx="13" ry="16" fill="#fff" />
              <ellipse cx="120" cy="102" rx="13" ry="16" fill="#fff" />
              <circle
                cx={mood === "think" ? 84 : 81}
                cy={mood === "think" ? 96 : 104}
                r="7"
                fill="#1f1b3a"
              />
              <circle
                cx={mood === "think" ? 124 : 121}
                cy={mood === "think" ? 96 : 104}
                r="7"
                fill="#1f1b3a"
              />
              <circle
                cx={mood === "think" ? 86 : 83}
                cy={mood === "think" ? 93 : 101}
                r="2.4"
                fill="#fff"
              />
              <circle
                cx={mood === "think" ? 126 : 123}
                cy={mood === "think" ? 93 : 101}
                r="2.4"
                fill="#fff"
              />
            </g>
          )}
        </motion.g>

        {/* Brows */}
        {down && (
          <g stroke="#1f1b3a" strokeWidth="4.5" strokeLinecap="round" fill="none">
            <path d="M68 80 L90 86" />
            <path d="M132 80 L110 86" />
          </g>
        )}
        {mood === "think" && (
          <path
            d="M108 80 Q120 72 132 80"
            stroke="#1f1b3a"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Mouth */}
        <g stroke="#1f1b3a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          {mood === "happy" || mood === "wave" ? (
            <path d="M84 138 Q100 154 116 138" fill="none" />
          ) : mood === "cheer" ? (
            <path d="M82 134 Q100 168 118 134 Z" fill="#fff" />
          ) : mood === "think" ? (
            <path d="M90 144 Q100 140 110 146" fill="none" />
          ) : mood === "oops" ? (
            <path d="M86 148 Q93 140 100 148 Q107 156 114 148" fill="none" />
          ) : (
            <ellipse cx="100" cy="144" rx="6" ry="4" fill="#1f1b3a" />
          )}
        </g>

        {/* Accessories that sit on top of the face */}
        {accessory === "glasses" && (
          <g fill="none" stroke="#1f1b3a" strokeWidth="4">
            <circle cx="80" cy="102" r="19" />
            <circle cx="120" cy="102" r="19" />
            <path d="M99 102 L101 102" />
          </g>
        )}

        {sleepy && (
          <text
            x="150"
            y="60"
            fontSize="26"
            fontWeight="800"
            fill="var(--muted)"
            fontFamily="var(--font-sans)"
          >
            z
          </text>
        )}
      </motion.g>
    </svg>
  );
}
