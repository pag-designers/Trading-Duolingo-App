import { contrastRatio, cssRule, readTokens } from "../../src/lib/contrast";
import { fail, pass, readText, stub } from "../lib";
import type { Agent, Check } from "../types";

/** [foreground token, background token, minimum ratio, why]. 4.5 = normal text, 3 = large/graphic. */
export const CONTRAST_PAIRS: [string, string, number, string][] = [
  ["foreground", "background", 4.5, "body text"],
  ["foreground", "surface", 4.5, "text on cards"],
  ["muted", "background", 4.5, "secondary text"],
  ["muted", "surface", 4.5, "secondary text on cards"],
  ["muted", "surface-2", 4.5, "secondary text on panels"],
  ["brand-fg", "brand", 4.5, "primary button text"],
  ["brand", "surface", 4.5, "secondary button and link text"],
  ["brand", "brand-soft", 4.5, "selected option text"],
  ["reward-fg", "reward", 4.5, "yellow button text"],
  ["gain-text", "background", 4.5, "profit numbers"],
  ["gain-text", "gain-soft", 4.5, "profit on tinted panel"],
  ["loss-text", "background", 4.5, "loss numbers"],
  ["loss-text", "loss-soft", 4.5, "loss on tinted panel"],
  ["flame-text", "background", 4.5, "streak number"],
  ["info-text", "background", 4.5, "info text"],
  ["unit-fg", "unit-1", 4.5, "unit 1 banner text"],
  ["unit-fg", "unit-2", 4.5, "unit 2 banner text"],
  ["unit-fg", "unit-3", 4.5, "unit 3 banner text"],
  ["unit-fg", "unit-4", 4.5, "unit 4 banner text"],
  ["unit-fg", "unit-5", 4.5, "unit 5 banner text"],
  ["unit-fg", "unit-6", 4.5, "unit 6 banner text"],
  ["unit-fg", "unit-7", 4.5, "unit 7 banner text"],
  ["unit-fg", "unit-8", 4.5, "unit 8 banner text"],
];

export const accessibilityUx: Agent = {
  id: "accessibility-ux",
  name: "Accessibility & UX",
  job: "Contrast in light and dark, font size, tap targets, reduced motion. (Axe scans arrive in CP8.)",
  async run({ root }) {
    const checks: Check[] = [];
    const css = readText(root, "src/app/globals.css");
    if (!css) return [fail("css", "Design tokens file exists", "src/app/globals.css is missing.")];

    // Base font size: html { font-size: N% } with 100% = 16px. Brief: body text >= 18px.
    const pct = /html\s*\{[^}]*font-size:\s*([\d.]+)%/.exec(css)?.[1];
    const px = pct ? (Number(pct) / 100) * 16 : 16;
    checks.push(
      px >= 18
        ? pass("font-size", "Body text is at least 18px", `Base size is ${px}px.`)
        : fail("font-size", "Body text is at least 18px", `Base size is ${px}px.`),
    );

    checks.push(
      /prefers-reduced-motion:\s*reduce/.test(css) && /data-motion="reduced"/.test(css)
        ? pass(
            "reduced-motion",
            "Reduced motion honoured (device and in-app setting)",
            "Both CSS rules present.",
          )
        : fail(
            "reduced-motion",
            "Reduced motion honoured (device and in-app setting)",
            "Missing a prefers-reduced-motion rule or the in-app data-motion rule.",
          ),
    );

    // Tap targets: every button size must be at least 48px (min-h-12 at 18px root = 54px).
    const button = readText(root, "src/components/ui/button.tsx") ?? "";
    const tooSmall = /\b(?:min-)?h-(?:[1-9]|10|11)\b|\bsize-(?:[1-9]|10|11)\b/.test(
      button.replace(/\[&_svg\]:size-\d/g, ""),
    );
    checks.push(
      button && !tooSmall && /min-h-12/.test(button)
        ? pass(
            "tap-targets",
            "Buttons are at least 48px tall",
            "All button sizes meet the minimum.",
          )
        : fail(
            "tap-targets",
            "Buttons are at least 48px tall",
            "A button size is below 48px, or min-h-12 is missing.",
          ),
    );

    // Contrast in both themes, computed from the real tokens.
    const light = { ...readTokens(cssRule(css, ":root")) };
    const dark = { ...light, ...readTokens(cssRule(css, ".dark")) };
    for (const [theme, tokens] of [
      ["light", light],
      ["dark", dark],
    ] as const) {
      const failures: string[] = [];
      let checked = 0;
      for (const [fg, bg, min, why] of CONTRAST_PAIRS) {
        const a = tokens[fg];
        const b = tokens[bg];
        if (!a || !b) {
          failures.push(`${fg}/${bg}: token missing`);
          continue;
        }
        checked += 1;
        const ratio = contrastRatio(a, b);
        if (ratio < min)
          failures.push(`${why} (${fg} on ${bg}) = ${ratio.toFixed(2)}, needs ${min}`);
      }
      checks.push(
        failures.length === 0
          ? pass(
              `contrast-${theme}`,
              `Text contrast in ${theme} mode`,
              `${checked} pairs meet WCAG AA.`,
            )
          : fail(
              `contrast-${theme}`,
              `Text contrast in ${theme} mode`,
              failures.slice(0, 4).join("; ") +
                (failures.length > 4 ? ` (+${failures.length - 4} more)` : ""),
            ),
      );
    }

    checks.push(stub("axe", "Axe-core scan on every route", "CP8"));
    checks.push(stub("sound-off", "App fully usable with sounds off (e2e)", "CP1"));
    return checks;
  },
};
