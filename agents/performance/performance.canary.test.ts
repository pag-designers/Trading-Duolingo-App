import { describe, expect, it } from "vitest";
import { fixture, run } from "../testing";
import { performance } from ".";

describe("Performance canary", () => {
  it("control: the real sounds are within budget", async () => {
    const r = await run(performance, fixture(["public/sounds"]));
    expect(r.checks.find((c) => c.id === "sound-budget")?.status).toBe("green");
  });

  it("catches an oversized sound file", async () => {
    const huge = "x".repeat(3 * 1024 * 1024);
    const r = await run(
      performance,
      fixture(["public/sounds"], { "public/sounds/huge.wav": huge }),
    );
    expect(r.checks.find((c) => c.id === "sound-budget")?.status).toBe("red");
    expect(r.status).toBe("red");
  });

  it("catches missing sounds", async () => {
    const r = await run(performance, fixture([]));
    expect(r.checks.find((c) => c.id === "sound-budget")?.status).toBe("red");
  });
});
