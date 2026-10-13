# Progress & Data Integrity

**Job:** make sure saved progress is trustworthy.
**Real checks now:** SQLite integrity check; every Prisma model has a table; every user has a profile and settings; an exported backup (`backups/latest.json`) passes the progress consistency rules in `src/lib/integrity.ts` (which can also repair).
**Arrives later:** browser-store vs database comparison (CP1), journal vs trades (CP4), restore round trip (CP8).
**Canary:** `data-integrity.canary.test.ts` (builds its own healthy DB; breaks tables, XP, dates, files, orphan users).
