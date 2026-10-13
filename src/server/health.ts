import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { localDate, runAll } from "@agents/orchestrator";
import type { Summary } from "@agents/types";

const root = () => process.cwd();

/** Latest aggregate written by `pnpm agents:run` (or the Run button), or null if never run. */
export function readSummary(): Summary | null {
  const file = join(root(), "reports", "summary.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Summary;
  } catch {
    return null;
  }
}

export function runAgentsNow(): Promise<Summary> {
  return runAll({
    root: root(),
    dbUrl: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    date: localDate(),
  });
}
