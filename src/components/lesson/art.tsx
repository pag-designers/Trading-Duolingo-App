"use client";

import { motion } from "framer-motion";
import { useMotionReduced } from "@/lib/use-motion";
import type { ReactNode } from "react";
import type { ArtKey } from "@/lib/content/lesson-schema";
import { cn } from "@/lib/utils";

/** Small animated SVG pictures for teach slides. Decorative: the slide text carries the meaning. */

const FILL = { transformBox: "fill-box", transformOrigin: "center" } as const;

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className="h-full w-auto overflow-visible"
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

const Coin = ({ cy, delay = 0, live }: { cy: number; delay?: number; live: boolean }) => (
  <motion.g
    initial={live ? { y: -50, opacity: 0 } : false}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay, type: "spring", stiffness: 300, damping: 18 }}
  >
    <ellipse cx="80" cy={cy + 6} rx="34" ry="11" fill="var(--reward-press)" />
    <rect x="46" y={cy - 2} width="68" height="8" fill="var(--reward)" />
    <ellipse
      cx="80"
      cy={cy - 2}
      rx="34"
      ry="11"
      fill="var(--reward)"
      stroke="var(--reward-press)"
      strokeWidth="2"
    />
    <text
      x="80"
      y={cy + 2}
      textAnchor="middle"
      fontSize="11"
      fontWeight="800"
      fill="var(--reward-fg)"
    >
      $
    </text>
  </motion.g>
);

function Coins({ live }: { live: boolean }) {
  return (
    <Frame>
      <Coin cy={96} live={live} />
      <Coin cy={82} live={live} delay={0.15} />
      <Coin cy={68} live={live} delay={0.3} />
    </Frame>
  );
}

function Shop() {
  return (
    <Frame>
      <rect
        x="30"
        y="52"
        width="100"
        height="56"
        rx="6"
        fill="var(--surface-2)"
        stroke="var(--border-strong)"
        strokeWidth="3"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${30 + i * 20} 28 h20 v26 a10 10 0 0 1 -20 0 z`}
          fill={i % 2 ? "var(--surface)" : "var(--brand)"}
          stroke="var(--border-strong)"
          strokeWidth="2"
        />
      ))}
      <rect
        x="64"
        y="72"
        width="32"
        height="36"
        rx="4"
        fill="var(--brand-soft)"
        stroke="var(--border-strong)"
        strokeWidth="2"
      />
      <circle cx="90" cy="92" r="2.5" fill="var(--brand)" />
      <rect x="40" y="66" width="18" height="14" rx="2" fill="var(--reward)" />
      <rect x="102" y="66" width="18" height="14" rx="2" fill="var(--gain)" />
    </Frame>
  );
}

function Building() {
  return (
    <Frame>
      <rect x="44" y="18" width="72" height="92" rx="6" fill="var(--brand)" />
      <rect x="44" y="104" width="72" height="6" fill="var(--brand-press)" />
      {[0, 1, 2, 3].flatMap((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}${c}`}
            x={54 + c * 21}
            y={28 + r * 17}
            width="13"
            height="10"
            rx="2"
            fill={(r + c) % 3 === 0 ? "var(--reward)" : "var(--brand-soft)"}
          />
        )),
      )}
      <rect x="72" y="88" width="16" height="22" rx="3" fill="var(--brand-press)" />
    </Frame>
  );
}

function Pie({ live }: { live: boolean }) {
  return (
    <Frame>
      <ellipse cx="80" cy="106" rx="42" ry="7" fill="var(--foreground)" opacity="0.1" />
      <circle
        cx="80"
        cy="60"
        r="42"
        fill="var(--reward)"
        stroke="var(--reward-press)"
        strokeWidth="3"
      />
      {[0, 60, 120, 180, 240].map((a) => (
        <line
          key={a}
          x1="80"
          y1="60"
          x2={80 + 42 * Math.cos((a * Math.PI) / 180)}
          y2={60 + 42 * Math.sin((a * Math.PI) / 180)}
          stroke="var(--reward-press)"
          strokeWidth="2"
        />
      ))}
      <motion.path
        d="M80 60 L122 60 A42 42 0 0 1 101 96.4 Z"
        fill="var(--flame)"
        stroke="var(--reward-press)"
        strokeWidth="3"
        style={FILL}
        animate={live ? { x: [0, 10, 0], y: [0, 4, 0] } : undefined}
        transition={live ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
    </Frame>
  );
}

function Market() {
  return (
    <Frame>
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${i * 62}, 0)`}>
          <rect
            x="22"
            y="62"
            width="52"
            height="44"
            rx="4"
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
            strokeWidth="2"
          />
          {[0, 1, 2].map((s) => (
            <path
              key={s}
              d={`M${22 + s * 17.3} 36 h17.3 v22 a8.6 8.6 0 0 1 -17.3 0 z`}
              fill={(s + i) % 2 ? "var(--surface)" : "var(--loss)"}
              stroke="var(--border-strong)"
              strokeWidth="2"
            />
          ))}
          <circle cx="38" cy="74" r="6" fill={i ? "var(--gain)" : "var(--reward)"} />
          <circle cx="52" cy="74" r="6" fill={i ? "var(--reward)" : "var(--flame)"} />
          <circle cx="45" cy="86" r="6" fill={i ? "var(--flame)" : "var(--gain)"} />
        </g>
      ))}
    </Frame>
  );
}

function Tag({ live }: { live: boolean }) {
  return (
    <Frame>
      <motion.g
        style={FILL}
        animate={live ? { rotate: [-6, 6, -6] } : undefined}
        transition={live ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <path
          d="M54 36 h52 a8 8 0 0 1 8 8 v40 a8 8 0 0 1 -8 8 h-52 l-20 -28 z"
          fill="var(--reward)"
          stroke="var(--reward-press)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle
          cx="52"
          cy="64"
          r="5"
          fill="var(--background)"
          stroke="var(--reward-press)"
          strokeWidth="2"
        />
        <text
          x="84"
          y="76"
          textAnchor="middle"
          fontSize="34"
          fontWeight="900"
          fill="var(--reward-fg)"
        >
          $5
        </text>
      </motion.g>
    </Frame>
  );
}

function Bars({ up, live }: { up: boolean; live: boolean }) {
  const color = up ? "var(--gain)" : "var(--loss)";
  const heights = up ? [28, 44, 62, 84] : [84, 62, 44, 28];
  return (
    <Frame>
      {heights.map((h, i) => (
        <motion.rect
          key={i}
          x={30 + i * 25}
          width="18"
          rx="4"
          fill={color}
          initial={live ? { height: 0, y: 104 } : false}
          animate={{ height: h, y: 104 - h }}
          transition={{ delay: i * 0.12, type: "spring", stiffness: 200, damping: 16 }}
        />
      ))}
      <path
        d={up ? "M30 50 L70 34 L100 22 L132 10" : "M30 10 L70 26 L100 40 L132 54"}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d={up ? "M122 8 L134 8 L134 20" : "M122 56 L134 56 L134 44"}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </Frame>
  );
}

function Ticker({ live }: { live: boolean }) {
  return (
    <Frame>
      <clipPath id="tk-clip">
        <rect x="14" y="36" width="132" height="48" rx="10" />
      </clipPath>
      <rect x="14" y="36" width="132" height="48" rx="10" fill="var(--foreground)" />
      <g clipPath="url(#tk-clip)">
        <motion.g
          animate={live ? { x: [0, -110] } : undefined}
          transition={live ? { duration: 6, repeat: Infinity, ease: "linear" } : undefined}
        >
          <text
            x="24"
            y="68"
            fontSize="20"
            fontWeight="800"
            fontFamily="var(--font-mono)"
            fill="var(--gain)"
          >
            AAPL ▲ TSLA ▼ SPY ▲ NVDA ▲ QQQ ▼ AAPL ▲
          </text>
        </motion.g>
      </g>
      <rect
        x="14"
        y="36"
        width="132"
        height="48"
        rx="10"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="3"
      />
    </Frame>
  );
}

function Animal({ bull, live }: { bull: boolean; live: boolean }) {
  const color = bull ? "var(--gain)" : "var(--loss)";
  const press = bull ? "var(--gain-press)" : "var(--loss-press)";
  return (
    <Frame>
      <motion.g
        style={FILL}
        animate={live ? { y: [0, -4, 0] } : undefined}
        transition={live ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        {bull ? (
          <>
            <path
              d="M44 44 C28 40 22 24 30 14 C34 28 44 32 54 34 Z"
              fill="var(--surface)"
              stroke="var(--border-strong)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M116 44 C132 40 138 24 130 14 C126 28 116 32 106 34 Z"
              fill="var(--surface)"
              stroke="var(--border-strong)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <circle cx="46" cy="34" r="12" fill={press} />
            <circle cx="114" cy="34" r="12" fill={press} />
          </>
        )}
        <ellipse cx="80" cy="66" rx="40" ry="38" fill={color} stroke={press} strokeWidth="3" />
        <ellipse cx="80" cy="82" rx="22" ry="15" fill="var(--surface)" opacity="0.9" />
        <circle cx="70" cy="82" r="3.5" fill="var(--foreground)" />
        <circle cx="90" cy="82" r="3.5" fill="var(--foreground)" />
        <circle cx="64" cy="56" r="5" fill="var(--foreground)" />
        <circle cx="96" cy="56" r="5" fill="var(--foreground)" />
        {bull && (
          <circle cx="80" cy="96" r="5" fill="none" stroke="var(--reward)" strokeWidth="2.5" />
        )}
      </motion.g>
    </Frame>
  );
}

const CANDLES: { x: number; o: number; c: number; h: number; l: number }[] = [
  { x: 24, o: 82, c: 70, h: 62, l: 90 },
  { x: 48, o: 70, c: 76, h: 66, l: 84 },
  { x: 72, o: 76, c: 56, h: 48, l: 82 },
  { x: 96, o: 56, c: 62, h: 50, l: 68 },
  { x: 120, o: 62, c: 36, h: 28, l: 66 },
];

function Candles({ live }: { live: boolean }) {
  return (
    <Frame>
      {CANDLES.map((k, i) => {
        const up = k.c < k.o; // lower y = higher price
        const color = up ? "var(--gain)" : "var(--loss)";
        return (
          <motion.g
            key={k.x}
            initial={live ? { y: -70, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.14, type: "spring", stiffness: 220, damping: 14 }}
          >
            <line
              x1={k.x + 7}
              x2={k.x + 7}
              y1={k.h}
              y2={k.l}
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <rect
              x={k.x}
              y={Math.min(k.o, k.c)}
              width="14"
              height={Math.abs(k.o - k.c)}
              rx="3"
              fill={color}
            />
          </motion.g>
        );
      })}
    </Frame>
  );
}

function Index({ live }: { live: boolean }) {
  return (
    <Frame>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.rect
          key={i}
          x={26 + i * 23}
          width="16"
          rx="3"
          fill={i === 4 ? "var(--brand)" : "var(--brand-soft)"}
          stroke="var(--brand)"
          strokeWidth="2"
          initial={live ? { height: 0, y: 100 } : false}
          animate={{ height: 20 + i * 12, y: 100 - (20 + i * 12) }}
          transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 16 }}
        />
      ))}
      <path
        d="M26 74 L49 62 L72 66 L95 44 L118 30"
        fill="none"
        stroke="var(--reward)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  );
}

function Speech({ live }: { live: boolean }) {
  return (
    <Frame>
      <motion.g
        style={FILL}
        animate={live ? { scale: [1, 1.05, 1] } : undefined}
        transition={live ? { duration: 2.4, repeat: Infinity } : undefined}
      >
        <path
          d="M24 22 h72 a12 12 0 0 1 12 12 v26 a12 12 0 0 1 -12 12 h-40 l-18 16 v-16 h-14 a12 12 0 0 1 -12 -12 v-26 a12 12 0 0 1 12 -12 z"
          fill="var(--brand)"
        />
        <text
          x="66"
          y="62"
          textAnchor="middle"
          fontSize="30"
          fontWeight="900"
          fill="var(--brand-fg)"
        >
          IPO
        </text>
      </motion.g>
      <g>
        <circle
          cx="122"
          cy="82"
          r="22"
          fill="var(--reward)"
          stroke="var(--reward-press)"
          strokeWidth="3"
        />
        <text
          x="122"
          y="92"
          textAnchor="middle"
          fontSize="28"
          fontWeight="900"
          fill="var(--reward-fg)"
        >
          ?
        </text>
      </g>
    </Frame>
  );
}

export function ChestArt({ open = false }: { open?: boolean }) {
  const reduce = useMotionReduced();
  return (
    <Frame>
      <ellipse cx="80" cy="108" rx="48" ry="7" fill="var(--foreground)" opacity="0.12" />
      <rect
        x="32"
        y="60"
        width="96"
        height="46"
        rx="8"
        fill="var(--flame)"
        stroke="var(--flame-text)"
        strokeWidth="3"
      />
      <rect x="32" y="74" width="96" height="8" fill="var(--flame-text)" opacity="0.5" />
      {open && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.circle
              key={i}
              cx={52 + i * 14}
              cy="56"
              r="7"
              fill="var(--reward)"
              stroke="var(--reward-press)"
              strokeWidth="2"
              initial={reduce ? false : { y: 10, opacity: 0 }}
              animate={{ y: -14 - (i % 2) * 10, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 220, damping: 12 }}
            />
          ))}
        </g>
      )}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }}
        animate={{ rotate: open ? -62 : 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 14 }}
      >
        <path
          d="M32 60 a48 28 0 0 1 96 0 z"
          fill="var(--flame)"
          stroke="var(--flame-text)"
          strokeWidth="3"
        />
        <rect x="32" y="52" width="96" height="8" fill="var(--flame-text)" opacity="0.5" />
      </motion.g>
      <rect
        x="72"
        y="66"
        width="16"
        height="20"
        rx="4"
        fill="var(--reward)"
        stroke="var(--reward-press)"
        strokeWidth="2"
      />
      <circle cx="80" cy="76" r="3" fill="var(--reward-fg)" />
    </Frame>
  );
}

/** Pick the picture for a slide. Animations are skipped when motion is reduced. */
export function Art({ name, className }: { name: ArtKey; className?: string }) {
  const reduce = useMotionReduced();
  const live = !reduce;
  const picture: Record<ArtKey, ReactNode> = {
    coins: <Coins live={live} />,
    shop: <Shop />,
    building: <Building />,
    pie: <Pie live={live} />,
    market: <Market />,
    tag: <Tag live={live} />,
    profit: <Bars up live={live} />,
    loss: <Bars up={false} live={live} />,
    ticker: <Ticker live={live} />,
    bull: <Animal bull live={live} />,
    bear: <Animal bull={false} live={live} />,
    candles: <Candles live={live} />,
    index: <Index live={live} />,
    speech: <Speech live={live} />,
    chest: <ChestArt />,
  };
  return (
    <div className={cn("flex h-36 items-center justify-center sm:h-44", className)} data-art={name}>
      {picture[name]}
    </div>
  );
}
