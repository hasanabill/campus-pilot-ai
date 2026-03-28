import { Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import Student from "@/models/Student";
import Ticket from "@/models/Ticket";
import TicketActivityLog from "@/models/TicketActivityLog";

const ticketTypes = ["certificate", "transcript", "correction", "permission", "internship", "other"] as const;
const ticketPriorities = ["low", "medium", "high", "urgent"] as const;
const ticketStatuses = ["pending", "in_review", "approved", "rejected", "completed", "escalated"] as const;

type AppRole = "student" | "faculty" | "admin" | "registrar";

export const createTicketSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  type: z.enum(ticketTypes),
  priority: z.enum(ticketPriorities).optional().default("medium"),
  due_date: z.string().datetime().optional().nullable(),
  student_profile_id: z.string().optional(),
});

export const updateTicketSchema = z.object({
  status: z.enum(ticketStatuses).optional(),
  priority: z.enum(ticketPriorities).optional(),
  assigned_to: z.string().optional().nullable(),
  escalation_level: z.number().int().min(0).optional(),
  due_date: z.string().datetime().optional().nullable(),
});

export const listTicketsQuerySchema = z.object({
  status: z.enum(ticketStatuses).optional(),
  type: z.enum(ticketTypes).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

type Requester = {
  userId: string;
  role: AppRole;
};

function requireObjectId(id: string, field: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${field}.`);
  }
  return new Types.ObjectId(id);
}

async function resolveStudentProfileId(requester: Requester, studentProfileId?: string) {
  if (requester.role === "student") {
    const student = await Student.findOne({ user_id: requireObjectId(requester.userId, "user id") })
      .select("_id")
      .lean<{ _id: Types.ObjectId } | null>();
    if (!student) {
      throw new Error(
        "Student profile not found. Create a Student record first before submitting tickets.",
      );
    }
    return student._id;
  }

  if (!studentProfileId) {
    throw new Error("student_profile_id is required for non-student ticket creation.");
  }
  return requireObjectId(studentProfileId, "student_profile_id");
}

function isPrivileged(role: AppRole): boolean {
  return role === "admin" || role === "faculty" || role === "registrar";
}

export async function createTicket(requester: Requester, payload: z.infer<typeof createTicketSchema>) {
  const parsed = createTicketSchema.parse(payload);
  await connectToDatabase();

  const studentId = await resolveStudentProfileId(requester, parsed.student_profile_id);

  const ticket = await Ticket.create({
    student_id: studentId,
    title: parsed.title,
    description: parsed.description,
    type: parsed.type,
    priority: parsed.priority,
    status: "pending",
    due_date: parsed.due_date ? new Date(parsed.due_date) : null,
  });

  await TicketActivityLog.create({
    ticket_id: ticket._id,
    actor_id: requireObjectId(requester.userId, "user id"),
    action: "created",
    old_value: null,
    new_value: { status: "pending" },
  });

  return ticket.toObject();
}

export async function listTickets(requester: Requester, query: z.infer<typeof listTicketsQuerySchema>) {
  const parsed = listTicketsQuerySchema.parse(query);
  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (parsed.status) {
    filter.status = parsed.status;
  }
  if (parsed.type) {
    filter.type = parsed.type;
  }

  if (!isPrivileged(requester.role)) {
    const student = await Student.findOne({ user_id: requireObjectId(requester.userId, "user id") })
      .select("_id")
      .lean<{ _id: Types.ObjectId } | null>();
    if (!student) {
      return [];
    }
    filter.student_id = student._id;
  }

  const limit = parsed.limit ?? 50;
  const tickets = await Ticket.find(filter)
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();

  return tickets;
}

export async function getTicketById(requester: Requester, ticketId: string) {
  await connectToDatabase();

  const ticket = await Ticket.findById(requireObjectId(ticketId, "ticket id")).lean();
  if (!ticket) {
    return null;
  }

  if (isPrivileged(requester.role)) {
    return ticket;
  }

  const student = await Student.findOne({ user_id: requireObjectId(requester.userId, "user id") })
    .select("_id")
    .lean<{ _id: Types.ObjectId } | null>();

  if (!student || String(ticket.student_id) !== String(student._id)) {
    return null;
  }

  return ticket;
}

export async function updateTicket(
  requester: Requester,
  ticketId: string,
  payload: z.infer<typeof updateTicketSchema>,
) {
  if (!isPrivileged(requester.role)) {
    throw new Error("Only faculty/admin/registrar can update tickets.");
  }

  const parsed = updateTicketSchema.parse(payload);
  await connectToDatabase();

  const existing = await Ticket.findById(requireObjectId(ticketId, "ticket id"));
  if (!existing) {
    return null;
  }

  const oldValue = {
    status: existing.status,
    priority: existing.priority,
    assigned_to: existing.assigned_to ? String(existing.assigned_to) : null,
    escalation_level: existing.escalation_level,
    due_date: existing.due_date,
  };

  if (parsed.status !== undefined) existing.status = parsed.status;
  if (parsed.priority !== undefined) existing.priority = parsed.priority;
  if (parsed.escalation_level !== undefined) existing.escalation_level = parsed.escalation_level;
  if (parsed.assigned_to !== undefined) {
    existing.assigned_to = parsed.assigned_to
      ? requireObjectId(parsed.assigned_to, "assigned_to")
      : null;
  }
  if (parsed.due_date !== undefined) {
    existing.due_date = parsed.due_date ? new Date(parsed.due_date) : null;
  }

  await existing.save();

  await TicketActivityLog.create({
    ticket_id: existing._id,
    actor_id: requireObjectId(requester.userId, "user id"),
    action: "status_changed",
    old_value: oldValue,
    new_value: {
      status: existing.status,
      priority: existing.priority,
      assigned_to: existing.assigned_to ? String(existing.assigned_to) : null,
      escalation_level: existing.escalation_level,
      due_date: existing.due_date,
    },
  });

  return existing.toObject();
}
