import { Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import Approval from "@/models/Approval";
import GeneratedDocument from "@/models/GeneratedDocument";
import User from "@/models/User";

const entityTypes = ["ticket", "generated_document", "schedule_change"] as const;
const stages = ["admin_review", "faculty_review", "registrar_final"] as const;
const decisions = ["approved", "rejected"] as const;

type AppRole = "student" | "faculty" | "admin" | "registrar";

export const createApprovalSchema = z.object({
  entity_type: z.enum(entityTypes),
  entity_id: z.string().min(1),
  stage: z.enum(stages).optional().default("admin_review"),
  approver_id: z.string().min(1),
});

export const listApprovalsQuerySchema = z.object({
  decision: z.enum(["pending", "approved", "rejected"]).optional(),
  entity_type: z.enum(entityTypes).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
});

export const decideApprovalSchema = z.object({
  decision: z.enum(decisions),
  comments: z.string().max(1000).optional().nullable(),
});

function requireObjectId(id: string, field: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid ${field}.`);
  return new Types.ObjectId(id);
}

function canManageApprovals(role: AppRole): boolean {
  return role === "admin" || role === "registrar";
}

export async function createApproval(payload: z.infer<typeof createApprovalSchema>) {
  const parsed = createApprovalSchema.parse(payload);
  await connectToDatabase();

  const approval = await Approval.create({
    entity_type: parsed.entity_type,
    entity_id: requireObjectId(parsed.entity_id, "entity_id"),
    stage: parsed.stage,
    approver_id: requireObjectId(parsed.approver_id, "approver_id"),
  });

  return approval.toObject();
}

export async function createDocumentApprovals(params: { entity_id: string }) {
  await connectToDatabase();
  const reviewers = await User.find({ role: { $in: ["admin", "registrar"] }, is_active: true })
    .select("_id role")
    .lean<Array<{ _id: Types.ObjectId; role: AppRole }>>();

  const created = [];
  for (const reviewer of reviewers) {
    created.push(
      await createApproval({
        entity_type: "generated_document",
        entity_id: params.entity_id,
        stage: reviewer.role === "registrar" ? "registrar_final" : "admin_review",
        approver_id: String(reviewer._id),
      }),
    );
  }

  return created;
}

export async function listApprovals(
  requester: { userId: string; role: AppRole },
  query: z.infer<typeof listApprovalsQuerySchema>,
) {
  if (!canManageApprovals(requester.role)) {
    throw new Error("Only admin/registrar can list approvals.");
  }

  const parsed = listApprovalsQuerySchema.parse(query);
  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (parsed.decision) filter.decision = parsed.decision;
  if (parsed.entity_type) filter.entity_type = parsed.entity_type;
  if (requester.role === "registrar") {
    filter.approver_id = requireObjectId(requester.userId, "user id");
  }

  const limit = parsed.limit ?? 20;
  const page = parsed.page ?? 1;
  const skip = (page - 1) * limit;

  const [approvals, total] = await Promise.all([
    Approval.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Approval.countDocuments(filter),
  ]);

  return { approvals, total, page, limit, total_pages: Math.ceil(total / limit) };
}

export async function decideApproval(
  requester: { userId: string; role: AppRole },
  approvalId: string,
  payload: z.infer<typeof decideApprovalSchema>,
) {
  if (!canManageApprovals(requester.role)) {
    throw new Error("Only admin/registrar can decide approvals.");
  }

  const parsed = decideApprovalSchema.parse(payload);
  await connectToDatabase();

  const approval = await Approval.findById(requireObjectId(approvalId, "approval id"));
  if (!approval) return null;
  if (requester.role === "registrar" && String(approval.approver_id) !== requester.userId) {
    throw new Error("Registrar can only decide approvals assigned to them.");
  }

  approval.decision = parsed.decision;
  approval.comments = parsed.comments ?? null;
  approval.decided_at = new Date();
  await approval.save();

  if (approval.entity_type === "generated_document") {
    await GeneratedDocument.findByIdAndUpdate(approval.entity_id, {
      status: parsed.decision === "approved" ? "approved" : "rejected",
      approved_by: parsed.decision === "approved" ? requireObjectId(requester.userId, "user id") : null,
    });
  }

  return approval.toObject();
}
