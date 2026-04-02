import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { ingestKnowledgeBaseDocument, kbUploadSchema } from "@/services/knowledgeBaseService";
import { uploadFormFileToCloudinary } from "@/services/storageService";
import { enforceRateLimit, validateFileUpload } from "@/utils/request";

function inferSourceTypeFromFileName(fileName: string): "pdf" | "docx" | "text" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  return "text";
}

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "kb-upload",
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many upload requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can upload knowledge base documents." },
        { status: 403 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const title = String(form.get("title") ?? "");
      const category = String(form.get("category") ?? "");
      const documentText = String(form.get("document_text") ?? "");
      const departmentId = String(form.get("department_id") ?? session.user.department_id ?? "");
      const sourceType = String(form.get("source_type") ?? "");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file is required in form-data." }, { status: 400 });
      }
      validateFileUpload(file, {
        maxBytes: 10 * 1024 * 1024,
        allowedMimeTypes: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
      });

      const uploaded = await uploadFormFileToCloudinary(file, {
        folder: "campus-pilot/kb",
        resource_type: "raw",
      });

      const parsed = kbUploadSchema.safeParse({
        title,
        category,
        source_type: sourceType || inferSourceTypeFromFileName(file.name),
        cloudinary_url: uploaded.secure_url,
        public_id: uploaded.public_id,
        uploaded_by: session.user.id,
        department_id: departmentId,
        document_text: documentText,
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input.", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const result = await ingestKnowledgeBaseDocument(parsed.data);
      return NextResponse.json(
        {
          message: "Knowledge document uploaded and ingested.",
          cloudinary_url: uploaded.secure_url,
          public_id: uploaded.public_id,
          ...result,
        },
        { status: 201 },
      );
    }

    const body = await request.json();
    const parsed = kbUploadSchema.safeParse({
      ...body,
      uploaded_by: session.user.id,
      department_id: body.department_id ?? session.user.department_id,
    });

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
