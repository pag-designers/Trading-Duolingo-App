# PROGRESS

Legend: ⬜ not started · 🟡 in progress · ✅ done · ⚠️ partial

| CP  | Scope                                    | Status             |
| --- | ---------------------------------------- | ------------------ |
| 0   | Foundation                               | ✅ (awaiting “go”) |
| 1   | Unit 1 + lesson engine                   | ⬜                 |
| 2   | Chart School (Unit 2)                    | ⬜                 |
| 3   | Candlesticks + patterns (Units 3–4)      | ⬜                 |
| 4   | Trade Lab core                           | ⬜                 |
| 5   | Day trading mechanics + risk (Units 5–6) | ⬜                 |
| 6   | AI Coach                                 | ⬜                 |
| 7   | News, Boss, graduation (Units 7–8)       | ⬜                 |
| 8   | Polish, a11y, performance                | ⬜                 |

## Agent status (after CP0)

| Agent                      | Status | Real checks now                                                            | Still stubs (arrive in)                         |
| -------------------------- | ------ | -------------------------------------------------------------------------- | ----------------------------------------------- |
| Curriculum Auditor         | 🟠     | outline schema, unique ids, boss per unit, lessons-written count           | reading level, glossary, questions (CP1)        |
| Financial Accuracy Checker | 🟠     | none                                                                       | indicators CP2, detectors CP3, sim math CP4–5   |
| Safety & Guardrails        | 🟠     | risk reminder on 4 screens, no “out of hearts” copy, no live-data claims   | Coach red-team, citations (CP6)                 |
| Pedagogy                   | 🟠     | practice in every unit, practice before boss, units start with a lesson    | objective mapping, one-idea-per-slide, ramp     |
| Accessibility & UX         | 🟠     | font ≥ 18px, reduced motion, tap targets, contrast (23 pairs × light/dark) | axe on every route (CP8)                        |
| Performance                | 🟠     | sound asset budget                                                         | Lighthouse, 10k candles, frames, bundle (CP2–8) |
| Progress & Data Integrity  | 🟠     | SQLite integrity, all tables, user rows, exported-backup consistency       | browser↔DB, journal, restore (CP1–8)            |
| Orchestrator               | ✅     | runs all, writes reports, release gate, CP0 acceptance from e2e evidence   | other checkpoints' criteria (added per CP)      |

Release gate today: **ready with warnings** (no red; amber = stubs).

## Canary log (each agent must catch a deliberately broken fixture)

| Agent               | Broken fixtures it must catch                                                                                | Result |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| Curriculum Auditor  | unit without boss · duplicate node id · missing field · missing file · invalid JSON                          | ✅ red |
| Safety & Guardrails | trade screen without risk reminder · “out of hearts” copy · “live data” claim                                | ✅ red |
| Pedagogy            | unit with no practice · practice only after boss · unit opening with a test                                  | ✅ red |
| Accessibility & UX  | 14px font · low contrast (light) · low contrast (dark) · no reduced motion · 32px buttons                    | ✅ red |
| Performance         | 3 MB sound file · no sounds                                                                                  | ✅ red |
| Data Integrity      | DB missing tables · XP ≠ daily sum · done step without date · corrupt backup · orphan user                   | ✅ red |
| Orchestrator        | any red → release blocked · crashing agent → red                                                             | ✅     |
| Financial Accuracy  | **deferred**: no real checks yet; canary added with the first real check in CP2 (indicators) and CP4 (fills) | n/a    |

## CP0 — Foundation: DONE

Acceptance: app runs · onboarding works · path map renders · dark mode works · agents run — **all met** (see `/admin/health`).

Evidence (run on 2026-10-13):

- `pnpm check`: typecheck clean, ESLint clean, **96 unit tests pass** (20 files: progress math, contrast math, integrity checks, sound generator, outline schema, storage fallback, sync reconcile, request guards, backup, all agent canaries).
- `pnpm build`: production build succeeds (12 routes; first-load JS 102 kB shared, 213 kB on Learn).
- `pnpm e2e`: **21 passed, 1 skipped** (the phone-only test on the desktop project), on desktop Chrome and Pixel 7: first-run redirect, full onboarding, server persistence in SQLite, returning learner on a fresh browser, all 8 units on the map, sheets and risk reminder, dark mode (persists across reload), reading mode / reduced motion / sound toggles, Health page running all agents, every route renders, cross-site/non-JSON writes and non-loopback admin runs refused, axe smoke in light + dark, phone layout (bottom tabs, no horizontal scroll, every tap target ≥ 48px).
- `pnpm agents:run`: 0 red, 7 amber (stubs only), CP0 criteria met.
- Screenshots in `docs/screenshots/cp0/` (phone light/dark, onboarding, node sheet, desktop Learn, Settings, Health, Profile).

Bugs found and fixed by the checks along the way: unit colors failing WCAG contrast with white text (Accessibility agent); disclaimer regex tripping on a line break (Safety agent); IndexedDB-unavailable crash in progress saving (unit test); volume slider thumb unnamed (axe); logo link 43px tall (tap-target e2e); first-run redirect racing the server sync.

- Code review (`/code-review`, medium): 10 findings; fixed the real ones: hydration can no longer hang or reject (3 s IndexedDB timeout), pushes pull back newer server data, profile/settings writes are single conditional statements (no overwrite race), NaN/fractional XP and scores are rejected, backup download revokes its URL late, the health summary is validated on read and runs are de-duplicated. Skipped (logged as known issues): theme kept in two places (next-themes + settings store) and falling back to defaults when a DB row fails validation.
- Security review (`/security-review`): no high-confidence vulnerabilities. Two low-severity hardening notes were fixed anyway: `PUT /api/me` now requires `application/json` + same Origin (a cross-site `text/plain` request needs no CORS preflight), and the agent-runner endpoint only answers on loopback hosts (DNS rebinding) with safe Origin parsing.

Known issues / deferred: see the CP0 report. No lessons exist yet (Unit 1 content is CP1); sounds are synthesized placeholders-in-quality (but real and working); PWA install, backup _restore_, and full a11y/perf budgets are CP8.
