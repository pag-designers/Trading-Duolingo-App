import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fixture, run } from "../testing";
import { accessibilityUx } from ".";

const files = ["src/app/globals.css", "src/components/ui/button.tsx"];
const css = readFileSync("src/app/globals.css", "utf8");
const button = readFileSync("src/components/ui/button.tsx", "utf8");

describe("Accessibility & UX canary", () => {
  it("control: the real design system is not red", async () => {
    const r = await run(accessibilityUx, fixture(files));
    expect(r.checks.filter((c) => c.status === "red")).toEqual([]);
  });

  it("catches body text smaller than 18px", async () => {
    const r = await run(
      accessibilityUx,
      fixture(files, {
        "src/app/globals.css": css.replace("font-size: 112.5%;", "font-size: 87.5%;"),
      }),
    );
    expect(r.checks.find((c) => c.id === "font-size")?.status).toBe("red");
  });

  it("catches low-contrast text in light mode", async () => {
    const bad = css.replace(/(:root \{[^}]*?--muted:\s*)#[0-9a-f]+/, "$1#c9c5e8");
    const r = await run(accessibilityUx, fixture(files, { "src/app/globals.css": bad }));
    expect(r.checks.find((c) => c.id === "contrast-light")?.status).toBe("red");
  });

  it("catches low-contrast text in dark mode", async () => {
    const bad = css.replace(/(\.dark \{[^}]*?--muted:\s*)#[0-9a-f]+/, "$1#3a3a5a");
    const r = await run(accessibilityUx, fixture(files, { "src/app/globals.css": bad }));
    expect(r.checks.find((c) => c.id === "contrast-dark")?.status).toBe("red");
  });

  it("catches missing reduced-motion support", async () => {
    const bad = css.replace(/prefers-reduced-motion:\s*reduce/g, "prefers-color-scheme: light");
    const r = await run(accessibilityUx, fixture(files, { "src/app/globals.css": bad }));
    expect(r.checks.find((c) => c.id === "reduced-motion")?.status).toBe("red");
  });

  it("catches tap targets under 48px", async () => {
    const bad = button.replace("min-h-12 px-5", "min-h-8 px-3").replace("min-h-12", "min-h-9");
    const r = await run(accessibilityUx, fixture(files, { "src/components/ui/button.tsx": bad }));
    expect(r.checks.find((c) => c.id === "tap-targets")?.status).toBe("red");
  });
});
