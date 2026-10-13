import { describe, expect, it } from "vitest";
import { buildMatcher } from "./glossary";
import { countSyllables, scoreSentence, splitSentences, tooHard, wordsOf } from "./readability";

describe("countSyllables", () => {
  it.each([
    ["cat", 1],
    ["money", 2],
    ["market", 2],
    ["people", 2],
    ["make", 1],
    ["makes", 1],
    ["jumped", 1],
    ["wanted", 2],
    ["company", 3],
    ["tomorrow", 3],
    ["business", 2],
    ["beautiful", 3],
    ["every", 2],
    ["whole", 1],
    ["rule", 1],
    ["table", 2],
    ["little", 2],
    ["simple", 2],
  ])("%s has %i syllable(s)", (w, n) => {
    expect(countSyllables(w)).toBe(n);
  });
  it("treats numbers and symbols as one syllable", () => {
    expect(countSyllables("500")).toBe(1);
    expect(countSyllables("$10")).toBe(1);
  });
});

describe("sentences and words", () => {
  it("splits on sentence ends", () => {
    expect(splitSentences("One. Two! Three? Four")).toEqual(["One.", "Two!", "Three?", "Four"]);
  });
  it("keeps numbers and money as words", () => {
    expect(wordsOf("It costs $10 or 5% more.")).toEqual(["It", "costs", "$10", "or", "5%", "more"]);
  });
});

describe("short labels (fewer than 5 words)", () => {
  it("pass when no word is long, even though the grade formula would flag them", () => {
    for (const label of [
      "Apple",
      "Two animals",
      "Mixed practice",
      "Treasure chest",
      "Never move",
      "First order, market open",
    ]) {
      expect(scoreSentence(label).grade, label).toBeLessThanOrEqual(2);
    }
  });
  it("fail when a word has more than 3 syllables", () => {
    expect(scoreSentence("Corporation").grade).toBeGreaterThan(2);
    expect(scoreSentence("Unbelievable luck").grade).toBeGreaterThan(2);
  });
  it("still exempt defined terms", () => {
    const matcher = buildMatcher([
      {
        id: "ceo",
        term: "chief executive officer",
        aliases: [],
        definition: "d",
        analogy: "a",
        example: "e",
        taughtIn: "u1-shorttalk",
      },
    ]);
    expect(scoreSentence("Chief executive officer", matcher).grade).toBeLessThanOrEqual(2);
  });
});

describe("scoreSentence", () => {
  it("scores a simple sentence at or below grade 2", () => {
    expect(scoreSentence("The cat sat on the mat.").grade).toBeLessThan(0);
    expect(scoreSentence("Money is what we use to buy things.").grade).toBeLessThanOrEqual(2);
  });
  it("flags a hard sentence", () => {
    const s = scoreSentence("Corporations distribute ownership certificates to investors.");
    expect(s.grade).toBeGreaterThan(8);
  });
  it("treats glossary terms as short defined words", () => {
    const matcher = buildMatcher([
      {
        id: "company",
        term: "company",
        aliases: [],
        definition: "d",
        analogy: "a",
        example: "e",
        taughtIn: "u1-company",
      },
    ]);
    const plain = scoreSentence("A company makes things to sell.");
    const exempt = scoreSentence("A company makes things to sell.", matcher);
    expect(exempt.grade).toBeLessThan(plain.grade);
    expect(exempt.grade).toBeLessThanOrEqual(2);
  });
  it("tooHard returns only the sentences over the limit", () => {
    const bad = tooHard(
      "The cat sat. Corporations distribute ownership certificates to investors.",
    );
    expect(bad).toHaveLength(1);
    expect(bad[0]?.sentence).toMatch(/Corporations/);
  });
});
