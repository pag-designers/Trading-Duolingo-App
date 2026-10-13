import { describe, expect, it } from "vitest";
import { buildBackup } from "./backup";
import { useProgress } from "@/store/progress";

describe("buildBackup", () => {
  it("contains plain data only (no functions) and the app marker", () => {
    useProgress.getState().awardXp(10, "2026-03-10");
    const b = buildBackup(new Date("2026-03-10T12:00:00Z"));
    expect(b.app).toBe("candlo");
    expect(b.exportedAt).toBe("2026-03-10T12:00:00.000Z");
    expect(b.progress.totalXp).toBe(10);
    const json = JSON.stringify(b);
    expect(JSON.parse(json)).toEqual(b); // round-trips: no functions or cycles
    for (const section of [b.profile, b.settings, b.progress]) {
      expect(Object.values(section).some((v) => typeof v === "function")).toBe(false);
    }
  });
});
