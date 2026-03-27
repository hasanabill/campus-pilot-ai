import { NextResponse } from "next/server";

import { kbSearchSchema, searchKnowledgeBaseEntries } from "@/services/knowledgeBaseService";

export async function GET(request: Request) {
  try {
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
