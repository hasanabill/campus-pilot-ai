import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import ChatLog from "@/models/ChatLog";
import Report from "@/models/Report";
import Ticket from "@/models/Ticket";

const reportTypes = [
  "accreditation",
  "audit",
  "university_submission",
  "department_performance",
] as const;

export const reportQuerySchema = z.object({
  period_start: z.string().datetime().optional(),
  period_end: z.string().datetime().optional(),
});

export const generateReportSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  report_type: z.enum(reportTypes).optional().default("department_performance"),
  period_start: z.string().datetime().optional(),
  period_end: z.string().datetime().optional(),
});

export type ReportSummary = {
  period: { start: string; end: string };
  ticket_stats: {
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
  };
  ai_query_stats: {
    total_queries: number;
    unique_users: number;
    routed_to_ticket: number;
    avg_confidence_score: number;
  };
  request_completion: {
    completed: number;
    completion_rate_percent: number;
  };
};

function getPeriodBounds(input: z.infer<typeof reportQuerySchema>) {
  const parsed = reportQuerySchema.parse(input);
  const end = parsed.period_end ? new Date(parsed.period_end) : new Date();
  const start = parsed.period_start
    ? new Date(parsed.period_start)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (start > end) {
    throw new Error("period_start must be before period_end.");
  }

  return { start, end };
}

function toMap(items: Array<{ _id: string; count: number }>): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
}

export async function getReportSummary(
  input: z.infer<typeof reportQuerySchema>,
): Promise<ReportSummary> {
  const { start, end } = getPeriodBounds(input);
  await connectToDatabase();

  const [ticketTotal, ticketsByStatus, ticketsByType, chatTotal, uniqueUsers, routedCount, avgConfidence, completedCount] =
    await Promise.all([
      Ticket.countDocuments({ created_at: { $gte: start, $lte: end } }),
      Ticket.aggregate<{ _id: string; count: number }>([
        { $match: { created_at: { $gte: start, $lte: end } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Ticket.aggregate<{ _id: string; count: number }>([
        { $match: { created_at: { $gte: start, $lte: end } } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      ChatLog.countDocuments({ created_at: { $gte: start, $lte: end } }),
      ChatLog.aggregate<{ _id: null; count: number }>([
        { $match: { created_at: { $gte: start, $lte: end } } },
        { $group: { _id: null, users: { $addToSet: "$user_id" } } },
        { $project: { count: { $size: "$users" } } },
      ]),
      ChatLog.countDocuments({
        created_at: { $gte: start, $lte: end },
        routed_to_ticket_id: { $ne: null },
      }),
      ChatLog.aggregate<{ _id: null; avg: number }>([
        {
          $match: {
            created_at: { $gte: start, $lte: end },
            confidence_score: { $ne: null },
          },
        },
        { $group: { _id: null, avg: { $avg: "$confidence_score" } } },
      ]),
      Ticket.countDocuments({
        created_at: { $gte: start, $lte: end },
        status: "completed",
      }),
    ]);

  const completionRate = ticketTotal === 0 ? 0 : (completedCount / ticketTotal) * 100;

  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    ticket_stats: {
      total: ticketTotal,
      by_status: toMap(ticketsByStatus),
      by_type: toMap(ticketsByType),
    },
    ai_query_stats: {
      total_queries: chatTotal,
      unique_users: uniqueUsers[0]?.count ?? 0,
      routed_to_ticket: routedCount,
      avg_confidence_score: Number((avgConfidence[0]?.avg ?? 0).toFixed(4)),
    },
    request_completion: {
      completed: completedCount,
      completion_rate_percent: Number(completionRate.toFixed(2)),
    },
  };
}

function summaryToText(summary: ReportSummary): string {
  return [
    `Period: ${summary.period.start} to ${summary.period.end}`,
    `Ticket total: ${summary.ticket_stats.total}`,
    `Ticket by status: ${JSON.stringify(summary.ticket_stats.by_status)}`,
    `Ticket by type: ${JSON.stringify(summary.ticket_stats.by_type)}`,
    `AI queries: ${summary.ai_query_stats.total_queries}`,
    `AI unique users: ${summary.ai_query_stats.unique_users}`,
    `AI routed to ticket: ${summary.ai_query_stats.routed_to_ticket}`,
    `AI avg confidence: ${summary.ai_query_stats.avg_confidence_score}`,
    `Completed requests: ${summary.request_completion.completed}`,
    `Completion rate (%): ${summary.request_completion.completion_rate_percent}`,
  ].join("\n");
}

export async function generateAndStoreReport(
  requesterId: string,
  input: z.infer<typeof generateReportSchema>,
) {
  const parsed = generateReportSchema.parse(input);
  const summary = await getReportSummary({
    period_start: parsed.period_start,
    period_end: parsed.period_end,
  });

  await connectToDatabase();
  const report = await Report.create({
    title:
      parsed.title ??
      `Department Report ${new Date(summary.period.start).toLocaleDateString()} - ${new Date(
        summary.period.end,
      ).toLocaleDateString()}`,
    report_type: parsed.report_type,
    period_start: new Date(summary.period.start),
    period_end: new Date(summary.period.end),
    generated_by: requesterId,
    summary_text: summaryToText(summary),
  });

  return { report: report.toObject(), summary };
}

export function summaryToCsv(summary: ReportSummary): string {
  const lines: string[] = [];
  lines.push("section,metric,value");
  lines.push(`period,start,${summary.period.start}`);
  lines.push(`period,end,${summary.period.end}`);
  lines.push(`ticket_stats,total,${summary.ticket_stats.total}`);

  Object.entries(summary.ticket_stats.by_status).forEach(([status, count]) => {
    lines.push(`ticket_by_status,${status},${count}`);
  });
  Object.entries(summary.ticket_stats.by_type).forEach(([type, count]) => {
    lines.push(`ticket_by_type,${type},${count}`);
  });

  lines.push(`ai_query_stats,total_queries,${summary.ai_query_stats.total_queries}`);
  lines.push(`ai_query_stats,unique_users,${summary.ai_query_stats.unique_users}`);
  lines.push(`ai_query_stats,routed_to_ticket,${summary.ai_query_stats.routed_to_ticket}`);
  lines.push(`ai_query_stats,avg_confidence_score,${summary.ai_query_stats.avg_confidence_score}`);

  lines.push(`request_completion,completed,${summary.request_completion.completed}`);
  lines.push(
    `request_completion,completion_rate_percent,${summary.request_completion.completion_rate_percent}`,
  );

  return lines.join("\n");
}
