# DECISIONS

Append-only log of decisions that shape the project. Newest at the bottom of each section. `BRIEF.md` is the master spec; this file records choices the brief left open and any deviations from it.

## D-001 — App name: **Candlo**

- Short (6 letters), easy to say, English, and it's a pun on _candle_ (candlestick charts) + a friendly "-o" ending.
- Coach (the AI tutor) is called **Coach Wick** in the UI (the brief's "Coach — rename per the app name").
- Trade Lab, Chart School, Glossary keep their plain names from the brief.
- Not checked against trademarks or app stores. Do that before any public release.

## D-002 — Mascot: **Wick**

- Wick is a small, round **candlestick creature**: a rounded-rectangle body (the candle _body_) with a thin line sticking out the top and bottom (the _wicks_), which double as an antenna and little legs.
- The body color is the candle color: **green** when happy (an "up candle"), a soft **coral** when Wick says "oops" (a "down candle"). Wrong answers never use harsh red, in line with "gentle" feedback.
- Drawn as pure SVG with separate parts (body, eyes, brows, mouth, wicks, cheeks) so Framer Motion can animate them. Moods: `happy`, `cheer`, `think`, `oops`, `sleepy`, `wave`.
- Original design; no existing character is copied.
- Rendered by `src/components/mascot/wick.tsx`. Final illustration pass in CP8.

## D-003 — Color roles

- **Brand / primary action:** vivid indigo-violet. **Reward / XP:** sunshine yellow. **Streak:** flame orange.
- **Gain** (profit, up candle) = green and **loss** = coral. These are reserved for market meaning and the mascot's mood, never for generic buttons, so a green button never looks like "profit".
- Light and dark themes via CSS variables in `src/app/globals.css`. All text/background pairs must reach WCAG AA (checked by the Accessibility agent in CP8).

## D-004 — Stack deviations and pins (brief §2 says "do not relitigate"; these are version/implementation details, not stack changes)

| Brief says                                    | We use                                                                                                                             | Why                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 15                                    | **Next 15.5.27** (the 15.x maintenance line), React 19                                                                             | Brief pins major 15. Next 16 exists; we stay on 15.                                                                                                                                                                                                            |
| Prisma + SQLite                               | **Prisma 7.10.0** (latest stable; the `latest` npm tag is an 8.0 RC) with the **libSQL driver adapter** (`@prisma/adapter-libsql`) | Prisma 7 requires a driver adapter. `better-sqlite3` downloads its native binary from GitHub Releases, which is blocked in this cloud sandbox. libSQL ships prebuilt binaries via npm, so there is no compile step. The database is still a local SQLite file. |
| shadcn/ui                                     | shadcn-style primitives (Radix + `class-variance-authority`) in `src/components/ui`                                                | Same code shape as shadcn; components are added as needed and restyled to Candlo's tokens.                                                                                                                                                                     |
| Zustand persisted to localStorage + IndexedDB | Small prefs in localStorage, progress/trades in IndexedDB (`idb-keyval`), both behind one persist wrapper                          | See D-005.                                                                                                                                                                                                                                                     |
| Husky pre-commit                              | `pnpm check` (typecheck + lint + test), kept under ~30 s                                                                           | Fast hooks get used; slow ones get bypassed.                                                                                                                                                                                                                   |
| Fonts                                         | Self-hosted **Nunito** (UI) and **JetBrains Mono** (numbers, terminal) via `@fontsource-variable`                                  | No runtime requests to Google Fonts; works offline and in the PWA.                                                                                                                                                                                             |

## D-005 — Where the truth lives (storage model)

- **SQLite (Prisma) is the source of truth** for profile, progress, XP/streaks, trades, journal and settings. Every row hangs off a `User`, with a single seeded local user for now, so adding users later is a data change, not a rewrite (brief §0).
- **Zustand** is the client cache and drives the UI instantly (optimistic). It persists to the browser so the app works offline and survives reloads.
- Writes go to Zustand first, then to the server via API route handlers (TanStack Query mutations). On start the client reconciles with the server (server wins when its `updatedAt` is newer).
- In CP0 only profile + settings round-trip to SQLite. Progress, trades and journal tables exist in schema v1 but are wired up in the checkpoints that use them.
- The Progress & Data Integrity agent (CP8) validates both stores and offers repair.

## D-006 — Content model

- All curriculum lives in `/content` as JSON validated by Zod (`src/lib/content/schema.ts`). No lesson text in components.
- CP0 ships `content/outline.json`: all 8 units and their nodes (type, title, one-sentence goal). Full lesson bodies arrive per checkpoint (Unit 1 in CP1, etc.).
- Nodes whose lesson isn't written yet show an honest "Wick is still drawing this one" state with the real goal text. No lorem ipsum, no dead buttons (brief §9 CP0 "placeholder-free empty states").

## D-007 — Agents

- Agents are TypeScript modules in `/agents/<name>/` implementing one shared interface (`agents/types.ts`) and run with `pnpm agents:run [name]` via `tsx`.
- Each writes `/reports/<agent>/<date>.md` plus a machine-readable `/reports/<agent>/latest.json`. The Orchestrator aggregates the latest results into `/reports/summary.json`, which `/admin/health` reads.
- Status is `green | amber | red`. A check that is only a stub reports **amber** with the reason `stub`, never green. **Red blocks the release** (non-zero exit code).
- Every agent has a canary: a deliberately broken fixture proving the agent catches the problem. Canaries run under Vitest (`agents/**/*.canary.test.ts`).
- Dated markdown reports are git-ignored (regenerated); `latest.json` and `summary.json` are also generated. Only `.gitkeep` files are committed.

## D-008 — Sounds

- All sounds are **synthesized by our own script** (`scripts/generate-sounds.ts`: sine/triangle tones with envelopes) and written as WAV into `public/sounds`. They're original, so no third-party license is involved; they are effectively CC0 and we dedicate them to the public domain.
- Playback through Howler.js behind `src/lib/sound.ts`, which respects the mute toggle, the volume setting, and "sounds off".

## D-009 — Questions deferred (not blocking CP0)

- **Anthropic API key** is needed from CP6. Read from `ANTHROPIC_API_KEY` in `.env.local`. Never committed.
- **Real historical market data:** until licensing is confirmed, CP2+ use clearly labeled synthetic sessions (brief §5). A real-data adapter (`yahoo-finance2`) will be opt-in and labeled "delayed/historical, not live".
- **Trademark check** on the name Candlo before any public release.

## D-010 — Bosses in Units 1–4 are challenge bosses (until Trade Lab exists)

- BRIEF §3 defines a boss as a 10-minute simulated trading session, but the simulator arrives in CP4. Until then, the bosses of Units 1–4 are **challenge bosses**: a mixed round of questions and chart-spot items. In CP4/CP5 each gets a short replay mini-session added. From Unit 5 on, bosses are simulated sessions as written in the brief.
- "What to do next" (BRIEF §4 Unit 8) is a **page** (`/graduation`, CP7), not a path node, so every unit still ends with a boss.

## D-011 — Nothing is locked on the path map

- Unlimited hearts means mistakes never block progress, and we extend that: every node can be opened at any time. The next step in course order is highlighted ("Start"); later steps are shown softer but never lock-iconed.
- Nodes whose lesson isn't written yet open a sheet with the real goal and an honest "Wick is still drawing this one" message (D-006).

## D-012 — Testing choices

- **e2e runs against a production build** (`next build && next start`) on its own database (`prisma/e2e.db`). A cold `next dev` compiles each route on first visit (~10 s) and made first-visit tests flaky.
- The e2e suite runs on two projects (desktop Chrome, Pixel 7) and includes an axe-core smoke test (WCAG A/AA serious+critical) in light and dark. The full per-route axe agent is still CP8.
- Playwright writes `reports/e2e/latest.json`; the Orchestrator reads it to decide whether a checkpoint's acceptance criteria are met (e2e test titles carry tags like `@cp0-onboarding`).
- Agent canaries live next to each agent (`agents/<id>/<id>.canary.test.ts`) and build broken fixture trees on the fly (`agents/testing.ts`) instead of committing broken files.
- Vitest 5: component tests opt in to jsdom with a `// @vitest-environment jsdom` comment.
- ESLint is pinned to v9 because `eslint-config-next@15` does not support v10.

## D-013 — Sync model details

- Profile and settings sync **last-write-wins per section** by `updatedAt` (client-assigned). The app shell waits for the first sync (2.5 s timeout) before deciding to show onboarding, so a learner who cleared their browser is recognised from the database.
- IndexedDB-backed stores fall back to localStorage when IndexedDB is unavailable.

## D-014 — Local-only security posture

- No accounts (single learner, own machine), so API routes protect against **cross-site and rebinding** attacks instead: state-changing endpoints require `Content-Type: application/json` and a matching `Origin` (`src/server/guard.ts`, pure checks in `src/lib/request-guard.ts`); the endpoint that runs agents additionally requires a loopback `Host`.
- If Candlo is ever hosted for other people (a LATER item: multi-user), real authentication and per-user authorization must be added before exposing these routes.

## D-015 — Follow-ups from the CP0 cleanup review (deliberately not done in CP0)

- **Sync registry / server revisions (CP1):** today sync is per-section with client timestamps and a conditional server write. When progress joins sync, replace this with a registry of sections and, if needed, server-assigned revisions (compare-and-set, 409 + current copy).
- **Risk reminder as one component (CP1):** a shared `<RiskReminder />` used by every trade-related screen, asserted by the e2e route list, instead of per-file copy checked by the Safety agent.
- **Token-based a11y checks (CP8):** define colors as TypeScript tokens and compute contrast from them, plus the axe + bounding-box checks from Playwright, so the Accessibility agent stops parsing CSS with regexes.
- **Checkpoint criteria as data (CP1):** move acceptance criteria out of `agents/orchestrator/checkpoints.ts` into a data file with a `current` pointer.
- **Whole-store selectors** on Settings/Profile/Onboarding screens: select only used fields when these screens grow.

## D-016 — CP1 scope: what "all question types except Trade Lab and Boss" means

- Built in CP1: **Teach, Match, Multiple choice, True/False, Chart spot, Build.**
- **Ask the Coach** (free chat) and the AI **"Why?"** explanation need the Claude API, so they arrive in **CP6**. Until then every question carries an authored explanation, and "Why?" shows that explanation. No dead Coach button is shown in lessons.
- **Chart spot** in CP1 uses a small SVG candle renderer (`src/components/lesson/candle-chart.tsx`) on synthetic candles, so Unit 1 can ask "is this market going up or down?". CP2 brings Lightweight Charts for Chart School and the simulator; the SVG renderer stays for small, non-interactive lesson pictures.
- **Match** supports tap-to-pair (always available, keyboard and screen-reader friendly) and drag-and-drop on top of it.
- **Build** assembles a statement from blocks into slots. In Unit 1 it builds sentences and the profit sum; trading-rule blocks ("Enter when…") arrive with Units 5–6.
- Bosses in Units 1–4 are challenge bosses (D-010). Chest nodes are always open and award XP once.

## D-017 — Game rules (XP, Focus, streaks)

- **XP:** lesson 10 base + 2 per first-try answer + 5 perfect bonus; practice 8 base + 1 per first-try answer; boss 20 base + 3 per first-try answer; chest 15 once. **Repeats give 5 XP** (reviewing keeps a streak alive). Daily goal default 30 XP.
- **Focus meter** (replaces hearts): fills +1 per correct answer, **never drops on a mistake**; when full it pops confetti and gives +3 XP, then resets. It is cosmetic and never gates anything.
- A wrong answer shows the correct answer plus the explanation, then the question comes back **once** at the end for a second try. After that we move on. Score (0–100) = share of questions right on the first try; it is informational only.
- **Streak** = consecutive days with XP > 0 (derived from daily activity, never a free counter). A **streak freeze** is earned on every 7th streak day (hold at most 2) and is spent automatically on a missed day.
- **Weekly "against yourself":** XP in the last 7 days vs the 7 days before. **Trader Ranks** (Bronze → Diamond) come from level; the league board shows clearly labelled **practice rivals** with generated names (not real people), as the brief asks.

## D-018 — Progress sync: monotonic merge instead of timestamps

- Progress only ever grows (steps get done, XP and attempts go up), so the browser and SQLite merge with a pure function (`mergeProgress`): done beats not-done, scores/attempts/XP take the max, earliest completion date wins, flags are OR-ed, and total XP is **recomputed from the daily record**. Both sides converge without clocks or conflicts. This replaces the per-section timestamp scheme for progress only; profile/settings keep last-write-wins (D-013).
- `freezes` is no longer stored: it is derived from days (earned − used), so it can't drift.

## D-019 — Reading-level rule as implemented

- Every sentence of lesson copy (slides, questions, explanations, glossary text) is scored with the Flesch-Kincaid grade formula per sentence. **Glossary terms and their aliases count as one-syllable words** (they are "defined terms"), and must be defined before first use. Limit: **grade ≤ 2.0**; the Curriculum Auditor turns anything higher red.
- Slides: one idea, **at most 3 sentences**. Lessons that touch trading carry the risk reminder (rendered by one shared `<RiskReminder />`).

## D-020 — Decisions made while building CP1

- **"AH/PH" in the brief:** the brief lists "AH/PH" in Unit 1. Candlo teaches **AH** (after-hours) and **PM** (pre-market), the terms traders actually use; "PH" is not a standard abbreviation. The abbreviations table lists both.
- **Short labels are graded differently:** Flesch-Kincaid is unstable on 1–4 word texts (the word "Apple" would score grade 8), so for fragments under 5 words (titles, answer options, labels) the rule is "no word longer than 3 syllables". Real sentences still use the full grade ≤ 2.0 formula. Both treat glossary terms as defined (one syllable).
- **Tap-chart questions have at most 6 candles** (enforced by the content audit): each candle must be a 52px tap target and every candle must fit a phone screen without sideways scrolling.
- **Review XP has no daily cap (yet).** Replays give a flat 5 XP so reviewing keeps a streak alive. XP is the learner's own motivation, not a trading result, and the league rivals are labelled as made up. If XP inflation ever matters, add a per-day review cap (needs a `reviewXp` column).
- **Progress merges are normalised:** after combining two copies, a day with XP is never "frozen" and no more days are frozen than freezes earned (`normalizeFreezes`). Server merges run one at a time so two tabs can't lose each other's update.
- **A bad content file fails loudly, on purpose.** Pages are prerendered at build time, the Curriculum Auditor canary runs in the pre-commit hook, and `pnpm content:check` explains what to fix, so broken content cannot reach a release.
- **Drag-and-drop is a mouse extra.** Match always works by tapping. The "you can also drag" hint only shows for devices with a precise pointer; on phones the meanings sit below the words, often off-screen.
- **Not built in CP1 (see D-016):** Ask-the-Coach chat and the AI "Why?" explanation arrive in CP6.

## D-021 — CP2 scope: Chart School

- **Real data, honestly labelled.** Daily charts use **real historical Apple (AAPL) prices, Feb 2015 – Feb 2017** (open, high, low, close, volume; from the MIT-licensed `plotly/datasets` repository, stored in `src/data/market/aapl-daily.json` with its source). Prices are as traded then, not adjusted. The page always says "Real history, not live".
- **Intraday is made up, and says so.** Free real 1-minute data is not available offline, so 1m/5m/15m/1h charts use a seeded **"Practice day"** generator (one 390-minute session, higher timeframes aggregated from the 1-minute bars). Every chart shows a label: "Real history: Apple daily" or "Made-up practice day". Never "live".
- **Lightweight Charts v5** draws every interactive chart (candles, volume, overlays, panes for RSI and MACD). The CP1 SVG chart stays for tiny lesson pictures.
- **Drawing tools are an SVG layer** on top of the chart (trendline, horizontal line, rectangle, Fibonacci, note, measure, magnet). Points are stored as (bar time, price), so they stay on the right candle when the chart scrolls or zooms. Everything has a **keyboard path** (arrow keys move a cursor, buttons snap to a candle's high/low/open/close).
- **TradingView itself is not embedded.** Lessons explain the real TradingView screen with pictures and the Chart Lab reproduces its tools on our own chart. The account lesson says plainly that an account is optional and never needed for Candlo.

## D-022 — Chart Lab question type

- New question type `lab`: an interactive chart plus one task (`find-bar`, `hline`, `trendline`, `box`, `fib`, `note`, `measure`, `timeframe`, `indicators`). Tasks are graded by pure functions in `src/lib/chart/lab.ts` with a tolerance written in the content, as a share of the visible price range or a number of candles. A teach slide may also carry a read-only `demo` chart, so each indicator is shown on a real chart as it is explained.
- Same gentle rules as every question: a miss shows the right answer and the explanation and comes back once. Nothing is ever blocked.

## D-023 — Indicators

- `src/lib/indicators/`: SMA, EMA (seeded with the SMA of the first N values, the standard way), RSI (Wilder smoothing), MACD (12, 26, 9), VWAP (resets every day), Bollinger Bands (20, 2 standard deviations, population deviation) and volume. Results line up with the bars; the warm-up part is `null` (never a made-up number).
- The **Financial Accuracy Checker** compares them to **independent reference implementations** (naive formulas written separately) and to **golden values computed with pandas** (committed in `agents/fixtures/indicators-golden.json`). A canary feeds it deliberately wrong indicators and expects red.
