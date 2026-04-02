import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  createSchedule,
  createScheduleSchema,
  listSchedules,
  listSchedulesQuerySchema,
  ScheduleConflictError,
} from "@/services/scheduleService";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await createSchedule(
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ScheduleConflictError) {
      return NextResponse.json(
        {
          error: "Schedule conflicts detected.",
          warnings: error.warnings,
        },
        { status: 409 },
      );
    }

    const message = error instanceof Error ? error.message : "Schedule creation failed.";
    const status = message.includes("Only admin") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = listSchedulesQuerySchema.safeParse({
      schedule_type: searchParams.get("schedule_type") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      semester: searchParams.get("semester") ?? undefined,
      day: searchParams.get("day") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await listSchedules(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch schedules.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
