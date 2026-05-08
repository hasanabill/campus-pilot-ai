import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isTimetableProposerEnabled } from "@/services/aiService";
import { applyTimetableProposal, timetableApplySchema } from "@/services/timetableService";
import { enforceRateLimit } from "@/utils/request";

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "timetable-apply",
      windowMs: 60_000,
      maxRequests: 15,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many timetable apply requests." }, { status: 429 });
    }

    if (!isTimetableProposerEnabled()) {
      return NextResponse.json(
        { error: "Timetable proposer is disabled via ENABLE_TIMETABLE_PROPOSER." },
        { status: 503 },
      );
    }

    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Only administrators can apply timetables." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = timetableApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await applyTimetableProposal(
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Timetable apply failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
