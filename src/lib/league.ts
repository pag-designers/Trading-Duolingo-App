/** Trader Ranks and the practice-rivals board. Rivals are made up and labelled as such (BRIEF §3). */

export const TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"] as const;
export type Tier = (typeof TIERS)[number];

/** Levels 1–2 Bronze, 3–4 Silver, 5–6 Gold, 7–8 Platinum, 9+ Diamond. */
export function tierForLevel(level: number): Tier {
  return TIERS[Math.min(TIERS.length - 1, Math.max(0, Math.floor((level - 1) / 2)))]!;
}

export const RIVAL_NAMES = [
  "Bold Beaver",
  "Chart Cat",
  "Penny Panda",
  "Sunny Fox",
  "Quick Quokka",
  "Lucky Lynx",
  "Mellow Moose",
  "Candle Crab",
  "Brave Badger",
  "Zippy Zebra",
  "Tidy Turtle",
  "Cosmic Owl",
  "Jolly Otter",
  "Happy Hedgehog",
  "Swift Seal",
  "Calm Koala",
  "Merry Mouse",
  "Gentle Goat",
  "Proud Parrot",
  "Wise Walrus",
] as const;

export interface LeagueRow {
  name: string;
  xp: number;
  isYou: boolean;
  rank: number;
}

/** Small stable hash → number in [0, 1). */
function unit(seed: string): number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/**
 * A board of `size` entries: the learner plus practice rivals whose weekly XP is fixed by the
 * week (same numbers all week, whoever is looking). Rivals never depend on the learner's XP.
 */
export function buildLeague(
  weekKey: string,
  you: { name: string; xp: number },
  size = 10,
): LeagueRow[] {
  const rivals = RIVAL_NAMES.map((name, i) => ({ name, i, order: unit(`${weekKey}:order:${i}`) }))
    .sort((a, b) => a.order - b.order)
    .slice(0, size - 1)
    .map(({ name, i }) => ({
      name,
      xp: 6 + Math.floor(unit(`${weekKey}:xp:${i}`) * 110),
      isYou: false,
    }));
  const rows = [
    ...rivals,
    { name: you.name || "You", xp: Math.max(0, Math.floor(you.xp)), isYou: true },
  ]
    .sort((a, b) => b.xp - a.xp || Number(b.isYou) - Number(a.isYou)) // you win ties
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return rows;
}
