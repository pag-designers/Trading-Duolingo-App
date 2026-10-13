import { describe, expect, it } from "vitest";
import { contrastRatio, cssRule, readTokens } from "./contrast";

describe("contrastRatio", () => {
  it("is 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
  it("is 1 for identical colors", () => {
    expect(contrastRatio("#5b3df5", "#5b3df5")).toBeCloseTo(1, 5);
  });
  it("matches a known reference pair (#767676 on white ≈ 4.54)", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 1);
  });
  it("accepts 3-digit hex", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 1);
  });
  it("rejects garbage", () => {
    expect(() => contrastRatio("red", "#fff")).toThrow();
  });
});

describe("css token reading", () => {
  const css = ":root { --a: #111111; --b: #222; }\n.dark { --a: #eeeeee; }";
  it("reads tokens per rule", () => {
    expect(readTokens(cssRule(css, ":root"))).toEqual({ a: "#111111", b: "#222" });
    expect(readTokens(cssRule(css, ".dark"))).toEqual({ a: "#eeeeee" });
  });
});
