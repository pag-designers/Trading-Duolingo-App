# Candlo

A Duolingo-style app that teaches day trading to complete beginners, with **simulated money only**. Most day traders lose money; Candlo says so on every trading screen.

- Master spec: [`BRIEF.md`](BRIEF.md) · Status: [`PROGRESS.md`](PROGRESS.md) · Decisions: [`DECISIONS.md`](DECISIONS.md) · Design: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Working rules: [`CLAUDE.md`](CLAUDE.md)

## Run it

```bash
pnpm install              # also generates the Prisma client
pnpm db:push              # creates the local SQLite file (prisma/dev.db)
pnpm dev                  # http://localhost:3000
```

Useful: `pnpm check` (typecheck + lint + tests), `pnpm e2e`, `pnpm agents:run`, `/admin/health` in the app.
