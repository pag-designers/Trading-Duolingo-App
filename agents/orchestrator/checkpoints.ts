import { existsSync } from "node:fs";
import { join } from "node:path";
import { readJson, readText } from "../lib";
import type { AgentResult, CheckpointProgress } from "../types";
import criteriaJson from "./criteria.json";

/** One acceptance criterion and the evidence that proves it. */
interface Criterion {
  text: string;
  /** An e2e test whose title contains this tag must have passed. */
  e2e?: string;
  /** This file must exist. */
  file?: string;
  /** This agent check must be green in the agent's latest report. */
  agentCheck?: { agent: string; check: string };
}
const CRITERIA = criteriaJson as Record<string, { title: string; criteria: Criterion[] }>;

interface E2eSpec {
  title: string;
  ok: boolean;
}
interface E2eSuite {
  specs?: E2eSpec[];
  suites?: E2eSuite[];
}

/** Every test title in a Playwright JSON report, with whether it passed on all projects. */
export function e2eResults(root: string): Map<string, boolean> | null {
  let report: { suites?: E2eSuite[] } | undefined;
  try {
    report = readJson(root, "reports/e2e/latest.json") as typeof report;
  } catch {
    return null;
  }
  if (!report) return null;
  const out = new Map<string, boolean>();
  const walk = (suite: E2eSuite) => {
    for (const spec of suite.specs ?? [])
      out.set(spec.title, (out.get(spec.title) ?? true) && spec.ok);
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const s of report.suites ?? []) walk(s);
  return out;
}

/**
 * The current checkpoint is the first row of the PROGRESS.md table that is not fully done:
 * anything other than a plain ✅ (🟡 in progress, ⬜ not started, or "✅ awaiting go").
 */
export function currentCheckpointNumber(progressMd: string): number | null {
  for (const m of progressMd.matchAll(/^\|\s*(\d+)\s*\|[^|]*\|\s*([^|]*?)\s*\|\s*$/gm)) {
    const status = m[2] ?? "";
    if (!status.startsWith("✅") || /awaiting/i.test(status)) return Number(m[1]);
  }
  return null;
}

function agentCheckStatus(root: string, agent: string, check: string): string | null {
  try {
    const result = readJson(root, `reports/${agent}/latest.json`) as AgentResult | undefined;
    return result?.checks.find((c) => c.id === check)?.status ?? null;
  } catch {
    return null;
  }
}

/** Evaluate the current checkpoint's acceptance criteria against real evidence on disk. */
export function checkpointProgress(root: string): CheckpointProgress | null {
  const n = currentCheckpointNumber(readText(root, "PROGRESS.md") ?? "");
  const spec = n === null ? undefined : CRITERIA[String(n)];
  if (n === null || !spec) return null;

  const e2e = e2eResults(root);
  const criteria = spec.criteria.map((c) => {
    if (c.file) {
      const met = existsSync(join(root, c.file));
      return {
        text: c.text,
        met,
        evidence: met ? `${c.file} exists` : `${c.file} not found — run pnpm agents:run`,
      };
    }
    if (c.agentCheck) {
      const { agent, check } = c.agentCheck;
      const status = agentCheckStatus(root, agent, check);
      return {
        text: c.text,
        met: status === "green",
        evidence:
          status === null
            ? `no report for ${agent}/${check} — run pnpm agents:run`
            : `${agent} → ${check} is ${status}`,
      };
    }
    const tag = c.e2e ?? "";
    if (!e2e) return { text: c.text, met: false, evidence: "No e2e report yet — run pnpm e2e" };
    const hits = [...e2e.entries()].filter(([title]) => title.includes(tag));
    if (hits.length === 0)
      return { text: c.text, met: false, evidence: `No e2e test tagged ${tag}` };
    const ok = hits.every(([, passed]) => passed);
    return {
      text: c.text,
      met: ok,
      evidence: `${hits.length} e2e test(s) ${ok ? "passed" : "FAILED"}`,
    };
  });
  return { id: `CP${n}`, title: spec.title, criteria, met: criteria.every((c) => c.met) };
}
