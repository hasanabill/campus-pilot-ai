import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Approval from "@/models/Approval";
import ChatLog from "@/models/ChatLog";
import Notification from "@/models/Notification";
import Ticket from "@/models/Ticket";
import TicketActivityLog from "@/models/TicketActivityLog";

type AppRole = "student" | "faculty" | "admin" | "registrar";

export type DashboardOverview = {
  metrics: {
    tickets_total: number;
    chatbot_usage_total: number;
    pending_approvals: number;
    system_activity_events: number;
  };
  activity: Array<{
    type: "ticket" | "chat" | "notification";
    description: string;
    timestamp: string;
  }>;
};

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function getDashboardOverview(params: {
  requester_role: AppRole;
  requester_user_id: string;
}): Promise<DashboardOverview> {
  await connectToDatabase();

  const isAdminView = params.requester_role === "admin" || params.requester_role === "registrar";
  const requesterObjectId = Types.ObjectId.isValid(params.requester_user_id)
    ? new Types.ObjectId(params.requester_user_id)
    : null;

  const [ticketsTotal, chatbotUsageTotal, pendingApprovals, ticketEvents, chatEvents, notifEvents] =
    await Promise.all([
      Ticket.countDocuments(),
      ChatLog.countDocuments(),
      Approval.countDocuments({ decision: "pending" }),
      TicketActivityLog.find({})
        .sort({ created_at: -1 })
        .limit(15)
        .select("action created_at")
        .lean<Array<{ action: string; created_at: Date }>>(),
      ChatLog.find({})
        .sort({ created_at: -1 })
        .limit(10)
        .select("query created_at")
        .lean<Array<{ query: string; created_at: Date }>>(),
      Notification.find(
        isAdminView ? {} : requesterObjectId ? { user_id: requesterObjectId } : { _id: null },
      )
        .sort({ created_at: -1 })
        .limit(10)
        .select("type message created_at")
        .lean<Array<{ type: string; message: string; created_at: Date }>>(),
    ]);

  const activity = [
    ...ticketEvents.map((item) => ({
      type: "ticket" as const,
      description: `Ticket ${item.action.replace("_", " ")}`,
      timestamp: formatDate(item.created_at),
    })),
    ...chatEvents.map((item) => ({
      type: "chat" as const,
      description: `Chat query: ${item.query.slice(0, 80)}`,
      timestamp: formatDate(item.created_at),
    })),
    ...notifEvents.map((item) => ({
      type: "notification" as const,
      description: `${item.type}: ${item.message.slice(0, 80)}`,
      timestamp: formatDate(item.created_at),
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  return {
    metrics: {
      tickets_total: ticketsTotal,
      chatbot_usage_total: chatbotUsageTotal,
      pending_approvals: pendingApprovals,
      system_activity_events: activity.length,
    },
    activity,
  };
}
