import { createClient } from "@libsql/client";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { fixture, run } from "../testing";
import { dataIntegrity } from ".";

const schema = ["prisma/schema.prisma"];
const goodBackup = {
  progress: {
    totalXp: 30,
    days: { "2026-03-10": { xp: 30, lessonsDone: 2 } },
    nodes: {
      "u1-money": {
        status: "done",
        bestScore: 90,
        attempts: 1,
        completedAt: "2026-03-10T10:00:00.000Z",
      },
    },
    freezes: 0,
  },
};

async function emptyDb(): Promise<string> {
  const url = `file:${join(mkdtempSync(join(tmpdir(), "candlo-db-")), "empty.db")}`;
  const c = createClient({ url });
  await c.execute("CREATE TABLE unrelated (id INTEGER)");
  c.close();
  return url;
}

describe("Progress & Data Integrity canary", () => {
  let healthyDb = "";
  beforeAll(() => {
    // Build a real, healthy database from the Prisma schema so this test never depends on a local dev.db.
    healthyDb = `file:${join(mkdtempSync(join(tmpdir(), "candlo-db-")), "healthy.db")}`;
    execSync("pnpm exec prisma db push", {
      env: { ...process.env, DATABASE_URL: healthyDb },
      stdio: "pipe",
    });
  }, 60_000);

  it("control: a healthy database and a good backup are not red", async () => {
    const r = await run(
      dataIntegrity,
      fixture(schema, { "backups/latest.json": JSON.stringify(goodBackup) }),
      healthyDb,
    );
    expect(r.checks.filter((c) => c.status === "red")).toEqual([]);
  });

  it("catches a database that is missing the schema's tables", async () => {
    const r = await run(dataIntegrity, fixture(schema), await emptyDb());
    expect(r.checks.find((c) => c.id === "tables")?.status).toBe("red");
  });

  it("catches XP that disagrees with the daily record in a backup", async () => {
    const bad = structuredClone(goodBackup);
    bad.progress.totalXp = 500;
    const r = await run(
      dataIntegrity,
      fixture(schema, { "backups/latest.json": JSON.stringify(bad) }),
      healthyDb,
    );
    expect(r.checks.find((c) => c.id === "backup-audit")?.status).toBe("red");
  });

  it("catches a finished step with no completion date", async () => {
    const bad = structuredClone(goodBackup);
    bad.progress.nodes["u1-money"]!.completedAt = null as unknown as string;
    const r = await run(
      dataIntegrity,
      fixture(schema, { "backups/latest.json": JSON.stringify(bad) }),
      healthyDb,
    );
    expect(r.checks.find((c) => c.id === "backup-audit")?.status).toBe("red");
  });

  it("catches a corrupted (unreadable) backup file", async () => {
    const r = await run(
      dataIntegrity,
      fixture(schema, { "backups/latest.json": "{{{{ not json" }),
      healthyDb,
    );
    expect(r.checks.find((c) => c.id === "backup-audit")?.status).toBe("red");
  });

  it("catches a user without profile and settings rows", async () => {
    const url = `file:${join(mkdtempSync(join(tmpdir(), "candlo-db-")), "orphan.db")}`;
    const c = createClient({ url });
    for (const t of ["User", "Profile", "Settings"])
      await c.execute(`CREATE TABLE "${t}" (id TEXT, userId TEXT)`);
    await c.execute(`INSERT INTO "User" (id) VALUES ('local')`);
    c.close();
    // Use a schema that names only these three models so "tables" passes and "user-rows" is exercised.
    const tiny = "model User {\n}\nmodel Profile {\n}\nmodel Settings {\n}\n";
    const r = await run(dataIntegrity, fixture([], { "prisma/schema.prisma": tiny }), url);
    expect(r.checks.find((c2) => c2.id === "user-rows")?.status).toBe("red");
  });
});
