import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { extractTextFromFile, formatExtractedText, formatExtractedTextSchema } from "@/services/textExtractionService";
import { validateFileUpload } from "@/utils/request";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (session.user.role === "student") {
      return NextResponse.json({ error: "Only faculty/admin/registrar can extract document text." }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "file is required." }, { status: 400 });
      validateFileUpload(file, {
        maxBytes: 10 * 1024 * 1024,
        allowedMimeTypes: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
      });
      const text = await extractTextFromFile(file);
      return NextResponse.json({
        text,
        characters: text.length,
        warning: text ? null : "Automatic extraction was not possible for this file. Paste text manually.",
      });
    }

    const parsed = formatExtractedTextSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }
    const text = formatExtractedText(parsed.data);
    return NextResponse.json({ text, characters: text.length }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Text extraction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
