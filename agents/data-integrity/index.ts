import { createClient } from "@libsql/client";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { checkProgress, type ProgressSnapshot } from "../../src/lib/integrity";
import type { DayMap } from "../../src/lib/progress";
import { fail, pass, readJson, readText, stub, warn } from "../lib";
import { e2eResults } from "../orchestrator/checkpoints";
import type { Agent, Check } from "../types";

const modelNames = (schema: string) =>
  [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]!);

export const dataIntegrity: Agent = {
  id: "data-integrity",
  name: "Progress & Data Integrity",
  job: "Database health, XP/streak/unlock consistency, corrupted saves and backups.",
  async run({ root, dbUrl }) {
    const checks: Check[] = [];

    // 1. Database: file opens, passes SQLite's own check, and has every table in the Prisma schema.
    const schema = readText(root, "prisma/schema.prisma");
    if (!schema)
      return [fail("schema", "Prisma schema exists", "prisma/schema.prisma is missing.")];
    const expected = modelNames(schema);
    try {
      const client = createClient({ url: dbUrl });
      const integrity = await client.execute("PRAGMA integrity_check");
      const ok = integrity.rows[0]?.[0] === "ok";
      checks.push(
        ok
          ? pass("sqlite-integrity", "SQLite integrity check", "Database file is healthy.")
          : fail("sqlite-integrity", "SQLite integrity check", String(integrity.rows[0]?.[0])),
      );

      const tables = (
        await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
      ).rows.map((r) => String(r[0]));
      const missing = expected.filter((m) => !tables.includes(m));
      checks.push(
        missing.length === 0
          ? pass("tables", "All schema tables exist", `${expected.length} tables.`)
          : fail(
              "tables",
              "All schema tables exist",
              `Missing: ${missing.join(", ")}. Run: pnpm db:push`,
            ),
      );

      if (missing.length === 0) {
        const orphans = await client.execute(
          `SELECT u.id FROM "User" u
           LEFT JOIN "Profile" p ON p.userId = u.id
           LEFT JOIN "Settings" s ON s.userId = u.id
           WHERE p.userId IS NULL OR s.userId IS NULL`,
        );
        checks.push(
          orphans.rows.length === 0
            ? pass("user-rows", "Every user has a profile and settings", "Consistent.")
            : fail(
                "user-rows",
                "Every user has a profile and settings",
                `${orphans.rows.length} user(s) incomplete. Opening the app repairs this.`,
              ),
        );
      }
      if (missing.length === 0) {
        // Progress stored in the database must be internally consistent (the same rules as a backup file).
        const dayRows = (
          await client.execute(
            'SELECT date, xp, lessonsDone, freezeUsed, freezeEarned FROM "DailyActivity"',
          )
        ).rows;
        const nodeRows = (
          await client.execute(
            'SELECT nodeId, status, bestScore, attempts, completedAt FROM "NodeProgress"',
          )
        ).rows;
        const days: DayMap = {};
        for (const r of dayRows) {
          days[String(r[0])] = {
            xp: Number(r[1]),
            lessonsDone: Number(r[2]),
            ...(r[3] ? { frozen: true } : {}),
            ...(r[4] ? { freezeEarned: true } : {}),
          };
        }
        const nodes: ProgressSnapshot["nodes"] = {};
        for (const r of nodeRows) {
          nodes[String(r[0])] = {
            status: String(r[1]),
            bestScore: Number(r[2]),
            attempts: Number(r[3]),
            completedAt: r[4] === null || r[4] === undefined ? null : String(r[4]),
          };
        }
        const problems = checkProgress({
          totalXp: Object.values(days).reduce((n, d) => n + d.xp, 0),
          days,
          nodes,
        });
        checks.push(
          problems.length === 0
            ? pass(
                "db-progress",
                "Progress rows in the database are consistent",
                `${nodeRows.length} steps, ${dayRows.length} days.`,
              )
            : fail(
                "db-progress",
                "Progress rows in the database are consistent",
                problems
                  .slice(0, 3)
                  .map((p) => p.message)
                  .join("; "),
              ),
        );
      }
      client.close();
    } catch (e) {
      checks.push(
        fail(
          "sqlite-open",
          "Database opens",
          `${(e as Error).message}. Run: pnpm db:generate && pnpm db:push`,
        ),
      );
    }

    // 2. Backup/snapshot: audit the most recent exported progress file, if there is one.
    const backupPath = ["backups/latest.json"].find((p) => existsSync(join(root, p)));
    if (!backupPath) {
      checks.push(
        warn(
          "backup-audit",
          "Exported backup is consistent",
          "No backups/latest.json to audit. Export one from Profile → Export my progress.",
        ),
      );
    } else {
      try {
        const file = readJson(root, backupPath) as { progress?: ProgressSnapshot };
        if (!file.progress) throw new Error("no progress section");
        const problems = checkProgress(file.progress);
        checks.push(
          problems.length === 0
            ? pass("backup-audit", "Exported backup is consistent", "XP, days and steps agree.")
            : fail(
                "backup-audit",
                "Exported backup is consistent",
                problems
                  .slice(0, 3)
                  .map((p) => p.message)
                  .join("; "),
              ),
        );
      } catch (e) {
        checks.push(
          fail(
            "backup-audit",
            "Exported backup is consistent",
            `Backup unreadable: ${(e as Error).message}`,
          ),
        );
      }
    }

    // The browser store matching the database after each action is proven end to end by an e2e test.
    const e2e = e2eResults(root);
    const syncTests = e2e
      ? [...e2e.entries()].filter(([title]) => title.includes("@cp1-sync"))
      : [];
    checks.push(
      !e2e || syncTests.length === 0
        ? warn(
            "browser-vs-db",
            "Browser progress matches the database after each action",
            "No e2e result for the sync test yet. Run: pnpm e2e",
          )
        : syncTests.every(([, ok]) => ok)
          ? pass(
              "browser-vs-db",
              "Browser progress matches the database after each action",
              `${syncTests.length} e2e test(s) passed.`,
            )
          : fail(
              "browser-vs-db",
              "Browser progress matches the database after each action",
              "The e2e sync test failed. Progress in the browser and the database disagree.",
            ),
    );
    checks.push(stub("trade-journal", "Trade journal agrees with trades", "CP4"));
    checks.push(stub("restore", "Restore from backup round-trips", "CP8"));
    return checks;
  },
};
