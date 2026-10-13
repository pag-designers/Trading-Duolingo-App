import { NextResponse } from "next/server";
import { progressSchema } from "@/lib/progress-schema";
import { rejectUnlessSameOriginJson } from "@/server/guard";
import { mergeAndWriteProgress, readProgress } from "@/server/progress";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readProgress());
}

export async function PUT(request: Request) {
  const rejected = rejectUnlessSameOriginJson(request);
  if (rejected) return rejected;
  const body: unknown = await request.json().catch(() => null);
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid progress", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }
  return NextResponse.json(await mergeAndWriteProgress(parsed.data));
}
