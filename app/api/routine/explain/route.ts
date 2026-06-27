import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { routineExplainSchema } from "@/services/routine/routineSchemas";
import { explainRoutine } from "@/services/routine/routineService";
import { enforceRateLimit } from "@/utils/request";

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "routine-explain",
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many routine explanation requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Only administrators can explain routines." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = routineExplainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await explainRoutine({ role: session.user.role }, parsed.data.routine_id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Routine explanation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
