import { describe, expect, it } from "vitest";
import { runAgent, summarize } from ".";
import { worst } from "../lib";
import type { Agent } from "../types";

const ctx = { root: ".", dbUrl: "file:./prisma/dev.db", date: "2026-01-01" };
const agentOf = (id: string, status: "green" | "amber" | "red"): Agent => ({
  id,
  name: id,
  job: "test",
  run: async () => [{ id: "c", title: "c", status, detail: "d" }],
});

describe("Orchestrator canary", () => {
  it("blocks the release when any agent is red", async () => {
    const results = await Promise.all(
      [agentOf("a", "green"), agentOf("b", "red")].map((a) => runAgent(a, ctx)),
    );
    const s = summarize(results, null);
    expect(s.overall).toBe("red");
    expect(s.release).toBe("blocked");
  });

  it("allows a release with warnings when the worst is amber", async () => {
    const results = await Promise.all(
      [agentOf("a", "green"), agentOf("b", "amber")].map((a) => runAgent(a, ctx)),
    );
    expect(summarize(results, null).release).toBe("ready-with-warnings");
  });

  it("is ready only when everything is green", async () => {
    const results = await Promise.all([agentOf("a", "green")].map((a) => runAgent(a, ctx)));
    expect(summarize(results, null).release).toBe("ready");
  });

  it("turns a crashing agent into red instead of crashing the run", async () => {
    const boom: Agent = {
      id: "boom",
      name: "boom",
      job: "x",
      run: async () => {
        throw new Error("kaboom");
      },
    };
    const r = await runAgent(boom, ctx);
    expect(r.status).toBe("red");
    expect(r.checks[0]?.detail).toMatch(/kaboom/);
  });

  it("worst() ranks red > amber > green", () => {
    expect(worst(["green", "amber"])).toBe("amber");
    expect(worst(["green", "amber", "red"])).toBe("red");
    expect(worst([])).toBe("green");
  });
});
