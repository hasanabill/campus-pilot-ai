import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import TicketActivityLog from "@/models/TicketActivityLog";

const sources = ["all", "audit", "ticket"] as const;
const severities = ["all", "info", "warning", "critical"] as const;

export const listActivityLogsQuerySchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  source: z.enum(sources).optional().default("all"),
  severity: z.enum(severities).optional().default("all"),
  action: z.string().trim().max(100).optional().default(""),
});

export type ActivityLogItem = {
  id: string;
  source: "audit" | "ticket";
  action: string;
  severity: "info" | "warning" | "critical";
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  summary: string;
};

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

export async function listActivityLogs(query: z.infer<typeof listActivityLogsQuerySchema>) {
  const parsed = listActivityLogsQuerySchema.parse(query);
  await connectToDatabase();

  const [auditRows, ticketRows] = await Promise.all([
    parsed.source === "ticket"
      ? Promise.resolve([])
      : AuditLog.find({})
          .select("actor_id action entity_type entity_id severity created_at")
          .sort({ created_at: -1 })
          .limit(400)
          .lean<
            Array<{
              _id: { toString(): string };
              actor_id?: { toString(): string } | null;
              action: string;
              entity_type: string;
              entity_id?: { toString(): string } | null;
              severity?: "info" | "warning" | "critical";
              created_at?: Date | string;
            }>
          >(),
    parsed.source === "audit"
      ? Promise.resolve([])
      : TicketActivityLog.find({})
          .select("actor_id action ticket_id created_at")
          .sort({ created_at: -1 })
          .limit(400)
          .lean<
            Array<{
              _id: { toString(): string };
              actor_id?: { toString(): string } | null;
              action: string;
              ticket_id?: { toString(): string } | null;
              created_at?: Date | string;
            }>
          >(),
  ]);

  const mappedAudit: ActivityLogItem[] = auditRows.map((row) => ({
    id: row._id.toString(),
    source: "audit",
    action: row.action,
    severity: row.severity ?? "info",
    actor_id: row.actor_id ? row.actor_id.toString() : null,
    entity_type: row.entity_type,
    entity_id: row.entity_id ? row.entity_id.toString() : null,
    created_at: toIso(row.created_at),
    summary: `Audit ${row.action} on ${row.entity_type}`,
  }));

  const mappedTicket: ActivityLogItem[] = ticketRows.map((row) => ({
    id: row._id.toString(),
    source: "ticket",
    action: row.action,
    severity: row.action === "escalated" ? "warning" : "info",
    actor_id: row.actor_id ? row.actor_id.toString() : null,
    entity_type: "ticket",
    entity_id: row.ticket_id ? row.ticket_id.toString() : null,
    created_at: toIso(row.created_at),
    summary: `Ticket ${row.action}`,
  }));

  const actionFilter = parsed.action.toLowerCase();
  const merged = [...mappedAudit, ...mappedTicket]
    .filter((item) => (parsed.severity === "all" ? true : item.severity === parsed.severity))
    .filter((item) =>
      actionFilter ? item.action.toLowerCase().includes(actionFilter) : true,
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = merged.length;
  const start = (parsed.page - 1) * parsed.limit;
  const items = merged.slice(start, start + parsed.limit);

  return {
    items,
    total,
    page: parsed.page,
    limit: parsed.limit,
    total_pages: Math.ceil(total / parsed.limit),
  };
}
