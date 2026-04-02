import { Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import Student from "@/models/Student";
import User from "@/models/User";

const notificationTypes = [
  "ticket_update",
  "schedule_update",
  "approval_required",
  "announcement",
  "reminder",
] as const;

const channels = ["in_app", "email"] as const;

export const createNotificationSchema = z.object({
  user_id: z.string().min(1),
  channel: z.enum(channels).optional().default("in_app"),
  type: z.enum(notificationTypes),
  message: z.string().min(1).max(500),
  reference_type: z.string().optional().nullable(),
  reference_id: z.string().optional().nullable(),
});

export const listNotificationsQuerySchema = z.object({
  type: z.enum(notificationTypes).optional(),
  is_read: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
});

function objectIdOrNull(value?: string | null): Types.ObjectId | null {
  if (!value) return null;
  if (!Types.ObjectId.isValid(value)) return null;
  return new Types.ObjectId(value);
}

export async function createNotification(payload: z.input<typeof createNotificationSchema>) {
  const parsed = createNotificationSchema.parse(payload);
  await connectToDatabase();

  const userId = objectIdOrNull(parsed.user_id);
  if (!userId) {
    throw new Error("Invalid user_id for notification.");
  }

  const notification = await Notification.create({
    user_id: userId,
    channel: parsed.channel,
    type: parsed.type,
    message: parsed.message,
    reference_type: parsed.reference_type ?? null,
    reference_id: objectIdOrNull(parsed.reference_id ?? null),
    sent_at: new Date(),
  });

  return notification.toObject();
}

export async function listNotificationsForUser(
  userId: string,
  query: z.infer<typeof listNotificationsQuerySchema>,
) {
  await connectToDatabase();
  const parsed = listNotificationsQuerySchema.parse(query);

  const userObjectId = objectIdOrNull(userId);
  if (!userObjectId) {
    throw new Error("Invalid user id.");
  }

  const filter: Record<string, unknown> = { user_id: userObjectId };
  if (parsed.type) filter.type = parsed.type;
  if (parsed.is_read !== undefined) filter.is_read = parsed.is_read;

  const limit = parsed.limit ?? 50;
  const page = parsed.page ?? 1;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .select("type message channel reference_type reference_id is_read sent_at created_at")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

export async function notifyTicketUpdate(params: {
  ticket_id: string;
  student_profile_id: string;
  message: string;
}) {
  await connectToDatabase();
  const student = await Student.findById(params.student_profile_id)
    .select("user_id")
    .lean<{ user_id: Types.ObjectId } | null>();
  if (!student) return null;

  return createNotification({
    user_id: String(student.user_id),
    type: "ticket_update",
    message: params.message,
    reference_type: "ticket",
    reference_id: params.ticket_id,
  });
}

export async function notifyScheduleChange(params: {
  faculty_user_id: string;
  schedule_id: string;
  message: string;
}) {
  return createNotification({
    user_id: params.faculty_user_id,
    type: "schedule_update",
    message: params.message,
    reference_type: "schedule",
    reference_id: params.schedule_id,
  });
}

export async function notifyDocumentApprovalRequired(params: {
  document_reference_id: string;
  message: string;
}) {
  await connectToDatabase();
  const reviewers = await User.find({ role: { $in: ["admin", "registrar"] } })
    .select("_id")
    .lean<Array<{ _id: Types.ObjectId }>>();

  const results = [];
  for (const reviewer of reviewers) {
    // sequential write is acceptable at this scale and keeps error handling straightforward
    const created = await createNotification({
      user_id: String(reviewer._id),
      type: "approval_required",
      message: params.message,
      reference_type: "document",
      reference_id: params.document_reference_id,
    });
    results.push(created);
  }

  return results;
}
