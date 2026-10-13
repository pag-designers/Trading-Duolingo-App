/** CLI: `pnpm agents:run [agent-id …]`. Exits 1 if any agent is red (blocks a release). */
import { runAll, localDate } from "./orchestrator";
import { AGENTS } from "./registry";

const ICON = { green: "🟢", amber: "🟠", red: "🔴" } as const;

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const unknown = only.filter((id) => !AGENTS.some((a) => a.id === id));
  if (unknown.length > 0) {
    console.error(
      `Unknown agent(s): ${unknown.join(", ")}\nAvailable: ${AGENTS.map((a) => a.id).join(", ")}`,
    );
    process.exit(2);
  }
  const root = process.cwd();
  const summary = await runAll(
    { root, dbUrl: process.env.DATABASE_URL ?? "file:./prisma/dev.db", date: localDate() },
    only,
  );
  for (const r of summary.results) {
    console.log(`${ICON[r.status]} ${r.name.padEnd(28)} ${r.summary}`);
    for (const c of r.checks.filter((c) => c.status === "red"))
      console.log(`     ✗ ${c.title}: ${c.detail}`);
  }
  if (summary.checkpoint) {
    console.log(
      `\n${summary.checkpoint.id} ${summary.checkpoint.title}: ${summary.checkpoint.met ? "criteria met" : "criteria NOT all met"}`,
    );
    for (const c of summary.checkpoint.criteria)
      console.log(`  ${c.met ? "✓" : "·"} ${c.text} — ${c.evidence}`);
  }
  console.log(
    `\nOverall ${ICON[summary.overall]} ${summary.overall} · release ${summary.release}. Reports in reports/.`,
  );
  process.exit(summary.overall === "red" ? 1 : 0);
}

void main();
