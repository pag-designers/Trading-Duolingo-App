import type { Me } from "@/lib/me-schema";

/**
 * Decide what to do with local vs server copies of one section.
 * - "pull":  server is newer → replace local with server
 * - "push":  local is newer → send local to server
 * - "none":  identical timestamps
 */
export function reconcile(
  localUpdatedAt: string,
  serverUpdatedAt: string,
): "pull" | "push" | "none" {
  if (serverUpdatedAt > localUpdatedAt) return "pull";
  if (serverUpdatedAt < localUpdatedAt) return "push";
  return "none";
}

/** Give up on the first sync after this long so an offline start is never stuck on the splash screen. */
export const FIRST_SYNC_TIMEOUT_MS = 2500;

export async function fetchMe(timeoutMs = FIRST_SYNC_TIMEOUT_MS): Promise<Me> {
  const res = await fetch("/api/me", { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`GET /api/me failed (${res.status})`);
  return (await res.json()) as Me;
}

export async function putMe(me: Me): Promise<Me> {
  const res = await fetch("/api/me", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(me),
  });
  if (!res.ok) throw new Error(`PUT /api/me failed (${res.status})`);
  return (await res.json()) as Me;
}
