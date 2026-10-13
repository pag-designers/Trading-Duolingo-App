/** Shared contract for every Candlo agent. See DECISIONS D-007. */

export type Status = "green" | "amber" | "red";

export interface Check {
  id: string;
  title: string;
  status: Status;
  detail: string;
  /** True when the check is a placeholder for work arriving in a later checkpoint. Always amber. */
  stub?: boolean;
}

export interface AgentContext {
  /** Project root to inspect (tests point this at a broken fixture to prove the agent catches it). */
  root: string;
  /** SQLite URL for agents that inspect the database. */
  dbUrl: string;
  /** YYYY-MM-DD used in report file names. */
  date: string;
}

export interface Agent {
  id: string;
  name: string;
  job: string;
  run(ctx: AgentContext): Promise<Check[]>;
}

export interface AgentResult {
  agent: string;
  name: string;
  job: string;
  status: Status;
  summary: string;
  checks: Check[];
  ranAt: string;
  durationMs: number;
}

export interface CheckpointProgress {
  id: string;
  title: string;
  criteria: { text: string; met: boolean; evidence: string }[];
  met: boolean;
}

export interface Summary {
  generatedAt: string;
  overall: Status;
  release: "blocked" | "ready-with-warnings" | "ready";
  results: AgentResult[];
  checkpoint: CheckpointProgress | null;
}
