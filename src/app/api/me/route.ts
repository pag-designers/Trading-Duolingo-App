import { NextResponse } from "next/server";
import { meSchema } from "@/lib/me-schema";
import { rejectUnlessSameOriginJson } from "@/server/guard";
import { readMe, writeMe } from "@/server/me";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readMe());
}

export async function PUT(request: Request) {
  const rejected = rejectUnlessSameOriginJson(request);
  if (rejected) return rejected;
  const body: unknown = await request.json().catch(() => null);
  const parsed = meSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid profile or settings", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  return NextResponse.json(await writeMe(parsed.data));
}
