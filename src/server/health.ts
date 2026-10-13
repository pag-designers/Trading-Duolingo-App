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
    const data = JSON.parse(readFileSync(file, "utf8")) as Partial<Summary>;
    // An old-format or half-written file reads as "never run" instead of crashing the dashboard.
    return Array.isArray(data.results) && typeof data.overall === "string"
      ? (data as Summary)
      : null;
  } catch {
    return null;
  }
}

let inFlight: Promise<Summary> | null = null;

/** Run every agent. Overlapping calls (double click, two tabs) share one run so reports never race. */
export function runAgentsNow(): Promise<Summary> {
  inFlight ??= runAll({
    root: root(),
    dbUrl: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    date: localDate(),
  }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
