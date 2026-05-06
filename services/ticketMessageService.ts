import { Types } from "mongoose";
import { z } from "zod";

import Student from "@/models/Student";
import TicketMessage from "@/models/TicketMessage";
import { createNotification } from "@/services/notificationService";
import { getTicketById } from "@/services/ticketService";

type AppRole = "student" | "faculty" | "admin" | "registrar";

export const createTicketMessageSchema = z.object({
  message: z.string().min(1).max(3000),
  attachment_urls: z.array(z.string().url()).optional().default([]),
});

function isPrivileged(role: AppRole) {
  return role === "admin" || role === "faculty" || role === "registrar";
}

export async function listTicketMessages(requester: { userId: string; role: AppRole }, ticketId: string) {
  const ticket = await getTicketById(requester, ticketId);
  if (!ticket) return null;
  const messages = await TicketMessage.find({ ticket_id: new Types.ObjectId(ticketId) })
    .sort({ created_at: 1 })
    .lean();
  return { ticket, messages };
}

export async function createTicketMessage(
  requester: { userId: string; role: AppRole },
  ticketId: string,
  payload: z.infer<typeof createTicketMessageSchema>,
) {
  const parsed = createTicketMessageSchema.parse(payload);
  const ticket = await getTicketById(requester, ticketId);
  if (!ticket) return null;

  const message = await TicketMessage.create({
    ticket_id: new Types.ObjectId(ticketId),
    sender_id: new Types.ObjectId(requester.userId),
    sender_role: requester.role,
    message: parsed.message,
    attachment_urls: parsed.attachment_urls,
  });

  if (isPrivileged(requester.role)) {
    const student = await Student.findById(ticket.student_id).select("user_id").lean<{ user_id: Types.ObjectId } | null>();
    if (student) {
      await createNotification({
        user_id: String(student.user_id),
        type: "ticket_update",
        message: `New message on ticket "${ticket.title}".`,
        reference_type: "ticket",
        reference_id: ticketId,
      }).catch(() => null);
    }
  }

  return message.toObject();
}
