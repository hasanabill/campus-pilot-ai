import { Types } from "mongoose";
import { z } from "zod";

import WorkflowTask from "@/models/WorkflowTask";
import { createNotification } from "@/services/notificationService";
import { connectToDatabase } from "@/lib/mongodb";

type AppRole = "student" | "faculty" | "admin" | "registrar";

const entityTypes = ["ticket", "document", "schedule", "approval"] as const;
const statuses = ["pending", "in_progress", "completed", "cancelled"] as const;
const priorities = ["low", "medium", "high", "urgent"] as const;

export const createWorkflowTaskSchema = z.object({
  entity_type: z.enum(entityTypes),
  entity_id: z.string().min(1),
  task_type: z.string().min(2).max(120),
  assigned_to: z.string().min(1),
  due_date: z.string().datetime().optional().nullable(),
  status: z.enum(statuses).optional().default("pending"),
  priority: z.enum(priorities).optional().default("medium"),
});

export const listWorkflowTasksQuerySchema = z.object({
  status: z.enum(statuses).optional(),
  assigned_to: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
});

export const updateWorkflowTaskSchema = createWorkflowTaskSchema.partial();

function canManageTasks(role: AppRole) {
  return role === "admin" || role === "faculty" || role === "registrar";
}

function oid(id: string, field: string) {
  if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid ${field}.`);
  return new Types.ObjectId(id);
}

export async function createWorkflowTask(requester: { role: AppRole }, payload: z.infer<typeof createWorkflowTaskSchema>) {
  if (!canManageTasks(requester.role)) throw new Error("Only faculty/admin/registrar can manage workflow tasks.");
  const parsed = createWorkflowTaskSchema.parse(payload);
  await connectToDatabase();
  const task = await WorkflowTask.create({
    ...parsed,
    entity_id: oid(parsed.entity_id, "entity_id"),
    assigned_to: oid(parsed.assigned_to, "assigned_to"),
    due_date: parsed.due_date ? new Date(parsed.due_date) : null,
  });
  await createNotification({
    user_id: parsed.assigned_to,
    type: "reminder",
    message: `New workflow task assigned: ${parsed.task_type}`,
    reference_type: parsed.entity_type,
    reference_id: parsed.entity_id,
  }).catch(() => null);
  return task.toObject();
}

export async function listWorkflowTasks(
  requester: { userId: string; role: AppRole },
  query: z.infer<typeof listWorkflowTasksQuerySchema>,
) {
  if (!canManageTasks(requester.role)) throw new Error("Only faculty/admin/registrar can view workflow tasks.");
  const parsed = listWorkflowTasksQuerySchema.parse(query);
  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (parsed.status) filter.status = parsed.status;
  if (parsed.assigned_to) filter.assigned_to = oid(parsed.assigned_to, "assigned_to");
  if (requester.role === "faculty") filter.assigned_to = oid(requester.userId, "user id");
  const limit = parsed.limit ?? 30;
  const page = parsed.page ?? 1;
  const skip = (page - 1) * limit;
  const [tasks, total] = await Promise.all([
    WorkflowTask.find(filter).sort({ due_date: 1, created_at: -1 }).skip(skip).limit(limit).lean(),
    WorkflowTask.countDocuments(filter),
  ]);
  return { tasks, total, page, limit, total_pages: Math.ceil(total / limit) };
}

export async function updateWorkflowTask(
  requester: { role: AppRole },
  taskId: string,
  payload: z.infer<typeof updateWorkflowTaskSchema>,
) {
  if (!canManageTasks(requester.role)) throw new Error("Only faculty/admin/registrar can manage workflow tasks.");
  const parsed = updateWorkflowTaskSchema.parse(payload);
  await connectToDatabase();
  const update = {
    ...parsed,
    entity_id: parsed.entity_id ? oid(parsed.entity_id, "entity_id") : undefined,
    assigned_to: parsed.assigned_to ? oid(parsed.assigned_to, "assigned_to") : undefined,
    due_date: parsed.due_date !== undefined ? (parsed.due_date ? new Date(parsed.due_date) : null) : undefined,
  };
  return WorkflowTask.findByIdAndUpdate(oid(taskId, "task id"), update, { new: true, runValidators: true }).lean();
}

export async function dispatchDueTaskReminders(requester: { role: AppRole }) {
  if (requester.role !== "admin" && requester.role !== "registrar") {
    throw new Error("Only admin/registrar can dispatch workflow reminders.");
  }
  await connectToDatabase();
  const now = new Date();
  const tasks = await WorkflowTask.find({
    status: { $in: ["pending", "in_progress"] },
    due_date: { $ne: null, $lte: now },
  }).lean<Array<{ _id: Types.ObjectId; assigned_to: Types.ObjectId; task_type: string; entity_type: string; entity_id: Types.ObjectId }>>();

  for (const task of tasks) {
    await createNotification({
      user_id: String(task.assigned_to),
      type: "reminder",
      message: `Workflow task is due: ${task.task_type}`,
      reference_type: task.entity_type,
      reference_id: String(task.entity_id),
    }).catch(() => null);
  }

  return { reminded_count: tasks.length };
}
