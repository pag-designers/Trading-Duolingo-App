import { existsSync } from "node:fs";
import { join } from "node:path";
import { readJson, readText } from "../lib";
import type { CheckpointProgress } from "../types";

interface E2eReport {
  suites?: unknown[];
  stats?: { unexpected?: number; expected?: number };
}

/** Collect every passing/failing e2e test title from a Playwright JSON report. */
function e2eResults(root: string): Map<string, boolean> | null {
  let report: E2eReport | undefined;
  try {
    report = readJson(root, "reports/e2e/latest.json") as E2eReport | undefined;
  } catch {
    return null;
  }
  if (!report) return null;
  const out = new Map<string, boolean>();
  const walk = (node: unknown) => {
    const n = node as {
      title?: string;
      specs?: unknown[];
      suites?: unknown[];
      tests?: { results?: { status: string }[] }[];
      ok?: boolean;
    };
    for (const spec of (n.specs ?? []) as { title: string; ok: boolean }[]) {
      out.set(spec.title, (out.get(spec.title) ?? true) && spec.ok);
    }
    for (const s of n.suites ?? []) walk(s);
  };
  for (const s of report.suites ?? []) walk(s);
  return out;
}

/**
 * Acceptance criteria per checkpoint (BRIEF §9). `tag` links a criterion to an e2e test whose title
 * contains that tag; `file` links it to a file that must exist.
 */
const CP0 = {
  id: "CP0",
  title: "Foundation",
  criteria: [
    { text: "App runs", tag: "@cp0-app-runs" },
    { text: "Onboarding works", tag: "@cp0-onboarding" },
    { text: "The path map renders", tag: "@cp0-path-map" },
    { text: "Dark mode works", tag: "@cp0-dark-mode" },
    { text: "Agents run", file: "reports/summary.json" },
  ],
};

export function checkpointProgress(root: string): CheckpointProgress | null {
  const progress = readText(root, "PROGRESS.md");
  // The first checkpoint marked in progress (🟡) is the current one; only CP0 has criteria wired so far.
  const current = /\|\s*0\s*\|[^|]*\|\s*🟡/.test(progress ?? "") ? CP0 : null;
  if (!current) return null;

  const e2e = e2eResults(root);
  const criteria = current.criteria.map((c) => {
    if ("file" in c && c.file) {
      const met = existsSync(join(root, c.file));
      return {
        text: c.text,
        met,
        evidence: met ? `${c.file} exists` : `${c.file} not found — run pnpm agents:run`,
      };
    }
    const tag = "tag" in c ? c.tag : "";
    if (!e2e) return { text: c.text, met: false, evidence: "No e2e report yet — run pnpm e2e" };
    const hits = [...e2e.entries()].filter(([title]) => title.includes(tag ?? ""));
    if (hits.length === 0)
      return { text: c.text, met: false, evidence: `No e2e test tagged ${tag}` };
    const ok = hits.every(([, passed]) => passed);
    return {
      text: c.text,
      met: ok,
      evidence: `${hits.length} e2e test(s) ${ok ? "passed" : "FAILED"}`,
    };
  });
  return { id: current.id, title: current.title, criteria, met: criteria.every((c) => c.met) };
}
