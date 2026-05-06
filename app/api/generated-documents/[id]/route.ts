import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { updateGeneratedDocumentSchema, updateGeneratedDocumentStatus } from "@/services/documentRecordService";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const parsed = updateGeneratedDocumentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }
    const { id } = await context.params;
    const document = await updateGeneratedDocumentStatus({ role: session.user.role }, id, parsed.data);
    if (!document) return NextResponse.json({ error: "Generated document not found." }, { status: 404 });
    return NextResponse.json({ document }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generated document update failed.";
    const status = message.includes("Only") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
