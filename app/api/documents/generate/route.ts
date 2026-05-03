import { NextResponse } from "next/server";

import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import GeneratedDocument from "@/models/GeneratedDocument";
import { createDocumentApprovals } from "@/services/approvalService";
import { generateDocumentBundle, generateDocumentSchema } from "@/services/documentService";
import { notifyDocumentApprovalRequired } from "@/services/notificationService";
import { uploadBufferToCloudinary } from "@/services/storageService";
import { enforceRateLimit } from "@/utils/request";

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "documents-generate",
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many generation requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.user.role === "student") {
      return NextResponse.json(
        { error: "Only faculty/admin/registrar can generate official documents." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = generateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await generateDocumentBundle(parsed.data);
    const cloudinaryUpload = await uploadBufferToCloudinary(Buffer.from(result.pdf_bytes), {
      folder: "campus-pilot/generated-documents",
      resource_type: "raw",
      format: "pdf",
    });
    const generatedDocument = await GeneratedDocument.create({
      template_id: null,
      requested_by: new Types.ObjectId(session.user.id),
      related_ticket_id: null,
      ai_prompt_snapshot: JSON.stringify(parsed.data),
      generated_text: result.generated_text,
      cloudinary_url: cloudinaryUpload.secure_url,
      public_id: cloudinaryUpload.public_id,
      status: "pending_approval",
      approved_by: null,
    });
    await createDocumentApprovals({ entity_id: String(generatedDocument._id) });

    try {
      await notifyDocumentApprovalRequired({
        document_reference_id: String(generatedDocument._id),
        message: `Document "${parsed.data.title}" requires approval review.`,
      });
    } catch {
      // Notification failure should not block document generation.
    }

    const pdfArrayBuffer = new ArrayBuffer(result.pdf_bytes.length);
    new Uint8Array(pdfArrayBuffer).set(result.pdf_bytes);

    return new NextResponse(pdfArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.file_name}"`,
        "X-Generated-Document": "true",
        "X-Document-Cloudinary-Url": cloudinaryUpload.secure_url,
        "X-Document-Public-Id": cloudinaryUpload.public_id,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
