"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import EntityTable from "@/components/ui/EntityTable";
import FilterBar from "@/components/ui/FilterBar";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type TicketItem = {
  _id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  assigned_to?: string | null;
  escalation_level?: number;
  created_at?: string;
};

type TicketListClientProps = {
  adminMode?: boolean;
};

const statuses = ["pending", "in_review", "approved", "rejected", "completed", "escalated"] as const;
const ticketTypes = ["certificate", "transcript", "correction", "permission", "internship", "other"] as const;

export default function TicketListClient({ adminMode = false }: TicketListClientProps) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      query.set("limit", "10");
      query.set("page", String(page));
      if (statusFilter) query.set("status", statusFilter);
      if (typeFilter) query.set("type", typeFilter);

      const response = await fetch(`/api/tickets?${query.toString()}`);
      const payload = (await response.json()) as {
        tickets?: TicketItem[];
        total_pages?: number;
        total?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load tickets.");
      }
      setTickets(payload.tickets ?? []);
      setTotalPages(payload.total_pages ?? 1);
      setTotalItems(payload.total ?? 0);
    } catch (loadError) {
      const msg = loadError instanceof Error ? loadError.message : "Failed to load tickets.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  async function updateStatus(ticketId: string, status: (typeof statuses)[number]) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Status update failed.");
      }
      setMessage("Ticket status updated.");
      await loadTickets();
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : "Status update failed.";
      setError(msg);
    }
  }

  async function assignTicket(ticketId: string, assignedTo: string) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: assignedTo }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Assignment failed.");
      }
      setMessage("Ticket assigned successfully.");
      await loadTickets();
    } catch (assignError) {
      const msg = assignError instanceof Error ? assignError.message : "Assignment failed.";
      setError(msg);
    }
  }

  async function escalateTicket(ticketId: string) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "manual_admin_escalation" }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Escalation failed.");
      }
      setMessage("Ticket escalated.");
      await loadTickets();
    } catch (escalateError) {
      const msg = escalateError instanceof Error ? escalateError.message : "Escalation failed.";
      setError(msg);
    }
  }

  async function runEscalationSweep() {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/tickets/escalate", { method: "POST" });
      const payload = (await response.json()) as { error?: string; escalated_count?: number };
      if (!response.ok) {
        throw new Error(payload.error ?? "Escalation sweep failed.");
      }
      setMessage(`Escalation sweep complete. Escalated: ${payload.escalated_count ?? 0}.`);
      await loadTickets();
    } catch (sweepError) {
      const msg = sweepError instanceof Error ? sweepError.message : "Escalation sweep failed.";
      setError(msg);
    }
  }

  const baseColumns = [
    {
      key: "title",
      label: "Title",
      render: (ticket: TicketItem) => <span className="font-medium text-zinc-900">{ticket.title}</span>,
    },
    { key: "type", label: "Type", render: (ticket: TicketItem) => ticket.type },
    { key: "priority", label: "Priority", render: (ticket: TicketItem) => ticket.priority },
    {
      key: "status",
      label: "Status",
      render: (ticket: TicketItem) => <StatusBadge label={ticket.status} />,
    },
  ];

  const adminColumns = adminMode
    ? [
        {
          key: "assignee",
          label: "Assignee",
          render: (ticket: TicketItem) => ticket.assigned_to ?? "Unassigned",
        },
        {
          key: "escalation",
          label: "Escalation",
          render: (ticket: TicketItem) => String(ticket.escalation_level ?? 0),
        },
      ]
    : [];

  const endingColumns = [
    {
      key: "created",
      label: "Created",
      render: (ticket: TicketItem) =>
        ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "-",
    },
  ];

  const actionColumns = adminMode
    ? [
        {
          key: "actions",
          label: "Actions",
          render: (ticket: TicketItem) => (
            <div className="flex items-center gap-2">
              <select
                value={ticket.status}
                onChange={(event) =>
                  void updateStatus(ticket._id, event.target.value as (typeof statuses)[number])
                }
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const assignedTo = window.prompt(
                    "Enter assignee user ID (ObjectId):",
                    ticket.assigned_to ?? "",
                  );
                  if (assignedTo && assignedTo.trim()) {
                    void assignTicket(ticket._id, assignedTo.trim());
                  }
                }}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
              >
                Assign
              </button>
              <button
                onClick={() => void escalateTicket(ticket._id)}
                className="rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
              >
                Escalate
              </button>
            </div>
          ),
        },
      ]
    : [];

  const columns = [...baseColumns, ...adminColumns, ...endingColumns, ...actionColumns];

  return (
    <section className="space-y-4">
      <PageHeader
        title={adminMode ? "Admin Ticket Dashboard" : "My Tickets"}
        subtitle={
          adminMode
            ? "Track, assign, and escalate ticket workflows."
            : "Only your own tickets are shown. Filter by status/type and use pagination to browse history."
        }
        actions={
          <>
            {adminMode ? (
              <button
                onClick={() => void runEscalationSweep()}
                className="rounded-md border border-amber-300 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50"
              >
                Run Escalation Sweep
              </button>
            ) : (
              <Link
                href="/tickets/new"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                New Request
              </Link>
            )}
            <button
              onClick={() => void loadTickets()}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Refresh
            </button>
          </>
        }
      />

      <FilterBar>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          {ticketTypes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-zinc-500">Total: {totalItems}</div>
      </FilterBar>

      {loading ? <InlineAlert tone="info" message="Loading tickets..." /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}
      {message ? <InlineAlert tone="success" message={message} /> : null}

      {!loading && tickets.length === 0 ? (
        <EmptyState
          title="No tickets found"
          description="Try adjusting filters or create a new request."
        />
      ) : null}

      {!loading && tickets.length > 0 ? (
        <>
          <EntityTable
            columns={columns}
            rows={tickets}
            rowKey={(row) => row._id}
            minWidthClassName={adminMode ? "min-w-[980px]" : "min-w-[720px]"}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-600">
              Page {page} / {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
