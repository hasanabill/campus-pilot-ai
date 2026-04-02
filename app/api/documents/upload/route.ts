import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { uploadFormFileToCloudinary } from "@/services/storageService";
import { enforceRateLimit, validateFileUpload } from "@/utils/request";

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "documents-upload",
      windowMs: 60_000,
      maxRequests: 12,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many upload requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.user.role === "student") {
      return NextResponse.json(
        { error: "Only faculty/admin/registrar can upload documents." },
        { status: 403 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "campus-pilot/documents");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required in form-data." }, { status: 400 });
    }
    validateFileUpload(file, {
      maxBytes: 20 * 1024 * 1024,
      allowedMimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ],
    });

    const uploaded = await uploadFormFileToCloudinary(file, {
      folder,
      resource_type: "raw",
    });

    return NextResponse.json(
      {
        message: "Document uploaded to Cloudinary.",
        file_name: file.name,
        cloudinary_url: uploaded.secure_url,
        public_id: uploaded.public_id,
        bytes: uploaded.bytes,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
