# MASTER BRIEF — TradeQuest: a Duolingo-style app that teaches day trading

You are the lead engineer, curriculum designer, UX designer, and QA team for a new application. Read this entire brief before writing any code. It is the single source of truth. Anything marked **LATER** is out of scope for now.

---

## 0. Purpose, audience, and honesty rules

- **One learner (the owner of this machine) for now.** No accounts, no billing. Design the data model so multiple users could be added later.
- **Goal:** take a complete beginner (assume zero finance knowledge, reading level of a first grader) from "what is a stock?" to confidently reading a TradingView chart, recognizing candlestick and chart patterns, understanding order types, risk management, and how a day-trading session works, using hands-on simulated trading.
- **Non-negotiable honesty rules (these are product features, not disclaimers):**
  1. Every lesson that touches trading includes a one-line reminder that **most day traders lose money**, and that the app uses simulated money only.
  2. The simulator must model reality honestly: spreads, slippage, commissions (configurable, default $0 for stocks like most brokers), the **pattern day trader rule** (accounts under $25,000 in the US are limited to 3 day trades in 5 business days — the simulator enforces it when enabled), margin, and stop-losses that can gap past the stop price.
  3. The AI tutor must never give personalized buy/sell advice or tell the learner what to trade in real markets. It teaches concepts, explains a chart the learner shows it, and reviews the learner's simulated trades. Add a clear "not financial advice" guardrail into the tutor's system prompt and UI.
  4. No fake profits. Win rates and P&L shown must come from the simulator's actual trades.
  5. Use **historical or clearly-labeled synthetic market data** for the lessons. Never claim the data is live.
- **Tone:** encouraging, playful, zero jargon without a definition the first time it appears. Every term is explained in plain words, with an analogy, the first time it appears, and is linked to a glossary entry.

---

## 1. The app's name and identity

- **Choose the name yourself** in Checkpoint 0, short and memorable, English, and with a playful mascot (a character — e.g., a small animated bull/bear/candle creature — designed in SVG so it animates). Record the name and mascot concept in DECISIONS.md.
- Brand voice is consistent across the app: short sentences, emojis used sparingly, celebratory micro-copy.

---

## 2. Tech stack (decided — do not relitigate)

| Layer | Choice |
|---|---|
| App | **Next.js 15** (App Router), **TypeScript strict**, **Tailwind CSS v4**, **shadcn/ui**, **Framer Motion** (animations), **Zustand** (state, persisted to localStorage + IndexedDB), **TanStack Query**, **Zod** validation, **lucide-react** icons. |
| Packaging | Web app first (PWA, installable on phone and desktop). Optional Electron wrapper is LATER. |
| Charts | **Lightweight Charts** (TradingView's open-source library, Apache 2.0) for candlestick charts, indicators, and drawing tools in the simulator. |
| Sounds | **Howler.js** for sound playback. Sounds are generated or licensed CC0 assets stored in `/public/sounds`; no copyrighted audio. |
| Database | **SQLite via Prisma** for progress, streaks, trades and settings (local, single-user). |
| Market data | **Bundled historical datasets** (see §6) generated from a deterministic script, plus an optional adapter to free delayed/historical sources (e.g., Yahoo Finance via `yahoo-finance2`) that the learner can enable. Never presented as live. |
| AI tutor | **Anthropic Claude API** (`claude-sonnet-4-5` or newest Sonnet for lessons and chart explanations; newest Haiku for quick hints, glossary lookup and short answers). Prompt caching on the curriculum context. Streamed responses. The learner can paste or screenshot a TradingView chart and ask about it (vision). |
| Testing | **Vitest** (unit, including simulator math), **Playwright** (e2e for each lesson type), golden tests for the simulator's fill/P&L calculations. |
| Tooling | pnpm, ESLint, Prettier, Husky pre-commit (typecheck + lint + test). |

---

## 3. Game design (the Duolingo layer)

- **Unlimited hearts.** Lives never decrease and never block progress. Mistakes still show the correct answer and a short explanation, but nothing is locked. A "Heart" concept is replaced by a **Focus meter** (cosmetic, fills with correct answers, rewards with confetti). Do not show "out of hearts" screens anywhere.
- **XP, streaks, and daily goals.** XP per lesson, a daily XP goal, a streak counter with a flame animation, a "freeze" item earned by streaks, and a weekly leaderboard that is **against yourself** (past week vs this week) plus a mock "Trader Ranks" league (Bronze → Diamond) with names generated from a list and no real users.
- **Units → lessons → checkpoints.** Each unit is a skill path drawn as a winding map with nodes. Nodes are: lesson, practice, chart challenge, trade challenge, boss (end-of-unit simulated trading test), and chest (bonus).
- **Lesson types** (all must exist):
  1. **Teach** — slides with animated illustrations, one idea at a time.
  2. **Match** — drag terms to definitions/pictures.
  3. **Multiple choice** and **true/false**.
  4. **Chart spot** — identify the candle or pattern on an actual chart.
  5. **Build** — assemble a trading rule from blocks ("Enter when…", "Stop if…").
  6. **Trade lab** — simulated trading on a chart with a time-lapse replay.
  7. **Ask the Coach** — free-chat with the AI tutor, scoped to the current lesson.
  8. **Boss** — 10-minute simulated session with a risk rule check.
- **Feedback:** immediate, with a short explanation; wrong answers get a "Why?" button that opens an AI explanation (cached per question).
- **Sounds:** correct chime, wrong soft buzz (never harsh), level-up fanfare, streak sparkle, cash register for a profitable trade, gentle thud for a stop-loss, page-turn for teach slides, mute toggle and volume in settings. Respect `prefers-reduced-motion` and a "sounds off" option.
- **Animations:** Framer Motion for node pulses, XP counter rolls, confetti on lesson completion, candle "drops" animation for teach slides, ripple on correct answers, shake on wrong (gentle). All must run at 60 fps on a mid-range phone.
- **Aesthetic:** bright, friendly, rounded shapes, bold color system with a dark mode, large readable type (minimum 18px body), generous tap targets (48px+), clean illustrations (SVG). Think Duolingo's warmth crossed with a modern trading terminal in the simulator.

---

## 4. Curriculum (complete, first-grade reading level, every term explained)

Write all lesson content as structured JSON/MDX in `/content/` so it can be edited without code. Each lesson has: title, goal in one sentence, teach slides (max 3 sentences each), practice questions, a glossary list, and an optional chart or trade exercise. Every unit ends with a boss. Reading level check: every sentence must score at a first-grade reading level (use a readability check script; flag anything above grade 2 unless it's a defined term).

**Unit 1 — Money and markets (the basics)**
- What money is, what a company is, what a stock is ("a tiny piece of a company you can own"), what a share is, what a market is.
- Buying low and selling high, what "profit" and "loss" mean, the stock market as a store for company pieces.
- Ticker symbols and abbreviations: what AAPL, TSLA, NVDA, SPY, QQQ, ETFs, and ADRs mean; how to read a ticker, the exchange suffixes, and common abbreviations (EPS, P/E, IPO, CEO, GDP, Fed, FOMC, CPI, ATH, ATL, EOD, AH/PH, OTC, DD, HODL, FOMO, YOLO, bid/ask, vol, mcap, RSI, MACD, VWAP) — each with meaning and an example.
- Bulls, bears, "the market is up/down", indexes (S&P 500, Nasdaq, Dow) in plain words.

**Unit 2 — Reading a TradingView chart (learn the tool)**
- Create a free TradingView account (the app explains how; it does not require one for the simulator). Tour: symbol search, timeframes (1m, 5m, 15m, 1h, D, W), chart types, zoom, scroll, crosshair, the price scale, the volume bars, the watchlist, and the layout.
- Reading the axes, the OHLC legend, the time axis, and the "Remove/Reset chart" menu.
- Drawing tools: trendlines, horizontal lines, rectangles, Fibonacci retracement (plain explanation), text notes, and the magnet/measure tools. Each is taught with a hands-on exercise inside the simulator's embedded chart.
- Indicators taught one at a time, each with a plain-language "what it's trying to tell you" and a "don't rely on it alone" note: Moving Averages (SMA/EMA), VWAP, RSI, MACD, Bollinger Bands, Volume. Build an indicator-toggle exercise.

**Unit 3 — Candlesticks**
- What one candle shows: open, high, low, close; green vs red; body vs wicks (shadows).
- Single candles: Doji, Hammer, Shooting Star, Marubozu, Spinning Top — each explained with a "what it might mean" and a "what it doesn't tell you" line.
- Two- and three-candle patterns: Engulfing, Harami, Piercing Line, Dark Cloud Cover, Morning Star, Evening Star, Three White Soldiers, Three Black Crows.
- Chart spot exercises on real or synthetic charts for every pattern.

**Unit 4 — Chart patterns and market structure**
- Trend: uptrend (higher highs, higher lows), downtrend, sideways/range. Trendline drawing.
- Support and resistance; breakouts and fakeouts; retests.
- Patterns: Double Top/Bottom, Head and Shoulders, Inverse Head and Shoulders, Triangles (ascending, descending, symmetrical), Flags and Pennants, Wedges, Channels, Cup and Handle. For each: how it forms, what the learner should watch, how to measure a target, and why patterns fail.
- Volume confirmation.
- Gap types (common, breakaway, runaway, exhaustion) and gap fill.

**Unit 5 — Day trading mechanics**
- What day trading is (open and close the same day), what a session looks like (pre-market, regular hours 9:30–16:00 ET, after-hours; the open and the close are the busiest times), what "liquidity" means, what the spread is.
- Order types: market, limit, stop, stop-limit, trailing stop, bracket order (entry + stop + target), OCO. Each with a simulated exercise.
- Long vs short selling, what "shorting" means and its risks (borrowing shares, unlimited loss in theory).
- Pattern day trader rule and margin, explained in plain words with the simulator enforcing it.
- Common day-trading strategies, taught as ideas to study, not recipes: opening range breakout, VWAP reclaim, pullback to moving average, news momentum, gap and go. Each with setup, entry, stop, target, and "what makes it fail."

**Unit 6 — Risk management (the most important unit)**
- Position sizing: risk per trade (1% rule suggested as a learning default), how to compute shares from a stop distance, risk-to-reward ratio, and why losing streaks happen even with a good edge.
- Stop-loss placement; gapping through stops; slippage.
- Journaling: what to write after each trade; the simulator generates a trade journal and a performance summary (win rate, average win/loss, expectancy, max drawdown).
- Psychology: FOMO, revenge trading, overtrading, the "one more trade" trap. Each with a simulated scenario where the learner feels the pull and can choose.
- Fees, taxes (simple plain-language overview: short-term gains taxed as ordinary income in the US — not tax advice).

**Unit 7 — Reading the news and the economy (for context, not prediction)**
- Earnings reports, guidance, EPS and revenue beats/misses, the economic calendar, Fed decisions, CPI and jobs reports, how news moves prices, "buy the rumor, sell the news."
- Each lesson includes a simulated news event and the learner decides how to react (in simulation only).

**Unit 8 — Boss and graduation**
- Final 30-minute simulated session across three historical days with a daily loss limit that ends the day if breached. Graduation certificate (generated PNG/PDF) and a "What to do next" page that points to paper trading, reading more, and the fact that the learner should not risk money they can't lose.

**Glossary:** every term used anywhere is in a searchable glossary, with plain definition, an analogy, a first-grade-level example, and a link to where it's taught. Tap any highlighted term in any lesson to see it.

**Abbreviations page:** a full table of the abbreviations learned in Unit 1 and the ones that appear on TradingView and in news (e.g., EMA, SMA, VWAP, RSI, MACD, ATR, OHLC, EOD, AH, PM, IPO, SEC, ETF, ADR, ADV, RVOL, GAP%, MCAP), searchable and filterable.

---

## 5. Trade Lab simulator (the "trade for real, with fake money" part)

- **Starting balance:** $10,000 simulated (configurable). Pattern day trader rule enforcement on/off (default on for accounts under $25,000).
- **Chart:** Lightweight Charts with 1m/5m/15m/1h/D candles, volume, indicators the learner has unlocked, drawing tools, and crosshair OHLC readout. Timeframe switching is instant.
- **Replay mode:** a "time machine" that plays a historical session candle-by-candle at 1×, 2×, 5×, 10×, or step-by-step, so the learner makes decisions with only past information visible. This is the core teaching loop — no peeking at the future.
- **Order ticket:** buy/sell, market/limit/stop/stop-limit/bracket, shares or dollar amount, a live "risk if stopped out" and "potential reward" preview, and a position-size helper that computes shares from risk percent.
- **Fills:** market orders fill at the next candle's open plus spread and slippage (configurable); limit and stop orders fill only if price trades through them in the replay; stop-loss gaps fill at the gap price, not the stop price. All of this is shown to the learner in a "Why did I fill at this price?" explainer.
- **Positions and P&L:** live unrealized and realized P&L, average price, risk meter, and a "Did you follow your plan?" prompt at the end of each trade.
- **Trade journal:** auto-generated entry with the chart snapshot, the reason the learner typed, and the outcome; the learner can edit it.
- **Coach review:** after a session, the AI tutor reviews the trades in plain language: what went well, what went wrong, and one specific thing to practice. It never tells the learner what to buy or sell in real life.
- **Scenario lessons:** each Trade Lab lesson has a goal (e.g., "Use a stop-loss and keep your risk under 1%") and is graded with a rubric (did they use a stop, did they stay within risk, did they journal). Pass/fail is informational and never blocks progress (unlimited hearts).
- **Historical data:** bundled datasets for several synthetic and real historical sessions (real data only if licensing is clean and it is clearly labeled with date and source). Generated synthetic sessions use a seeded random-walk with realistic volatility clusters, gaps at the open, and volume patterns, so every learner sees the same lessons.

---

## 6. AI tutor (named "Coach" in the UI — rename per the app name)

- A chat panel available in every lesson, scoped to the current lesson's content, glossary and the learner's recent trades.
- **Modes:** Explain (explain a term or concept at first-grade level), Quiz me, Check my chart (learner uploads or pastes a chart screenshot and the Coach describes what it sees — patterns, trend, levels — and explains the concept, never recommending a trade), Review my trade (post-session review), and Ask anything about trading (answered within the guardrails).
- **Guardrails enforced in the system prompt and in code:** no personalized buy/sell advice, no price targets for real tickers, no guarantees, always mention risk when a trade is discussed, refuse requests for market manipulation, insider information, or to help evade pattern day trader rules in a real account. Log refusals.
- **Cost control:** Haiku for short hints; Sonnet for explanations and reviews; cache the curriculum system prompt; cap tokens per response; show a daily AI-usage counter in settings.
- **Grounding:** the Coach cites the lesson or glossary entry it used, with a link.

---

## 7. The agent team (the "little agents" that keep everything on track)

Build these as **real, runnable agents**, implemented as scripts/modules in `/agents/` that Claude Code can run locally and that also run automatically as checks (pre-commit hook, nightly job, or manual `pnpm agents:run`). Each agent has a single job, a README, and writes a report to `/reports/<agent>/<date>.md`.

1. **Curriculum Auditor** — checks every lesson for: required fields present, reading-level score (flag >grade 2 for non-glossary sentences), every term used is in the glossary, every trading term has a definition before first use, every lesson has a risk disclaimer where required, no broken links, no duplicate question IDs, answer keys correct.
2. **Financial Accuracy Checker** — unit-tests the simulator math (position sizing, P&L, fees, slippage, stop gap fills, PDT rule counting), checks indicator formulas against reference implementations (SMA, EMA, RSI, MACD, VWAP, Bollinger), and verifies candlestick pattern detectors on golden fixtures.
3. **Safety & Guardrails Agent** — runs red-team prompts against the AI Coach (trying to get personalized advice, price targets, evasion of PDT, manipulation) and fails the build if any answer violates the guardrails; checks that the honesty disclaimers appear in every trade-related screen.
4. **Pedagogy Agent** — checks each lesson's learning objectives map to a question and to a trade exercise; flags skills with no practice; flags units where difficulty jumps too fast; checks the "one idea per slide" rule.
5. **Accessibility & UX Agent** — axe-core accessibility scan on every route, contrast checks in light and dark mode, tap-target sizes, reduced-motion behavior, sound-off behavior, font-size minimum.
6. **Performance Agent** — Lighthouse budget (LCP < 2.5 s on a mid-range phone profile), chart render time with 10,000 candles, animation frame drops, bundle size budget, and AI latency tracking.
7. **Progress & Data Integrity Agent** — validates that XP, streaks, unlocks and the trade journal are consistent after each action; detects corrupted saves and offers a repair; backs up progress to a local export file.
8. **Orchestrator (Supervisor)** — runs all agents, aggregates results into one dashboard page (`/admin/health`) with green/amber/red per agent, blocks a release if any red, and writes a daily summary. It also tracks which checkpoint is in progress and whether acceptance criteria are met.

Each agent must be tested against a deliberately broken fixture to prove it catches the problem (a "canary" test). Record that in PROGRESS.md.

---

## 8. App structure and screens

- **Home / Learn** — the skill path map, current unit banner, streak and XP, daily goal ring, "continue" button.
- **Lesson** — full-screen lesson flow with progress bar, sounds, and the Coach button.
- **Trade Lab** — the simulator (§5), with a side panel for the order ticket, positions, journal, and Coach.
- **Chart School** — the TradingView-style guided tour and drills.
- **Glossary & Abbreviations** — searchable, filterable.
- **Journal** — all trades, the performance summary, and the reflection prompts.
- **Profile** — avatar/mascot, XP, badges, certificate, progress export.
- **Settings** — theme (light/dark/system), sounds and volume, reduced motion, reading mode (larger text), Coach model and daily AI usage, simulator rules (PDT on/off, starting balance, slippage), data backup/restore.
- **Admin / Health** — the agent dashboard (§7).
- **Onboarding** — a 3-minute first-run tour that asks the learner's name, sets the mascot, sets the sound preference, and explains that it's simulated money and unlimited hearts.

---

## 9. Checkpoints (each must be runnable and usable)

For each checkpoint: update CLAUDE.md, PROGRESS.md and DECISIONS.md; run typecheck, lint, tests and the relevant agents; play through the checkpoint's flow yourself; record evidence; then stop and report using the format in §10. Wait for "go" before the next checkpoint.

**CP0 — Foundation.** Choose the app name and mascot, Next.js/Tailwind/shadcn setup, design system (color tokens, light/dark, typography, motion tokens, sound system with mute), the Duolingo-style skill map shell with placeholder-free empty states, Zustand + persistence, Prisma schema v1, agent framework skeleton and the Health dashboard showing the agents running (even if most checks are still stubs flagged amber), the onboarding flow. Acceptance: app runs, onboarding works, the path map renders, dark mode works, agents run.

**CP1 — Unit 1 and the lesson engine.** Build the full lesson engine (all question types from §3 except Trade Lab and Boss), unlimited hearts, XP/streaks, sounds, animations, glossary tooltips, and complete Unit 1 content with the reading-level check passing. Acceptance: a learner can finish Unit 1, see XP and streak update, and reopen any lesson.

**CP2 — Chart School (Unit 2).** Lightweight Charts integration, TradingView tour and drills, indicator unlocks and the indicator exercise. Acceptance: learner completes Unit 2 on real chart data and the indicators compute correctly per the Financial Accuracy Checker.

**CP3 — Candlesticks and patterns (Units 3–4).** Pattern detectors, chart spot lessons, all candle and chart patterns with golden-fixture tests. Acceptance: chart spot questions grade correctly, detectors pass golden tests.

**CP4 — Trade Lab core.** Replay engine (no-peeking), order ticket with all order types, fill model, P&L, PDT rule, trade journal, risk preview and position sizing helper. Acceptance: a learner can replay a session, place and close trades, see honest fills, and get a journal entry; simulator math tests green.

**CP5 — Day trading mechanics and risk (Units 5–6).** Lessons plus Trade Lab challenges for order types, shorting, strategies (as study ideas), risk rules, journaling and psychology scenarios, and the performance summary. Acceptance: the risk challenge can be failed and retried; summary metrics match hand-calculated fixtures.

**CP6 — AI Coach.** Claude integration, all four modes, chart screenshot checks (vision), trade review, glossary grounding, guardrails and red-team tests, daily usage counter. Acceptance: Safety agent green; Coach refuses personalized advice in the red-team suite.

**CP7 — News and economy (Unit 7), Boss and graduation (Unit 8).** News scenario lessons, final boss session with daily loss limit, certificate generation, "What to do next" page. Acceptance: a learner can finish the entire course start to finish.

**CP8 — Polish, accessibility, and performance.** Full agent suite green (Accessibility, Performance, Curriculum, Accuracy, Safety, Pedagogy, Data Integrity), animation and sound polish, backup/restore, PWA install, final mascot and illustration pass, a full readability audit of all copy. Acceptance: every agent green and the Orchestrator releases.

**LATER (do not build now):** Electron desktop wrapper, real-time market data feeds, broker connections (paper or live), multi-user accounts and leaderboards with real users, options and futures lessons, translation into other languages, speech-to-text on the Coach.

---

## 10. Reporting format at the end of each checkpoint

1. **Checkpoint N — DONE / PARTIAL** and one paragraph of what works.
2. **How to try it** — numbered steps (max 8).
3. **Verified by** — what you ran and observed, including agent results.
4. **Known issues / deferred** — honest list.
5. **Questions for me** — only if blocking; otherwise "None — proceed with 'go' for CP N+1".

Begin now with **Checkpoint 0**. Before writing code: (a) create CLAUDE.md, PROGRESS.md and DECISIONS.md, (b) pick the app name and mascot and record them, (c) write the architecture plan, (d) list any blocking questions in one batch, then build.
