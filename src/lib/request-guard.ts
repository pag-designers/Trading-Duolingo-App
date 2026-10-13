/** Pure request checks (no Next.js imports) so they can be unit-tested. */

/** Is this request from the same origin as the server host? */
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true; // same-origin fetches and non-browser clients may send no Origin
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false; // e.g. the literal string "null" sent by sandboxed pages
  }
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Is the Host header a loopback name? Blocks DNS-rebinding to the local admin tools. */
export function isLoopbackHost(host: string | null): boolean {
  if (!host) return false;
  const name = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : (host.split(":")[0] ?? "");
  return LOOPBACK.has(name);
}

export function isJsonContentType(contentType: string | null): boolean {
  return contentType?.toLowerCase().startsWith("application/json") ?? false;
}
