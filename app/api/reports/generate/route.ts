import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateAndStoreReport, generateReportSchema } from "@/services/reportService";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.user.role === "student") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!Types.ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
    }

    const body = await request.json();
    const parsed = generateReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await generateAndStoreReport(session.user.id, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
