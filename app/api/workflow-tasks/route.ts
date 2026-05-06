import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  createWorkflowTask,
  createWorkflowTaskSchema,
  listWorkflowTasks,
  listWorkflowTasksQuerySchema,
} from "@/services/workflowTaskService";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const parsed = listWorkflowTasksQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      assigned_to: searchParams.get("assigned_to") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params.", details: parsed.error.flatten() }, { status: 400 });
    }
    const result = await listWorkflowTasks({ userId: session.user.id, role: session.user.role }, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load workflow tasks.";
    const status = message.includes("Only") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const parsed = createWorkflowTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }
    const task = await createWorkflowTask({ role: session.user.role }, parsed.data);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow task creation failed.";
    const status = message.includes("Only") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
