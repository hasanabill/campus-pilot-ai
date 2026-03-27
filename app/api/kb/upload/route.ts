import { NextResponse } from "next/server";

import { ingestKnowledgeBaseDocument, kbUploadSchema } from "@/services/knowledgeBaseService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = kbUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await ingestKnowledgeBaseDocument(parsed.data);
    return NextResponse.json({ message: "Knowledge document ingested.", ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Knowledge base upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
