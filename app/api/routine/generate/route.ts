import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateRoutine } from "@/services/routine/routineService";
import { routineGenerateSchema } from "@/services/routine/routineSchemas";
import { enforceRateLimit } from "@/utils/request";

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "routine-generate",
      windowMs: 60_000,
      maxRequests: 12,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many routine generation requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Only administrators can generate routines." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = routineGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await generateRoutine(
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Routine generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
