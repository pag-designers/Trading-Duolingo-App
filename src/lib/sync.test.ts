import { describe, expect, it } from "vitest";
import { reconcile } from "./sync";

describe("reconcile", () => {
  it("pulls when the server copy is newer", () => {
    expect(reconcile("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z")).toBe("pull");
  });
  it("pushes when the local copy is newer", () => {
    expect(reconcile("2026-01-02T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe("push");
  });
  it("does nothing when equal", () => {
    expect(reconcile("2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe("none");
  });
});
