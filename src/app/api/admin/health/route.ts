import { NextResponse } from "next/server";
import { rejectUnlessLoopback } from "@/server/guard";
import { readSummary, runAgentsNow } from "@/server/health";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ summary: readSummary() });
}

/** Run every agent now. Local-only tool: loopback host and same origin only. */
export async function POST(request: Request) {
  const rejected = rejectUnlessLoopback(request);
  if (rejected) return rejected;
  return NextResponse.json({ summary: await runAgentsNow() });
}
