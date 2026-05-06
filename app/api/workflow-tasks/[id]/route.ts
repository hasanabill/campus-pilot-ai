import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { updateWorkflowTask, updateWorkflowTaskSchema } from "@/services/workflowTaskService";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const parsed = updateWorkflowTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }
    const { id } = await context.params;
    const task = await updateWorkflowTask({ role: session.user.role }, id, parsed.data);
    if (!task) return NextResponse.json({ error: "Workflow task not found." }, { status: 404 });
    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow task update failed.";
    const status = message.includes("Only") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
