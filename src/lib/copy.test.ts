import { describe, expect, it } from "vitest";
import { NOT_ADVICE, RISK_REMINDER } from "./copy";
import { loadContent } from "./content/load";
import { buildMatcher } from "./glossary";
import { tooHard } from "./readability";

describe("honesty copy", () => {
  it("the risk reminder says the two required things", () => {
    expect(RISK_REMINDER).toMatch(/most day traders lose money/i);
    expect(RISK_REMINDER).toMatch(/pretend/i);
  });
  it("the not-advice line says it plainly", () => {
    expect(NOT_ADVICE).toMatch(/not financial advice/i);
  });
  it("both lines are readable at grade 2 (defined terms exempt, like all lesson copy)", () => {
    const glossary = loadContent(process.cwd()).glossary;
    expect(glossary).not.toBeNull();
    const matcher = buildMatcher(glossary!.terms);
    expect(tooHard(RISK_REMINDER, matcher)).toEqual([]);
    expect(tooHard(NOT_ADVICE, matcher)).toEqual([]);
  });
});
