// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

describe("idbStorage without IndexedDB (private window / blocked storage)", () => {
  it("falls back to localStorage instead of throwing", async () => {
    vi.resetModules();
    vi.doMock("idb-keyval", () => ({
      get: () => Promise.reject(new Error("no indexedDB")),
      set: () => Promise.reject(new Error("no indexedDB")),
      del: () => Promise.reject(new Error("no indexedDB")),
    }));
    const { idbStorage } = await import("./persist");
    await expect(idbStorage.setItem("k", "v")).resolves.toBeUndefined();
    expect(await idbStorage.getItem("k")).toBe("v");
    await idbStorage.removeItem("k");
    expect(await idbStorage.getItem("k")).toBeNull();
  });

  it("uses IndexedDB when it works and clears the fallback copy", async () => {
    vi.resetModules();
    const db = new Map<string, string>();
    vi.doMock("idb-keyval", () => ({
      get: async (k: string) => db.get(k),
      set: async (k: string, v: string) => void db.set(k, v),
      del: async (k: string) => void db.delete(k),
    }));
    window.localStorage.setItem("p", "stale");
    const { idbStorage } = await import("./persist");
    await idbStorage.setItem("p", "fresh");
    expect(db.get("p")).toBe("fresh");
    expect(window.localStorage.getItem("p")).toBeNull();
    expect(await idbStorage.getItem("p")).toBe("fresh");
  });
});
