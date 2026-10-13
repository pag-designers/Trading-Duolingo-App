import { describe, expect, it } from "vitest";
import { isLoopbackHost, isSameOrigin } from "./request-guard";

describe("isSameOrigin", () => {
  it("allows requests with no Origin header", () =>
    expect(isSameOrigin(null, "localhost:3000")).toBe(true));
  it("allows a matching origin", () =>
    expect(isSameOrigin("http://localhost:3000", "localhost:3000")).toBe(true));
  it("blocks another site", () =>
    expect(isSameOrigin("https://evil.example", "localhost:3000")).toBe(false));
  it("blocks another port on localhost", () =>
    expect(isSameOrigin("http://localhost:4000", "localhost:3000")).toBe(false));
  it("blocks the opaque 'null' origin instead of throwing", () =>
    expect(isSameOrigin("null", "localhost:3000")).toBe(false));
});

describe("isLoopbackHost", () => {
  it("accepts localhost forms", () => {
    for (const h of ["localhost:3000", "localhost", "127.0.0.1:3100", "[::1]:3000"])
      expect(isLoopbackHost(h), h).toBe(true);
  });
  it("rejects other hosts (DNS rebinding)", () => {
    for (const h of ["evil.example:3000", "192.168.1.5:3000", "localhost.evil.example", null])
      expect(isLoopbackHost(h), String(h)).toBe(false);
  });
});

import { isJsonContentType } from "./request-guard";

describe("isJsonContentType", () => {
  it("accepts JSON with or without charset", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("Application/JSON; charset=utf-8")).toBe(true);
  });
  it("rejects the cross-site 'simple request' types", () => {
    for (const t of [
      "text/plain",
      "application/x-www-form-urlencoded",
      "multipart/form-data",
      null,
    ]) {
      expect(isJsonContentType(t), String(t)).toBe(false);
    }
  });
});
