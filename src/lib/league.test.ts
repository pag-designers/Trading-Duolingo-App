import { describe, expect, it } from "vitest";
import { buildLeague, RIVAL_NAMES, tierForLevel } from "./league";

describe("tierForLevel", () => {
  it.each([
    [1, "Bronze"],
    [2, "Bronze"],
    [3, "Silver"],
    [5, "Gold"],
    [7, "Platinum"],
    [9, "Diamond"],
    [40, "Diamond"],
    [0, "Bronze"],
  ])("level %i is %s", (level, tier) => expect(tierForLevel(level)).toBe(tier));
});

describe("buildLeague", () => {
  const you = { name: "Ada", xp: 42 };
  it("has 10 rows: you plus nine practice rivals with ranks 1..10", () => {
    const rows = buildLeague("2026-03-09", you);
    expect(rows).toHaveLength(10);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(rows.filter((r) => r.isYou)).toHaveLength(1);
    expect(
      rows
        .filter((r) => !r.isYou)
        .every((r) => (RIVAL_NAMES as readonly string[]).includes(r.name)),
    ).toBe(true);
  });
  it("is sorted by XP, descending", () => {
    const xp = buildLeague("2026-03-09", you).map((r) => r.xp);
    expect(xp).toEqual([...xp].sort((a, b) => b - a));
  });
  it("rivals depend on the week only, never on your XP", () => {
    const strip = (rows: ReturnType<typeof buildLeague>) =>
      rows
        .filter((r) => !r.isYou)
        .map((r) => `${r.name}:${r.xp}`)
        .sort();
    expect(strip(buildLeague("2026-03-09", { name: "Ada", xp: 0 }))).toEqual(
      strip(buildLeague("2026-03-09", { name: "Bo", xp: 500 })),
    );
    expect(strip(buildLeague("2026-03-09", you))).not.toEqual(
      strip(buildLeague("2026-03-16", you)),
    );
  });
  it("you win ties and an empty name becomes 'You'", () => {
    const rows = buildLeague("2026-03-09", { name: "", xp: 0 });
    expect(rows.find((r) => r.isYou)?.name).toBe("You");
    const top = buildLeague("2026-03-09", { name: "Ada", xp: 10_000 });
    expect(top[0]?.isYou).toBe(true);
  });
});
