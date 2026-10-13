# Curriculum Auditor

**Job:** keep lesson content correct and kid-readable.
**Real checks now:** outline matches its Zod schema; unique ids; each unit ends with exactly one boss; how many lesson bodies exist.
**Arrives later:** reading level (CP1), glossary-before-use (CP1), duplicate question ids and answer keys (CP1), risk reminder per trading lesson, broken links.
**Run:** `pnpm agents:run curriculum-auditor`. **Report:** `reports/curriculum-auditor/<date>.md`.
**Canary:** `curriculum-auditor.canary.test.ts` breaks the outline (no boss, duplicate id, missing field, bad JSON) and expects red.
