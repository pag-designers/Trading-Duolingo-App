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
