# CLAUDE.md — Candlo

Candlo is a Duolingo-style app that teaches day trading to a complete beginner with simulated money. The master spec is **`BRIEF.md`** — read it fully before large changes. Decisions are in `DECISIONS.md`, status in `PROGRESS.md`, design in `docs/ARCHITECTURE.md`.

## Non-negotiables (from BRIEF §0 — these are product features)

1. Every trading-related lesson/screen carries a one-line reminder: **most day traders lose money; this app uses simulated money only.**
2. The simulator is honest: spreads, slippage, commissions, PDT rule, margin, stop gaps. No fake profits — all P&L/win rates come from real simulator trades.
3. The Coach never gives personalized buy/sell advice, price targets for real tickers, or guarantees. Not financial advice, in prompt, code and UI.
4. Market data is historical or clearly labeled synthetic. Never claim "live".
5. **Unlimited hearts.** Nothing is ever blocked by mistakes. No "out of hearts" screen anywhere. Use the cosmetic Focus meter.
6. First-grade reading level for lesson copy; every term defined in plain words on first use and linked to the glossary.

## Current state

**CP0 and CP1 are done. Waiting for the owner's “go” before CP2 (Chart School).** See `PROGRESS.md`. **Work one checkpoint at a time (CP0–CP8). Stop after each and report in the §10 format. Wait for "go". Do not build LATER items.** Never leave the app broken at the end of a checkpoint.

## Commands

```bash
pnpm install
pnpm db:generate && pnpm db:push   # Prisma client + local SQLite file (prisma/dev.db)
pnpm dev                           # http://localhost:3000
pnpm check                         # typecheck + lint + unit tests (also the pre-commit hook)
pnpm test | pnpm e2e               # Vitest | Playwright (uses /opt/pw-browsers chromium when PLAYWRIGHT_BROWSERS_PATH is set)
pnpm agents:run [name]             # run all agents (or one); exits non-zero on any red
pnpm sounds:generate               # regenerate public/sounds/*.wav
pnpm content:check                 # audit /content: reading level, glossary, answer keys, links
```

Do **not** run `playwright install` (Chromium is preinstalled in the cloud environment).

## Conventions

- TypeScript strict. No `any` (use `unknown` + Zod). Prettier + ESLint are law; run `pnpm format` before committing.
- Domain logic in `src/lib/**` is pure and unit-tested. Money is integer cents; never float for balances.
- Content lives in `/content` as JSON validated by Zod. No curriculum text in components. Lesson copy must pass `pnpm content:check` (grade ≤ 2; every term defined before first use). Show the risk reminder with `<RiskReminder />`, never hand-written text.
- UI: Tailwind v4 tokens from `src/app/globals.css` only (no hard-coded hex in components). Body text ≥ 18px, tap targets ≥ 48px, dark mode for every screen. Animate `transform`/`opacity` only; honour `prefers-reduced-motion` and the sound settings through `useFeedback()` / `src/lib/sound.ts`.
- Gain = green and loss = coral are reserved for market meaning; primary actions use the brand color (see DECISIONS D-003).
- Brand voice: short sentences, emojis sparingly, celebratory micro-copy, no jargon without a definition.
- API routes are thin: Zod-validate, call `src/server/*`, return JSON.
- Imports use the `@/` alias for `src/`.
- Commit messages: imperative, scoped (`feat(path): …`). Work on the branch named in the session instructions; never push elsewhere. Do not open a PR unless asked.

## Checkpoint procedure (BRIEF §9)

1. Update CLAUDE.md, PROGRESS.md, DECISIONS.md.
2. Run `pnpm check`, relevant agents, and play through the flow (Playwright + screenshots).
3. Record evidence in PROGRESS.md (including canary results for any agent touched).
4. Report: **Checkpoint N — DONE/PARTIAL**, How to try it (≤ 8 steps), Verified by, Known issues, Questions (only if blocking).

## Agents (`/agents`)

Curriculum Auditor · Financial Accuracy · Safety & Guardrails · Pedagogy · Accessibility & UX · Performance · Progress & Data Integrity · Orchestrator. Stubs report **amber**, never green. Each needs a canary test proving it catches a broken fixture.
