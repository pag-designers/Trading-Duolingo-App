import { describe, expect, it } from "vitest";
import { shouldPlay, SOUND_NAMES } from "./sound";

describe("shouldPlay", () => {
  it("is silent when sounds are off", () => {
    expect(shouldPlay({ soundOn: false, volume: 80 })).toBe(false);
  });
  it("is silent at zero volume", () => {
    expect(shouldPlay({ soundOn: true, volume: 0 })).toBe(false);
  });
  it("plays otherwise", () => {
    expect(shouldPlay({ soundOn: true, volume: 40 })).toBe(true);
  });
  it("covers every sound the brief names", () => {
    for (const n of ["correct", "wrong", "levelup", "streak", "cash", "thud", "page"]) {
      expect(SOUND_NAMES).toContain(n);
    }
  });
});
