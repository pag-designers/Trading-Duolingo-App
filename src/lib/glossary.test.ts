import { describe, expect, it } from "vitest";
import { buildMatcher } from "./glossary";
import type { GlossaryTerm } from "./content/lesson-schema";

const term = (id: string, name: string, aliases: string[] = []): GlossaryTerm => ({
  id,
  term: name,
  aliases,
  definition: "d",
  analogy: "a",
  example: "e",
  taughtIn: "u1-stock",
});

const m = buildMatcher([
  term("stock", "stock"),
  term("stock-market", "stock market"),
  term("share", "share"),
  term("eps", "EPS"),
  term("sp500", "S&P 500", ["S&P"]),
  term("pe", "P/E"),
]);

describe("buildMatcher", () => {
  it("finds terms and keeps the original text", () => {
    const parts = m.tokenize("A stock is a tiny piece.");
    expect(parts.map((p) => p.text).join("")).toBe("A stock is a tiny piece.");
    expect(parts.find((p) => p.termId)).toMatchObject({ text: "stock", termId: "stock" });
  });
  it("prefers the longest name", () => {
    expect(m.termsIn("The stock market is a place.")).toEqual(["stock-market"]);
  });
  it("matches plurals and any case for normal words", () => {
    expect(m.termsIn("Many Stocks and shares")).toEqual(["stock", "share"]);
  });
  it("matches ALL-CAPS names exactly and only as whole words", () => {
    expect(m.termsIn("EPS means earnings.")).toEqual(["eps"]);
    expect(m.termsIn("The eps is low")).toEqual([]);
    expect(m.termsIn("DEEPS is not a term")).toEqual([]);
  });
  it("handles names with symbols and aliases", () => {
    expect(m.termsIn("The S&P 500 and the S&P are the same. P/E is a ratio.")).toEqual([
      "sp500",
      "pe",
    ]);
  });
  it("does not match inside bigger words", () => {
    expect(m.termsIn("Stockings are warm")).toEqual([]);
  });
  it("returns each term once, in order of appearance", () => {
    expect(m.termsIn("share, stock, share")).toEqual(["share", "stock"]);
  });
});
