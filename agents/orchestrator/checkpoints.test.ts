import { describe, expect, it } from "vitest";
import { currentCheckpointNumber } from "./checkpoints";
import criteria from "./criteria.json";

const table = (rows: string[]) =>
  ["| CP  | Scope | Status |", "| --- | --- | --- |", ...rows].join("\n");

describe("currentCheckpointNumber", () => {
  it("picks the checkpoint that is in progress", () => {
    expect(
      currentCheckpointNumber(
        table(["| 0   | Foundation | ✅ |", "| 1   | Unit 1 | 🟡 |", "| 2   | Charts | ⬜ |"]),
      ),
    ).toBe(1);
  });
  it("keeps a finished-but-awaiting checkpoint current until the owner says go", () => {
    expect(
      currentCheckpointNumber(
        table(["| 0   | Foundation | ✅ (awaiting “go”) |", "| 1   | Unit 1 | ⬜ |"]),
      ),
    ).toBe(0);
  });
  it("is null when everything is done", () => {
    expect(
      currentCheckpointNumber(table(["| 0   | Foundation | ✅ |", "| 1   | Unit 1 | ✅ |"])),
    ).toBeNull();
  });
  it("reads the real PROGRESS.md and finds a checkpoint that has acceptance criteria", async () => {
    const { readFileSync } = await import("node:fs");
    const n = currentCheckpointNumber(readFileSync("PROGRESS.md", "utf8"));
    expect(n).not.toBeNull();
    expect(Object.keys(criteria)).toContain(String(n));
  });
});
