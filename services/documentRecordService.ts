import { Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import DocumentTemplate from "@/models/DocumentTemplate";
import GeneratedDocument from "@/models/GeneratedDocument";

type AppRole = "student" | "faculty" | "admin" | "registrar";

const templateTypes = ["certificate", "recommendation_letter", "notice", "report", "meeting_minutes"] as const;
const documentStatuses = ["draft", "pending_approval", "approved", "rejected", "issued"] as const;

export const createDocumentTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(templateTypes),
  template_body: z.string().min(10).max(10000),
  placeholders: z.array(z.string().min(1).max(80)).optional().default([]),
  is_active: z.boolean().optional().default(true),
});

export const listDocumentTemplatesQuerySchema = z.object({
  type: z.enum(templateTypes).optional(),
  is_active: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
});

export const listGeneratedDocumentsQuerySchema = z.object({
  status: z.enum(documentStatuses).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
});

export const updateGeneratedDocumentSchema = z.object({
  status: z.enum(documentStatuses),
});

function requireObjectId(id: string, field: string) {
  if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid ${field}.`);
  return new Types.ObjectId(id);
}

function canManageDocuments(role: AppRole) {
  return role === "admin" || role === "faculty" || role === "registrar";
}

export async function listDocumentTemplates(query: z.infer<typeof listDocumentTemplatesQuerySchema>) {
  const parsed = listDocumentTemplatesQuerySchema.parse(query);
  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (parsed.type) filter.type = parsed.type;
  if (parsed.is_active !== undefined) filter.is_active = parsed.is_active;
  const limit = parsed.limit ?? 50;
  const page = parsed.page ?? 1;
  const skip = (page - 1) * limit;
  const [templates, total] = await Promise.all([
    DocumentTemplate.find(filter).sort({ updated_at: -1 }).skip(skip).limit(limit).lean(),
    DocumentTemplate.countDocuments(filter),
  ]);
  return { templates, total, page, limit, total_pages: Math.ceil(total / limit) };
}

export async function createDocumentTemplate(
  requester: { userId: string; role: AppRole },
  payload: z.infer<typeof createDocumentTemplateSchema>,
) {
  if (!canManageDocuments(requester.role)) throw new Error("Only faculty/admin/registrar can manage document templates.");
  const parsed = createDocumentTemplateSchema.parse(payload);
  await connectToDatabase();
  const template = await DocumentTemplate.create({
    ...parsed,
    created_by: requireObjectId(requester.userId, "user id"),
  });
  return template.toObject();
}

export async function updateDocumentTemplate(
  requester: { role: AppRole },
  templateId: string,
  payload: Partial<z.infer<typeof createDocumentTemplateSchema>>,
) {
  if (!canManageDocuments(requester.role)) throw new Error("Only faculty/admin/registrar can manage document templates.");
  const parsed = createDocumentTemplateSchema.partial().parse(payload);
  await connectToDatabase();
  return DocumentTemplate.findByIdAndUpdate(requireObjectId(templateId, "template id"), parsed, {
    new: true,
    runValidators: true,
  }).lean();
}

export async function listGeneratedDocuments(
  requester: { userId: string; role: AppRole },
  query: z.infer<typeof listGeneratedDocumentsQuerySchema>,
) {
  if (!canManageDocuments(requester.role)) throw new Error("Only faculty/admin/registrar can list generated documents.");
  const parsed = listGeneratedDocumentsQuerySchema.parse(query);
  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (parsed.status) filter.status = parsed.status;
  if (requester.role === "faculty") filter.requested_by = requireObjectId(requester.userId, "user id");
  const limit = parsed.limit ?? 30;
  const page = parsed.page ?? 1;
  const skip = (page - 1) * limit;
  const [documents, total] = await Promise.all([
    GeneratedDocument.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    GeneratedDocument.countDocuments(filter),
  ]);
  return { documents, total, page, limit, total_pages: Math.ceil(total / limit) };
}

export async function updateGeneratedDocumentStatus(
  requester: { role: AppRole },
  documentId: string,
  payload: z.infer<typeof updateGeneratedDocumentSchema>,
) {
  if (!canManageDocuments(requester.role)) throw new Error("Only faculty/admin/registrar can update generated documents.");
  const parsed = updateGeneratedDocumentSchema.parse(payload);
  await connectToDatabase();
  return GeneratedDocument.findByIdAndUpdate(
    requireObjectId(documentId, "document id"),
    { status: parsed.status },
    { new: true, runValidators: true },
  ).lean();
}
