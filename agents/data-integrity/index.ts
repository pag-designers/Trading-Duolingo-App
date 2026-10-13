import { createClient } from "@libsql/client";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { checkProgress, type ProgressSnapshot } from "../../src/lib/integrity";
import { fail, pass, readJson, readText, stub, warn } from "../lib";
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

    checks.push(
      stub(
        "browser-vs-db",
        "Browser store matches the database after each action",
        "CP1 (when progress syncs)",
      ),
    );
    checks.push(stub("trade-journal", "Trade journal agrees with trades", "CP4"));
    checks.push(stub("restore", "Restore from backup round-trips", "CP8"));
    return checks;
  },
};
