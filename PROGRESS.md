# PROGRESS

Legend: ⬜ not started · 🟡 in progress · ✅ done · ⚠️ partial

| CP  | Scope                                    | Status             |
| --- | ---------------------------------------- | ------------------ |
| 0   | Foundation                               | ✅                 |
| 1   | Unit 1 + lesson engine                   | ✅ (awaiting “go”) |
| 2   | Chart School (Unit 2)                    | ⬜                 |
| 3   | Candlesticks + patterns (Units 3–4)      | ⬜                 |
| 4   | Trade Lab core                           | ⬜                 |
| 5   | Day trading mechanics + risk (Units 5–6) | ⬜                 |
| 6   | AI Coach                                 | ⬜                 |
| 7   | News, Boss, graduation (Units 7–8)       | ⬜                 |
| 8   | Polish, a11y, performance                | ⬜                 |

## Agent status (after CP1)

| Agent                      | Status | Real checks now                                                                                                                                         | Still stubs (arrive in)                         |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Curriculum Auditor         | 🟠     | content files valid · outline structure · **reading level ≤ grade 2** · **terms defined before use** · answer keys and ids · risk reminder flag · links | (amber only because Units 2–8 are not written)  |
| Financial Accuracy Checker | 🟠     | none                                                                                                                                                    | indicators CP2, detectors CP3, sim math CP4–5   |
| Safety & Guardrails        | 🟠     | risk reminder on 6 screens + shared text · no "out of hearts" copy · no live-data claims                                                                | Coach red-team, citations (CP6)                 |
| Pedagogy                   | 🟠     | outline rules · **one idea per slide** · **every objective has a question** · enough practice · practice/boss pool size                                 | trade-exercise mapping CP4, difficulty ramp CP3 |
| Accessibility & UX         | 🟠     | font ≥ 18px, reduced motion, tap targets, contrast (23 pairs × light/dark). Axe is also run in e2e on every lesson screen                               | axe agent on every route (CP8)                  |
| Performance                | 🟠     | sound asset budget                                                                                                                                      | Lighthouse, 10k candles, frames, bundle         |
| Progress & Data Integrity  | 🟠     | SQLite integrity · tables · user rows · **progress rows consistent** · backup consistency · **browser = database (e2e)**                                | journal CP4, restore CP8                        |
| Orchestrator               | ✅     | runs all in parallel, writes reports once, release gate, **acceptance criteria from a data file with e2e / file / agent-check evidence**                | other checkpoints' criteria (added per CP)      |

Release gate today: **ready with warnings** (no red; amber = stubs and unwritten units).

## Canary log (each agent must catch a deliberately broken fixture)

| Agent                    | Broken fixtures it must catch                                                                                                                                                                                                                                                                                | Result |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Curriculum Auditor       | unit without boss · duplicate node id · missing field · missing file · invalid JSON                                                                                                                                                                                                                          | ✅ red |
| Safety & Guardrails      | trade screen without risk reminder · “out of hearts” copy · “live data” claim                                                                                                                                                                                                                                | ✅ red |
| Pedagogy                 | unit with no practice · practice only after boss · unit opening with a test                                                                                                                                                                                                                                  | ✅ red |
| Accessibility & UX       | 14px font · low contrast (light) · low contrast (dark) · no reduced motion · 32px buttons                                                                                                                                                                                                                    | ✅ red |
| Performance              | 3 MB sound file · no sounds                                                                                                                                                                                                                                                                                  | ✅ red |
| Data Integrity           | DB missing tables · XP ≠ daily sum · done step without date · corrupt backup · orphan user                                                                                                                                                                                                                   | ✅ red |
| Curriculum Auditor (CP1) | sentence above grade 2 · term used before defined · slide defines a term it never uses · duplicate question id · bad answer key · build block used twice · trading lesson without the risk flag · broken glossary and pool links · invalid schema / JSON / missing content · tap chart with too many candles | ✅ red |
| Pedagogy (CP1)           | slide over 3 sentences · slide defining too many terms · objective with no question · too few questions · practice step too small                                                                                                                                                                            | ✅ red |
| Safety (CP1)             | shared risk reminder text no longer says it · screen using `<RiskReminder />` accepted                                                                                                                                                                                                                       | ✅     |
| Data Integrity (CP1)     | inconsistent progress rows in the database (no date, score > 100, freeze used but never earned) · healthy rows pass                                                                                                                                                                                          | ✅ red |
| Orchestrator             | any red → release blocked · crashing agent → red                                                                                                                                                                                                                                                             | ✅     |
| Financial Accuracy       | **deferred**: no real checks yet; canary added with the first real check in CP2 (indicators) and CP4 (fills)                                                                                                                                                                                                 | n/a    |

## CP0 — Foundation: DONE

Acceptance: app runs · onboarding works · path map renders · dark mode works · agents run — **all met** (see `/admin/health`).

Evidence (run on 2026-10-13):

- `pnpm check`: typecheck clean, ESLint clean, **100 unit tests pass** (21 files: progress math, contrast math, integrity checks, sound generator, outline schema, storage fallback, sync reconcile, request guards, backup, all agent canaries).
- `pnpm build`: production build succeeds (12 routes; first-load JS 102 kB shared, 213 kB on Learn).
- `pnpm e2e`: **21 passed, 1 skipped** (the phone-only test on the desktop project), on desktop Chrome and Pixel 7: first-run redirect, full onboarding, server persistence in SQLite, returning learner on a fresh browser, all 8 units on the map, sheets and risk reminder, dark mode (persists across reload), reading mode / reduced motion / sound toggles, Health page running all agents, every route renders, cross-site/non-JSON writes and non-loopback admin runs refused, axe smoke in light + dark, phone layout (bottom tabs, no horizontal scroll, every tap target ≥ 48px).
- `pnpm agents:run`: 0 red, 7 amber (stubs only), CP0 criteria met.
- Screenshots in `docs/screenshots/cp0/` (phone light/dark, onboarding, node sheet, desktop Learn, Settings, Health, Profile).

Bugs found and fixed by the checks along the way: unit colors failing WCAG contrast with white text (Accessibility agent); disclaimer regex tripping on a line break (Safety agent); IndexedDB-unavailable crash in progress saving (unit test); volume slider thumb unnamed (axe); logo link 43px tall (tap-target e2e); first-run redirect racing the server sync.

- Code review (`/code-review`, medium): 10 findings; fixed the real ones: hydration can no longer hang or reject (3 s IndexedDB timeout), pushes pull back newer server data, profile/settings writes are single conditional statements (no overwrite race), NaN/fractional XP and scores are rejected, backup download revokes its URL late, the health summary is validated on read and runs are de-duplicated. Skipped (logged as known issues): theme kept in two places (next-themes + settings store) and falling back to defaults when a DB row fails validation.
- Cleanup pass (`/simplify`, 4 reviewers: reuse, simplification, efficiency, altitude): applied — profile/settings fields now derive from one Zod schema (stores, snapshots, API and row mapping no longer hand-list them); shared `clamp`/`clampScore`/`dateKey`/progress types; sync responses validated; agents run in parallel and write reports once; the safety scan reads each file once and skips test files; unused motion exports, CSS tokens and the unused `lightweight-charts` / coverage dependencies removed (charts return in CP2); e2e reset wipes every table. Deferred as design follow-ups: sync section registry or server revisions (CP1, when progress joins sync), token-based contrast checks and a shared risk-reminder component (CP1/CP8), checkpoint criteria as a data file (CP1), whole-store selectors on Settings/Profile screens.
- Security review (`/security-review`): no high-confidence vulnerabilities. Two low-severity hardening notes were fixed anyway: `PUT /api/me` now requires `application/json` + same Origin (a cross-site `text/plain` request needs no CORS preflight), and the agent-runner endpoint only answers on loopback hosts (DNS rebinding) with safe Origin parsing.

Known issues / deferred: see the CP0 report. No lessons exist yet (Unit 1 content is CP1); sounds are synthesized placeholders-in-quality (but real and working); PWA install, backup _restore_, and full a11y/perf budgets are CP8.

## CP1 — Unit 1 and the lesson engine: DONE

Acceptance (BRIEF §9): a learner can finish Unit 1, see XP and streak update, and reopen any lesson. All seven criteria in `agents/orchestrator/criteria.json` are met, each proven by an e2e test or an agent check (see `/admin/health`).

What was built: the lesson engine (teach slides with 15 animated illustrations, multiple choice, true/false, match by tap or drag, chart spot by choice or tap, build), unlimited hearts with the Focus meter and one retry per miss, keyboard shortcuts, sounds, confetti, the results screen (XP breakdown, streak, daily goal, level), treasure chests, glossary highlights in every lesson, the Glossary and Short-words pages, streak freezes, "You vs you" and Trader Ranks (labelled practice rivals), and progress syncing to SQLite. Unit 1 has 11 steps + 1 chest: **45 slides, 57 questions** (27 multiple choice, 14 true/false, 7 match, 5 build, 4 chart), a **51-term glossary** and **44 short words**, all at first-grade reading level.

Evidence (run on 2026-10-13):

- `pnpm check`: typecheck clean, ESLint clean, **225 unit tests pass** (28 files).
- `pnpm content:check`: 11 lessons, 51 terms, 44 abbreviations, **0 findings**.
- `pnpm build`: succeeds; 14 lesson routes are prerendered (`/lesson/[nodeId]` first-load JS 238 kB).
- `pnpm e2e`: **53 passed, 3 skipped, 0 failed** on desktop Chrome and Pixel 7. The skips are viewport-specific tests (phone-only layout checks on desktop, the mouse-drag test on phone). Highlights: **all 12 Unit 1 steps finished in order**; XP equals the XP rules exactly (28 for a perfect first lesson); the streak card and header update; a missed question shows the right answer and the reason, comes back once, never drains Focus, and a lesson with every question missed still finishes and counts; replays give +5 XP and count the step once; progress reaches SQLite, restores on a fresh browser and merges both ways; garbage payloads and cross-site writes are refused; drag, keyboard and chart-by-keyboard work; confetti is off with Reduce motion; the risk reminder shows on trading lessons and not on money/company; axe finds no serious issue on slides, every question type, both feedback states, the term card, results, chest, Glossary and Short words in light and dark on both viewports; phone lessons have no sideways scroll and every tap target is 48px.
- `pnpm agents:run`: 0 red, 7 amber (stubs and unwritten units only); **CP1 criteria met**.
- Screenshots in `docs/screenshots/cp1/`.
- Reviews: `/code-review` (9 findings: fixed the merge race with a server queue, freeze consistency after merging two devices, `repairProgress` for freezes, a progress bar that could move backwards, a 14px label; skipped with reasons the single-digit unit ids, fail-fast content loading, a harmless sync-cleanup race, and a review-XP cap, see D-020). `/security-review`: no high-confidence findings (progress API validation and key regexes, Prisma-only writes, no URL-to-filesystem path, no HTML sinks, content links built from schema-constrained ids).

Bugs found and fixed by the checks along the way: a syllable counter that read "whole" as two syllables; the fragment-grading rule (see D-020); Enter on a chart candle selecting _and_ checking in one press; the in-app Reduce motion setting not reaching the Framer-based animations; the chart picture labelling plain SVG groups (axe); Glossary links 24px tall; the tap chart pushing its answer off a phone screen; the Start bubble overlapping the previous label; Wick's "oops" eyebrows looking angry; a one-pixel sideways overflow while an illustration animated.

Known issues / deferred (also see D-016, D-020): Ask-the-Coach chat and the AI "Why?" explanation (CP6; every question already has an authored explanation); Lightweight Charts (CP2; lessons use a small SVG chart on pretend candles); no daily cap on review XP; sync is last-write-wins for profile/settings and merge-only for progress (a sync registry is deferred until a third section needs it); the Learn page's later units still show their original goals (rewritten when each unit is written); PWA, backup restore and the full per-route axe/Lighthouse budgets are CP8.
