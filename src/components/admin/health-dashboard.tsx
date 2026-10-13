"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Loader2,
  Play,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import type { AgentResult, Status, Summary } from "@agents/types";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Status is never color alone: every state has an icon AND a word. */
const STATUS: Record<Status, { label: string; icon: LucideIcon; tint: string; chip: string }> = {
  green: {
    label: "Green",
    icon: CircleCheck,
    tint: "text-gain-text",
    chip: "bg-gain-soft text-gain-text",
  },
  amber: {
    label: "Amber",
    icon: CircleAlert,
    tint: "text-flame-text",
    chip: "bg-reward/25 text-foreground",
  },
  red: { label: "Red", icon: CircleX, tint: "text-loss-text", chip: "bg-loss-soft text-loss-text" },
};

const RELEASE_TEXT: Record<Summary["release"], string> = {
  blocked: "Release blocked — fix the red agents first.",
  "ready-with-warnings":
    "Ready, with warnings. Amber means a check is not built yet or needs a look.",
  ready: "Ready to release. Every agent is green.",
};

function StatusChip({ status }: { status: Status }) {
  const { label, icon: Icon, chip } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold uppercase",
        chip,
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </span>
  );
}

function AgentCard({ result }: { result: AgentResult }) {
  return (
    <Card
      className="flex flex-col gap-3"
      data-testid={`agent-${result.agent}`}
      data-status={result.status}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-lg">{result.name}</CardTitle>
          <p className="text-base text-muted">{result.job}</p>
        </div>
        <StatusChip status={result.status} />
      </div>
      <p className="tabular text-sm font-bold text-muted">{result.summary}</p>
      <details className="group">
        <summary className="min-h-12 cursor-pointer list-none py-2 text-base font-extrabold text-brand">
          <span className="group-open:hidden">Show {result.checks.length} checks</span>
          <span className="hidden group-open:inline">Hide checks</span>
        </summary>
        <ul className="space-y-2">
          {result.checks.map((c) => {
            const { icon: Icon, tint, label } = STATUS[c.status];
            return (
              <li key={c.id} className="flex gap-2 text-base">
                <Icon
                  className={cn("mt-0.5 size-5 shrink-0", tint)}
                  aria-label={label}
                  role="img"
                />
                <span>
                  <strong>{c.title}</strong>
                  {c.stub && (
                    <span className="ml-2 rounded-md bg-surface-2 px-1.5 text-xs font-bold uppercase">
                      not built yet
                    </span>
                  )}
                  <span className="block text-muted">{c.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </details>
    </Card>
  );
}

async function fetchSummary(): Promise<Summary | null> {
  const res = await fetch("/api/admin/health", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load the health report.");
  return ((await res.json()) as { summary: Summary | null }).summary;
}

export function HealthDashboard() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["health"], queryFn: fetchSummary });
  const run = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/health", { method: "POST" });
      if (!res.ok) throw new Error("The agents could not run.");
      return ((await res.json()) as { summary: Summary }).summary;
    },
    onSuccess: (summary) => client.setQueryData(["health"], summary),
  });
  const summary = query.data ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">App health</h1>
        <Button onClick={() => run.mutate()} disabled={run.isPending} data-testid="run-agents">
          {run.isPending ? <Loader2 className="animate-spin" /> : <Play />}
          {run.isPending ? "Running…" : "Run all agents"}
        </Button>
      </div>

      {(query.isError || run.isError) && (
        <p role="alert" className="rounded-2xl bg-loss-soft p-4 font-bold text-loss-text">
          {(run.error ?? query.error)?.message}
        </p>
      )}

      {query.isLoading && <p className="skeleton text-lg text-muted">Loading the latest report…</p>}

      {!query.isLoading && !summary && (
        <Card>
          <CardTitle>No report yet</CardTitle>
          <p className="mt-1 text-lg text-muted">
            The agents have not run. Press “Run all agents” or run{" "}
            <code className="tabular">pnpm agents:run</code>.
          </p>
        </Card>
      )}

      {summary && (
        <>
          <Card
            className="flex flex-wrap items-center gap-4"
            data-testid="overall"
            data-status={summary.overall}
          >
            <Rocket className="size-10 text-brand" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle>Release gate</CardTitle>
                <StatusChip status={summary.overall} />
              </div>
              <p className="text-lg">{RELEASE_TEXT[summary.release]}</p>
              <p className="text-sm text-muted">
                Last run{" "}
                <time dateTime={summary.generatedAt}>
                  {new Date(summary.generatedAt).toLocaleString()}
                </time>
              </p>
            </div>
          </Card>

          {summary.checkpoint && (
            <Card data-testid="checkpoint">
              <CardTitle>
                {summary.checkpoint.id} — {summary.checkpoint.title}
              </CardTitle>
              <p className="mb-2 text-muted">
                {summary.checkpoint.met
                  ? "All acceptance criteria are met."
                  : "Some acceptance criteria are not met yet."}
              </p>
              <ul className="space-y-2">
                {summary.checkpoint.criteria.map((c) => (
                  <li key={c.text} className="flex gap-2 text-base">
                    {c.met ? (
                      <CircleCheck
                        className="mt-0.5 size-5 shrink-0 text-gain-text"
                        role="img"
                        aria-label="Met"
                      />
                    ) : (
                      <CircleAlert
                        className="mt-0.5 size-5 shrink-0 text-flame-text"
                        role="img"
                        aria-label="Not met yet"
                      />
                    )}
                    <span>
                      <strong>{c.text}</strong>
                      <span className="block text-muted">{c.evidence}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {summary.results.map((r) => (
              <AgentCard key={r.agent} result={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
