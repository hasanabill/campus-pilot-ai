import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getReportSummary, reportQuerySchema } from "@/services/reportService";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.user.role === "student") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = reportQuerySchema.safeParse({
      period_start: searchParams.get("period_start") ?? undefined,
      period_end: searchParams.get("period_end") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const summary = await getReportSummary(parsed.data);
    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get report summary.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
