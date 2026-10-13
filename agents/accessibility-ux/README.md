# Accessibility & UX

**Job:** keep the app readable and usable for everyone.

**Real checks now (static, from the real CSS and components):** base font ≥ 18px; reduced-motion rules (device and in-app); button tap targets ≥ 48px; WCAG AA contrast for 23 token pairs in light **and** dark mode.

**Arrives later:** axe-core scan of every route (CP8), sound-off e2e (CP1).

**Canary:** `accessibility-ux.canary.test.ts` (small font, low contrast in light and dark, no reduced motion, small buttons).
