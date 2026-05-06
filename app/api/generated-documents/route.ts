import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listGeneratedDocuments, listGeneratedDocumentsQuerySchema } from "@/services/documentRecordService";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const parsed = listGeneratedDocumentsQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params.", details: parsed.error.flatten() }, { status: 400 });
    }
    const result = await listGeneratedDocuments({ userId: session.user.id, role: session.user.role }, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load generated documents.";
    const status = message.includes("Only") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
