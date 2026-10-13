import { cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runAgent } from "./orchestrator";
import type { Agent, AgentResult } from "./types";

const REAL_ROOT = process.cwd();

/**
 * Build a throw-away project tree for a canary test: copy the listed real files (the "healthy" copy),
 * then apply overrides (the deliberate breakage). `null` deletes nothing — it just skips the file.
 */
export function fixture(copy: string[], overrides: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "candlo-canary-"));
  for (const rel of copy) {
    if (rel in overrides) continue;
    const from = join(REAL_ROOT, rel);
    if (!existsSync(from)) continue;
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    cpSync(from, join(root, rel), { recursive: true });
  }
  for (const [rel, content] of Object.entries(overrides)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  }
  return root;
}

export function run(
  agent: Agent,
  root: string,
  dbUrl = "file:./prisma/dev.db",
): Promise<AgentResult> {
  return runAgent(agent, {
    root,
    dbUrl: dbUrl.startsWith("file:./") ? `file:${join(REAL_ROOT, dbUrl.slice(7))}` : dbUrl,
    date: "2026-01-01",
  });
}
