import { Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import FAQEntry from "@/models/FAQEntry";

type AppRole = "student" | "faculty" | "admin" | "registrar";

export const createFaqSchema = z.object({
  question: z.string().min(3).max(500),
  answer: z.string().min(3).max(5000),
  category: z.string().min(2).max(100),
  source_document_id: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const listFaqQuerySchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
});

function canManageFaq(role: AppRole): boolean {
  return role === "admin";
}

function objectIdOrNull(value?: string | null) {
  if (!value) return null;
  if (!Types.ObjectId.isValid(value)) throw new Error("Invalid source_document_id.");
  return new Types.ObjectId(value);
}

export async function listFaqs(query: z.infer<typeof listFaqQuerySchema>) {
  const parsed = listFaqQuerySchema.parse(query);
  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (parsed.category) filter.category = parsed.category;
  if (parsed.is_active !== undefined) filter.is_active = parsed.is_active;
  if (parsed.q) filter.question = { $regex: parsed.q, $options: "i" };

  const limit = parsed.limit ?? 20;
  const page = parsed.page ?? 1;
  const skip = (page - 1) * limit;

  const [faqs, total] = await Promise.all([
    FAQEntry.find(filter).sort({ updated_at: -1 }).skip(skip).limit(limit).lean(),
    FAQEntry.countDocuments(filter),
  ]);

  return { faqs, total, page, limit, total_pages: Math.ceil(total / limit) };
}

export async function createFaq(requester: { role: AppRole }, payload: z.infer<typeof createFaqSchema>) {
  if (!canManageFaq(requester.role)) throw new Error("Only admin can manage FAQs.");
  const parsed = createFaqSchema.parse(payload);
  await connectToDatabase();
  const faq = await FAQEntry.create({
    ...parsed,
    source_document_id: objectIdOrNull(parsed.source_document_id),
  });
  return faq.toObject();
}

export async function updateFaq(
  requester: { role: AppRole },
  faqId: string,
  payload: Partial<z.infer<typeof createFaqSchema>>,
) {
  if (!canManageFaq(requester.role)) throw new Error("Only admin can manage FAQs.");
  if (!Types.ObjectId.isValid(faqId)) throw new Error("Invalid FAQ id.");
  const parsed = createFaqSchema.partial().parse(payload);
  await connectToDatabase();
  const update = {
    ...parsed,
    source_document_id:
      parsed.source_document_id !== undefined
        ? objectIdOrNull(parsed.source_document_id)
        : undefined,
  };
  return FAQEntry.findByIdAndUpdate(faqId, update, { new: true, runValidators: true }).lean();
}

export async function deleteFaq(requester: { role: AppRole }, faqId: string) {
  if (!canManageFaq(requester.role)) throw new Error("Only admin can manage FAQs.");
  if (!Types.ObjectId.isValid(faqId)) throw new Error("Invalid FAQ id.");
  await connectToDatabase();
  return FAQEntry.findByIdAndDelete(faqId).lean();
}

export async function findFaqAnswer(question: string) {
  await connectToDatabase();
  const normalized = question.trim();
  if (normalized.length < 3) return null;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return FAQEntry.findOne({
    is_active: true,
    $or: [
      { question: { $regex: escaped, $options: "i" } },
      { answer: { $regex: escaped.slice(0, 80), $options: "i" } },
    ],
  }).lean<{ _id: Types.ObjectId; question: string; answer: string; category: string } | null>();
}
