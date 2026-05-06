import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { updateDocumentTemplate } from "@/services/documentRecordService";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await context.params;
    const template = await updateDocumentTemplate({ role: session.user.role }, id, await request.json());
    if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Template update failed.";
    const status = message.includes("Only") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
