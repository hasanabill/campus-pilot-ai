import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { routineApplySchema } from "@/services/routine/routineSchemas";
import { applyRoutine } from "@/services/routine/routineService";
import { enforceRateLimit } from "@/utils/request";

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "routine-apply",
      windowMs: 60_000,
      maxRequests: 8,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many routine apply requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Only administrators can apply routines." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = routineApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await applyRoutine(
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Routine apply failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
