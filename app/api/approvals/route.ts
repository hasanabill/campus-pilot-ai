import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  createApproval,
  createApprovalSchema,
  listApprovals,
  listApprovalsQuerySchema,
} from "@/services/approvalService";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = listApprovalsQuerySchema.safeParse({
      decision: searchParams.get("decision") ?? undefined,
      entity_type: searchParams.get("entity_type") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await listApprovals(
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load approvals.";
    const status = message.includes("Only") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Only admin can create approvals." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createApprovalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const approval = await createApproval(parsed.data);
    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval creation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
