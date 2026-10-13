// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

describe("hydrateStores", () => {
  it("resolves (never rejects) even when a store fails to rehydrate", async () => {
    vi.resetModules();
    vi.doMock("./progress", () => ({
      useProgress: { persist: { rehydrate: () => Promise.reject(new Error("idb broke")) } },
    }));
    const { hydrateStores } = await import("./hydration");
    await expect(hydrateStores()).resolves.toBeUndefined();
  });

  it("gives up on a hung IndexedDB instead of blocking the app", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.doMock("./progress", () => ({
      useProgress: { persist: { rehydrate: () => new Promise(() => {}) } },
    }));
    const { hydrateStores, HYDRATION_TIMEOUT_MS } = await import("./hydration");
    let done = false;
    void hydrateStores().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(HYDRATION_TIMEOUT_MS + 10);
    expect(done).toBe(true);
    vi.useRealTimers();
  });
});
