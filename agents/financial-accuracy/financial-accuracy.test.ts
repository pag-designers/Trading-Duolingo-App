import { describe, expect, it } from "vitest";
import { fixture, run } from "../testing";
import { financialAccuracy } from ".";

describe("Financial Accuracy Checker (CP0 stub)", () => {
  it("is honest: every check is a stub and the agent is amber, never green", async () => {
    const r = await run(financialAccuracy, fixture([]));
    expect(r.status).toBe("amber");
    expect(r.checks.every((c) => c.stub)).toBe(true);
  });
  // The canary for this agent (a deliberately wrong indicator / fill) is added in CP2 and CP4,
  // when it has real checks. Tracked in PROGRESS.md.
});
