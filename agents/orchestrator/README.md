# Orchestrator (Supervisor)

**Job:** run every agent, write `reports/<agent>/<date>.md` + `latest.json`, write `reports/summary.json` and `summary.md`, track the current checkpoint's acceptance criteria, and gate the release.
**Rules:** any red → release **blocked** (exit code 1). Amber → ready with warnings. All green → ready. A crashing agent becomes red.
**Dashboard:** `/admin/health` reads `reports/summary.json`; the Run button calls `POST /api/admin/health`.
**Run:** `pnpm agents:run` (all) or `pnpm agents:run pedagogy performance`.
**Canary:** `orchestrator.canary.test.ts`.
