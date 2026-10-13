# Candlo — Architecture plan

Written in CP0. Update it when a checkpoint changes the shape of the system. Decisions and their reasons are in `DECISIONS.md`; the spec is `BRIEF.md`.

## 1. System at a glance

```
Browser (PWA)                                   Next.js server (local)                 Disk
┌──────────────────────────────────┐            ┌───────────────────────────┐      ┌──────────────┐
│ React 19 UI (App Router, client) │            │ Route handlers /api/*     │      │ prisma/dev.db│  SQLite (libSQL adapter)
│  ├─ Zustand stores (optimistic)  │◄──────────►│  ├─ profile, settings     │◄────►│              │
│  │   persisted: localStorage +   │  TanStack  │  ├─ progress, trades (CP1+)│      └──────────────┘
│  │   IndexedDB                   │  Query     │  └─ coach (CP6, streamed)  │      ┌──────────────┐
│  ├─ Lesson engine (CP1)          │            │ Server components          │◄────►│ /content/*.json (curriculum)
│  ├─ Charts: Lightweight Charts   │            │  └─ read content + reports │      │ /reports/*   (agent output)
│  ├─ Simulator engine (pure TS)   │            └───────────┬───────────────┘      └──────────────┘
│  └─ Sound (Howler) / Motion      │                        │ (CP6) Anthropic API: Sonnet (lessons, reviews), Haiku (hints)
└──────────────────────────────────┘
```

Everything runs locally for one learner. No auth. `User` is a real table, so multi-user later is additive.

## 2. Layers and rules

| Layer             | Location                          | Rule                                                                                                                                           |
| ----------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure domain logic | `src/lib/**` (no React, no I/O)   | Deterministic and unit-tested: simulator, indicators, pattern detectors, XP/streak math, readability scoring. Never imports from `components`. |
| Content           | `/content/**` + `src/lib/content` | JSON validated by Zod at load time and by the Curriculum Auditor. No curriculum text in components.                                            |
| State             | `src/store/**`                    | Zustand slices; each exposes selectors and pure reducers that are unit-tested. Persistence is a single wrapper.                                |
| Server API        | `src/app/api/**`                  | Thin: validate with Zod, call `src/server/**` (Prisma), return JSON. No business rules here.                                                   |
| UI primitives     | `src/components/ui/**`            | Radix + CVA, token-driven, 48px min tap targets.                                                                                               |
| Feature UI        | `src/components/<feature>/**`     | Mascot, path map, onboarding, later lesson/trade-lab.                                                                                          |
| Agents            | `/agents/**`                      | Independent of the app runtime; import only from `src/lib` and `/content`.                                                                     |

## 3. Directory map

```
BRIEF.md CLAUDE.md PROGRESS.md DECISIONS.md
docs/ARCHITECTURE.md
content/                outline.json (CP0) → units/*.json, glossary.json (CP1+)
prisma/schema.prisma    v1: User, Profile, Settings, UnitProgress, NodeProgress, XpEvent, DailyActivity, Trade, JournalEntry, AiUsage
prisma.config.ts
public/sounds/          generated WAVs
scripts/                generate-sounds.ts
agents/                 types.ts, run.ts, orchestrator/, curriculum-auditor/, financial-accuracy/, safety-guardrails/, pedagogy/, accessibility-ux/, performance/, data-integrity/
reports/<agent>/        dated .md + latest.json (generated); reports/summary.json
src/app/                (app)/ learn, trade-lab, chart-school, glossary, journal, profile, settings, admin/health ; onboarding ; api/
src/components/         ui/, mascot/, path/, onboarding/, shell/
src/lib/                sound, motion, content, utils …
src/store/              profile, settings, progress, persist
src/server/             db.ts (Prisma client), repositories
tests/                  unit (vitest) next to source as *.test.ts; e2e/ (Playwright)
```

## 4. Data model (schema v1)

- `User` (id, createdAt) — one seeded row `local`.
- `Profile` (userId, displayName, mascotName, onboardedAt) and `Settings` (userId, theme, soundOn, volume, reducedMotion, readingMode, dailyXpGoal, startingBalance, pdtEnabled, slippageBps, commissionPerTrade, coachModel). Both are 1:1 with `User`.
- `NodeProgress` (userId, nodeId, status, bestScore, completedAt, attempts) — unit/lesson completion keyed by content IDs, not DB IDs, so content edits don't orphan progress.
- `XpEvent` (userId, amount, reason, nodeId?, createdAt) and `DailyActivity` (userId, date, xp, lessonsDone) — streaks and the daily goal are derived from these, never stored as free-floating counters, so the Data Integrity agent can recompute and compare.
- `Trade` (userId, sessionId, symbol, side, qty, entry/exit price & time, fees, realizedPnl, plan fields, labelled data source) and `JournalEntry` (tradeId, reason, outcome notes, snapshot ref).
- `AiUsage` (userId, date, model, inputTokens, outputTokens, cached) for the daily counter.

Money is stored as integer **cents** (or integer micro-dollars for prices if needed); the simulator never uses floating point for balances.

## 5. Key flows

1. **First run:** `/` redirects to `/onboarding` if the profile has no `onboardedAt`. Four short steps: name, mascot greeting + sound preference, "simulated money + unlimited hearts" explainer, ready. Saves to Zustand → `PUT /api/profile`.
2. **Learn map:** server component reads `content/outline.json`; the client overlays progress from the store. Nodes are drawn on a winding SVG path; the current node pulses. Tapping a node opens a sheet with the goal and a start/preview action.
3. **Sound/motion:** one `useFeedback()` hook wraps Howler + Framer Motion variants and checks `soundOn`, `volume`, and `prefers-reduced-motion` in one place.
4. **Agents:** `pnpm agents:run` → each agent returns `{status, summary, checks[]}` → writes report files → orchestrator aggregates → `/admin/health` renders the summary (server component, `dynamic`).

## 6. Quality gates

- Pre-commit: `pnpm check` = `tsc --noEmit` + ESLint + Vitest.
- Per checkpoint: gates above + `pnpm agents:run` + Playwright flow + screenshots/evidence in `PROGRESS.md`.
- Canary tests: each agent has a deliberately broken fixture that must turn it red.
- Release is blocked by any red agent (`agents:run` exits non-zero).

## 7. Risks and mitigations

| Risk                                                     | Mitigation                                                                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Simulator math errors teach the wrong thing              | Pure integer-money engine, golden tests (CP4/5), Financial Accuracy agent against reference implementations.                       |
| First-grade reading level vs. precise finance terms      | Defined-term allow-list: glossary terms are exempt from the grade check but must be defined before first use (Curriculum Auditor). |
| Coach gives advice                                       | System-prompt guardrails + output filter in code + red-team suite that fails the build (CP6).                                      |
| Sandbox/network limits (blocked native binary downloads) | Prefer pure-npm prebuilt packages (libSQL, not better-sqlite3). Document any exception in `DECISIONS.md`.                          |
| Animation performance on phones                          | Animate transform/opacity only; one shared motion token set; reduced-motion honoured; Performance agent measures frames (CP8).     |
| Dual store drift (Zustand vs SQLite)                     | Single write path, `updatedAt` reconciliation, integrity agent.                                                                    |

## 8. Lesson engine (added in CP1)

```
content/lessons/<node>.json ─┐                        ┌─ pure, unit-tested (src/lib/lesson) ─┐
content/glossary.json        ├─ loadContent() ─ Zod ─►│ grade.ts   gradeAnswer / isAnswerComplete │
content/abbreviations.json   │   (src/lib/content)     │ session.ts reducer: slides → questions →   │
content/outline.json ────────┘                         │            feedback, one retry, Focus meter │
                                                       │ xp.ts      XP rules, score               │
 server (src/server/content.ts) resolves practice pools │ pool.ts    seeded mixing of earlier lessons │
 and sets each step's `ready` from the files that exist └──────────────────────────────────────────┘
                     │
   /lesson/[nodeId] (server, prerendered) ─► LessonRoute (client: waits for saved progress)
        └─ LessonPlayer ─ QuestionView (mc · tf · match · chart · build) · FeedbackPanel · FocusMeter · Confetti
        └─ CompleteScreen / ChestScreen ─ useProgress.finishNode() ─► SyncBridge ─► PUT /api/progress (merge)
```

- **Content audit** (`src/lib/content/audit.ts`, `pedagogy.ts`) is pure and shared by `pnpm content:check`, the Curriculum Auditor and the Pedagogy agent: reading level, terms defined before use, answer keys, risk reminder flag, links, one idea per slide, objective coverage.
- **Glossary**: `buildMatcher()` finds terms (longest first, plurals, ALL-CAPS exact) for the lesson highlights, the readability exemption and the audit.
- **Progress** is a growing record (days, steps). Streaks, freezes, weeks and levels are derived; browser and database merge with `mergeProgress` (D-018).
