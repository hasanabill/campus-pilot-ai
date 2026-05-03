import { Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import DepartmentNotice from "@/models/DepartmentNotice";
import User from "@/models/User";
import { createNotification } from "@/services/notificationService";

const audiences = ["students", "faculty", "all"] as const;

type AppRole = "student" | "faculty" | "admin" | "registrar";

export const createNoticeSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(5).max(5000),
  audience: z.enum(audiences).optional().default("all"),
  department_id: z.string().min(1),
  expires_at: z.string().datetime().optional().nullable(),
  broadcast: z.boolean().optional().default(true),
});

export const listNoticesQuerySchema = z.object({
  audience: z.enum(audiences).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
});

function requireObjectId(id: string, field: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid ${field}.`);
  return new Types.ObjectId(id);
}

function canManageNotices(role: AppRole): boolean {
  return role === "admin" || role === "registrar";
}

function audienceRoles(audience: (typeof audiences)[number]) {
  if (audience === "students") return ["student"];
  if (audience === "faculty") return ["faculty"];
  return ["student", "faculty", "admin", "registrar"];
}

export async function createNotice(
  requester: { userId: string; role: AppRole },
  payload: z.infer<typeof createNoticeSchema>,
) {
  if (!canManageNotices(requester.role)) {
    throw new Error("Only admin/registrar can create notices.");
  }

  const parsed = createNoticeSchema.parse(payload);
  await connectToDatabase();

  const notice = await DepartmentNotice.create({
    title: parsed.title,
    body: parsed.body,
    audience: parsed.audience,
    department_id: requireObjectId(parsed.department_id, "department_id"),
    published_by: requireObjectId(requester.userId, "user id"),
    published_at: new Date(),
    expires_at: parsed.expires_at ? new Date(parsed.expires_at) : null,
  });

  if (parsed.broadcast) {
    const users = await User.find({
      role: { $in: audienceRoles(parsed.audience) },
      is_active: true,
    })
      .select("_id")
      .lean<Array<{ _id: Types.ObjectId }>>();

    for (const user of users) {
      await createNotification({
        user_id: String(user._id),
        type: "announcement",
        message: `${notice.title}: ${notice.body.slice(0, 220)}`,
        reference_type: "notice",
        reference_id: String(notice._id),
      });
    }
  }

  return notice.toObject();
}

function readableAudiences(role: AppRole): Array<(typeof audiences)[number]> {
  if (role === "student") return ["all", "students"];
  if (role === "faculty") return ["all", "faculty"];
  return ["all", "students", "faculty"];
}

export async function listNotices(
  requester: { role: AppRole },
  query: z.infer<typeof listNoticesQuerySchema>,
) {
  const parsed = listNoticesQuerySchema.parse(query);
  await connectToDatabase();

  const allowedAudiences = readableAudiences(requester.role);
  const audienceFilter =
    parsed.audience && allowedAudiences.includes(parsed.audience)
      ? [parsed.audience]
      : allowedAudiences;

  const filter: Record<string, unknown> = {
    audience: { $in: audienceFilter },
    $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
  };

  const limit = parsed.limit ?? 20;
  const page = parsed.page ?? 1;
  const skip = (page - 1) * limit;

  const [notices, total] = await Promise.all([
    DepartmentNotice.find(filter)
      .sort({ published_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DepartmentNotice.countDocuments(filter),
  ]);

  return { notices, total, page, limit, total_pages: Math.ceil(total / limit) };
}

export async function deleteNotice(requester: { role: AppRole }, noticeId: string) {
  if (!canManageNotices(requester.role)) {
    throw new Error("Only admin/registrar can delete notices.");
  }
  await connectToDatabase();
  return DepartmentNotice.findByIdAndDelete(requireObjectId(noticeId, "notice id")).lean();
}
