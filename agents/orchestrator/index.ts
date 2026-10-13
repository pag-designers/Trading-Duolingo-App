import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dateKey } from "../../src/lib/progress";
import { worst } from "../lib";
import { AGENTS } from "../registry";
import type { Agent, AgentContext, AgentResult, Check, Status, Summary } from "../types";
import { checkpointProgress } from "./checkpoints";

const ICON: Record<Status, string> = { green: "🟢", amber: "🟠", red: "🔴" };

/** Run one agent, turning a crash into a red result instead of taking the whole run down. */
export async function runAgent(agent: Agent, ctx: AgentContext): Promise<AgentResult> {
  const started = Date.now();
  let checks: Check[];
  try {
    checks = await agent.run(ctx);
  } catch (e) {
    checks = [
      {
        id: "crash",
        title: "Agent ran to the end",
        status: "red",
        detail: `Agent crashed: ${(e as Error).message}`,
      },
    ];
  }
  const status = worst(checks.map((c) => c.status));
  const count = (s: Status) => checks.filter((c) => c.status === s).length;
  const stubs = checks.filter((c) => c.stub).length;
  return {
    agent: agent.id,
    name: agent.name,
    job: agent.job,
    status,
    summary: `${count("green")} passed, ${count("red")} failed, ${count("amber")} amber${stubs ? ` (${stubs} not built yet)` : ""}`,
    checks,
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - started,
  };
}

export function summarize(results: AgentResult[], checkpoint: Summary["checkpoint"]): Summary {
  const overall = worst(results.map((r) => r.status));
  return {
    generatedAt: new Date().toISOString(),
    overall,
    release: overall === "red" ? "blocked" : overall === "amber" ? "ready-with-warnings" : "ready",
    results,
    checkpoint,
  };
}

function reportMarkdown(r: AgentResult): string {
  return [
    `# ${r.name} — ${ICON[r.status]} ${r.status.toUpperCase()}`,
    "",
    `_${r.job}_`,
    "",
    `Ran at ${r.ranAt} in ${r.durationMs} ms. ${r.summary}.`,
    "",
    ...r.checks.map(
      (c) => `- ${ICON[c.status]} **${c.title}** — ${c.detail}${c.stub ? " _(stub)_" : ""}`,
    ),
    "",
  ].join("\n");
}

function writeAgentReports(root: string, date: string, results: AgentResult[]): void {
  for (const r of results) {
    const dir = join(root, "reports", r.agent);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${date}.md`), reportMarkdown(r));
    writeFileSync(join(dir, "latest.json"), JSON.stringify(r, null, 2));
  }
}

function writeSummary(root: string, date: string, summary: Summary): void {
  mkdirSync(join(root, "reports"), { recursive: true });
  writeFileSync(join(root, "reports", "summary.json"), JSON.stringify(summary, null, 2));
  const lines = [
    `# Candlo daily summary — ${date}`,
    "",
    `Overall: ${ICON[summary.overall]} **${summary.overall.toUpperCase()}** · Release: **${summary.release}**`,
    "",
    ...(summary.checkpoint
      ? [
          `## ${summary.checkpoint.id} — ${summary.checkpoint.title}: ${summary.checkpoint.met ? "acceptance criteria met" : "criteria not yet met"}`,
          ...summary.checkpoint.criteria.map(
            (c) => `- ${c.met ? "✅" : "⬜"} ${c.text} — ${c.evidence}`,
          ),
          "",
        ]
      : []),
    "## Agents",
    ...summary.results.map((r) => `- ${ICON[r.status]} **${r.name}** — ${r.summary}`),
    "",
  ];
  writeFileSync(join(root, "reports", "summary.md"), lines.join("\n"));
}

export const localDate = (d = new Date()): string => dateKey(d);

/** Run every agent (or just `only`) in parallel, write reports once, and return the aggregate. */
export async function runAll(ctx: AgentContext, only?: string[], write = true): Promise<Summary> {
  const selected = only?.length ? AGENTS.filter((a) => only.includes(a.id)) : AGENTS;
  const results = await Promise.all(selected.map((agent) => runAgent(agent, ctx)));
  if (write) writeAgentReports(ctx.root, ctx.date, results);
  // Evaluated after the agent reports exist, so the "agents run" criterion can see them.
  const summary = summarize(results, checkpointProgress(ctx.root));
  if (write) writeSummary(ctx.root, ctx.date, summary);
  return summary;
}
