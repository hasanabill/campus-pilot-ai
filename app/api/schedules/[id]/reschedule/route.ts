import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { ScheduleConflictError, updateSchedule, updateScheduleSchema } from "@/services/scheduleService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateScheduleSchema.safeParse({
      ...body,
      reason: body.reason ?? "emergency",
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await updateSchedule(
      { userId: session.user.id, role: session.user.role },
      id,
      parsed.data,
    );
    if (!result) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ScheduleConflictError) {
      return NextResponse.json(
        { error: "Schedule conflicts detected.", warnings: error.warnings },
        { status: 409 },
      );
    }
    const message = error instanceof Error ? error.message : "Schedule reschedule failed.";
    const status = message.includes("Only admin") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
