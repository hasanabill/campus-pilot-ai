import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { decideApproval, decideApprovalSchema } from "@/services/approvalService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = decideApprovalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const approval = await decideApproval(
      { userId: session.user.id, role: session.user.role },
      id,
      parsed.data,
    );
    if (!approval) {
      return NextResponse.json({ error: "Approval not found." }, { status: 404 });
    }

    return NextResponse.json({ approval }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval update failed.";
    const status = message.includes("Only") || message.includes("Registrar can only") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
