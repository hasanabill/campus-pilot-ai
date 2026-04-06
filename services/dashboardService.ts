import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Approval from "@/models/Approval";
import ChatLog from "@/models/ChatLog";
import Notification from "@/models/Notification";
import Schedule from "@/models/Schedule";
import Student from "@/models/Student";
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

export type StudentDashboardOverview = {
  metrics: {
    my_open_tickets: number;
    unread_notifications: number;
    notifications_total: number;
  };
  recent_notifications: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    is_read: boolean;
  }>;
  upcoming_schedule: {
    has_item: boolean;
    day: string | null;
    start_time: string | null;
    end_time: string | null;
    semester: string | null;
    section: string | null;
    status: string | null;
  };
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

export async function getStudentDashboardOverview(userId: string): Promise<StudentDashboardOverview> {
  await connectToDatabase();

  const userObjectId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
  if (!userObjectId) {
    return {
      metrics: {
        my_open_tickets: 0,
        unread_notifications: 0,
        notifications_total: 0,
      },
      recent_notifications: [],
      upcoming_schedule: {
        has_item: false,
        day: null,
        start_time: null,
        end_time: null,
        semester: null,
        section: null,
        status: null,
      },
    };
  }

  const studentProfile = await Student.findOne({ user_id: userObjectId })
    .select("_id semester")
    .lean<{ _id: Types.ObjectId; semester?: number } | null>();

  const ticketFilter = studentProfile
    ? {
        student_id: studentProfile._id,
        status: { $in: ["pending", "in_review", "approved", "escalated"] },
      }
    : { _id: null };

  const scheduleSemester = studentProfile?.semester ? String(studentProfile.semester) : null;
  const scheduleFilter = scheduleSemester
    ? {
        semester: scheduleSemester,
        status: { $in: ["published", "updated"] },
      }
    : { _id: null };

  const [openTickets, unreadNotifications, totalNotifications, recentNotifications, nextSchedule] =
    await Promise.all([
      Ticket.countDocuments(ticketFilter),
      Notification.countDocuments({ user_id: userObjectId, is_read: false }),
      Notification.countDocuments({ user_id: userObjectId }),
      Notification.find({ user_id: userObjectId })
        .sort({ created_at: -1 })
        .limit(5)
        .select("_id type message created_at is_read")
        .lean<Array<{ _id: Types.ObjectId; type: string; message: string; created_at: Date; is_read: boolean }>>(),
      Schedule.findOne(scheduleFilter)
        .sort({ day: 1, start_time: 1 })
        .select("day start_time end_time semester section status")
        .lean<{
          day: string;
          start_time: string;
          end_time: string;
          semester: string;
          section: string;
          status: string;
        } | null>(),
    ]);

  return {
    metrics: {
      my_open_tickets: openTickets,
      unread_notifications: unreadNotifications,
      notifications_total: totalNotifications,
    },
    recent_notifications: recentNotifications.map((item) => ({
      id: String(item._id),
      type: item.type,
      message: item.message,
      timestamp: formatDate(item.created_at),
      is_read: item.is_read,
    })),
    upcoming_schedule: nextSchedule
      ? {
          has_item: true,
          day: nextSchedule.day,
          start_time: nextSchedule.start_time,
          end_time: nextSchedule.end_time,
          semester: nextSchedule.semester,
          section: nextSchedule.section,
          status: nextSchedule.status,
        }
      : {
          has_item: false,
          day: null,
          start_time: null,
          end_time: null,
          semester: null,
          section: null,
          status: null,
        },
  };
}
