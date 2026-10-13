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

  it("catches inconsistent progress rows inside the database", async () => {
    const url = `file:${join(mkdtempSync(join(tmpdir(), "candlo-db-")), "badprogress.db")}`;
    execSync("pnpm exec prisma db push", {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
    });
    const c = createClient({ url });
    await c.execute(`INSERT INTO "User" (id, createdAt) VALUES ('local', 0)`);
    await c.execute(`INSERT INTO "Profile" (userId, updatedAt) VALUES ('local', 0)`);
    await c.execute(`INSERT INTO "Settings" (userId, updatedAt) VALUES ('local', 0)`);
    // a finished step with no completion date, a score over 100, and a freeze used but never earned
    await c.execute(
      `INSERT INTO "NodeProgress" (userId, nodeId, status, bestScore, attempts, completedAt, updatedAt) VALUES ('local', 'u1-money', 'done', 140, 1, NULL, 0)`,
    );
    await c.execute(
      `INSERT INTO "DailyActivity" (userId, date, xp, lessonsDone, freezeUsed, freezeEarned) VALUES ('local', '2026-03-08', 0, 0, 1, 0)`,
    );
    c.close();
    const r = await run(dataIntegrity, fixture(schema), url);
    const check = r.checks.find((x) => x.id === "db-progress");
    expect(check?.status).toBe("red");
    expect(check?.detail).toMatch(/completion date|outside 0..100|frozen/);
  });

  it("control: a database with good progress rows passes db-progress", async () => {
    const url = `file:${join(mkdtempSync(join(tmpdir(), "candlo-db-")), "goodprogress.db")}`;
    execSync("pnpm exec prisma db push", {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
    });
    const c = createClient({ url });
    await c.execute(`INSERT INTO "User" (id, createdAt) VALUES ('local', 0)`);
    await c.execute(`INSERT INTO "Profile" (userId, updatedAt) VALUES ('local', 0)`);
    await c.execute(`INSERT INTO "Settings" (userId, updatedAt) VALUES ('local', 0)`);
    await c.execute(
      `INSERT INTO "NodeProgress" (userId, nodeId, status, bestScore, attempts, completedAt, updatedAt) VALUES ('local', 'u1-money', 'done', 90, 1, 1700000000000, 0)`,
    );
    await c.execute(
      `INSERT INTO "DailyActivity" (userId, date, xp, lessonsDone, freezeUsed, freezeEarned) VALUES ('local', '2026-03-08', 25, 1, 0, 0)`,
    );
    c.close();
    const r = await run(dataIntegrity, fixture(schema), url);
    expect(r.checks.find((x) => x.id === "db-progress")?.status).toBe("green");
  });
});
