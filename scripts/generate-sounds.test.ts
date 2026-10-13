import { describe, expect, it } from "vitest";
import { encodeWav, SAMPLE_RATE, SOUNDS } from "./generate-sounds";

describe("sound generator", () => {
  it("has every sound the brief asks for", () => {
    for (const name of ["correct", "wrong", "levelup", "streak", "cash", "thud", "page"]) {
      expect(SOUNDS).toHaveProperty(name);
    }
  });

  it("produces valid, quiet-enough, non-silent WAVs", () => {
    for (const [name, make] of Object.entries(SOUNDS)) {
      const wav = encodeWav(make());
      expect(wav.toString("ascii", 0, 4), name).toBe("RIFF");
      expect(wav.toString("ascii", 8, 12), name).toBe("WAVE");
      expect(wav.readUInt32LE(24), name).toBe(SAMPLE_RATE);
      expect(wav.length, `${name} size`).toBeLessThan(80 * 1024);
      let peak = 0;
      for (let i = 44; i < wav.length; i += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
      expect(peak, `${name} not silent`).toBeGreaterThan(1000);
      expect(peak, `${name} not clipping`).toBeLessThanOrEqual(32767 * 0.91);
    }
  });

  it("is deterministic", () => {
    expect(encodeWav(SOUNDS.page!()).equals(encodeWav(SOUNDS.page!()))).toBe(true);
  });
});
