import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { kbSearchSchema, searchKnowledgeBaseEntries } from "@/services/knowledgeBaseService";
import { enforceRateLimit } from "@/utils/request";

export async function GET(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "kb-search",
      windowMs: 60_000,
      maxRequests: 60,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many search requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const parsed = kbSearchSchema.safeParse({
      q: searchParams.get("q"),
      topK: searchParams.get("topK") ? Number(searchParams.get("topK")) : undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
      documentId: searchParams.get("documentId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const results = await searchKnowledgeBaseEntries(parsed.data);
    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Knowledge search failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
