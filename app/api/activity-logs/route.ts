import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listActivityLogs, listActivityLogsQuerySchema } from "@/services/activityLogService";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = listActivityLogsQuerySchema.safeParse({
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      source: searchParams.get("source") ?? undefined,
      severity: searchParams.get("severity") ?? undefined,
      action: searchParams.get("action") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await listActivityLogs(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load activity logs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
