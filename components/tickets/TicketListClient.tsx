"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import EmptyState  from "@/components/ui/EmptyState";
import EntityTable from "@/components/ui/EntityTable";
import FilterBar   from "@/components/ui/FilterBar";
import InlineAlert from "@/components/ui/InlineAlert";
import MetricCard  from "@/components/ui/MetricCard";
import PageHeader  from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type TicketItem = {
  _id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  assigned_to?: string | null;
  escalation_level?: number;
  due_date?: string | null;
  created_at?: string;
};

const statuses     = ["pending", "in_review", "approved", "rejected", "completed", "escalated"] as const;
const ticketTypes  = ["certificate", "transcript", "correction", "permission", "internship", "other"] as const;

function isOverdue(ticket: TicketItem): boolean {
  if (!ticket.due_date) return false;
  const due = new Date(ticket.due_date).getTime();
  return !Number.isNaN(due) && due < Date.now() && ["pending", "in_review", "approved"].includes(ticket.status);
}

export default function TicketListClient({ adminMode = false }: { adminMode?: boolean }) {
  const [tickets,         setTickets]         = useState<TicketItem[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [message,         setMessage]         = useState<string | null>(null);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [assigneeDrafts,  setAssigneeDrafts]  = useState<Record<string, string>>({});
  const [statusFilter,    setStatusFilter]    = useState("");
  const [typeFilter,      setTypeFilter]      = useState("");
  const [page,            setPage]            = useState(1);
  const [totalPages,      setTotalPages]      = useState(1);
  const [totalItems,      setTotalItems]      = useState(0);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ limit: "10", page: String(page) });
      if (statusFilter) q.set("status", statusFilter);
      if (typeFilter)   q.set("type",   typeFilter);

      const res     = await fetch(`/api/tickets?${q}`);
      const payload = (await res.json()) as { tickets?: TicketItem[]; total_pages?: number; total?: number; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load tickets.");

      setTickets(payload.tickets ?? []);
      setAssigneeDrafts((payload.tickets ?? []).reduce<Record<string, string>>((acc, t) => {
        acc[t._id] = t.assigned_to ?? "";
        return acc;
      }, {}));
      setTotalPages(payload.total_pages ?? 1);
      setTotalItems(payload.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  async function updateStatus(id: string, status: (typeof statuses)[number]) {
    setError(null); setMessage(null);
    try {
      const res = await fetch(`/api/tickets/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!res.ok) { const p = (await res.json()) as { error?: string }; throw new Error(p.error ?? "Update failed."); }
      setMessage("Ticket status updated.");
      await loadTickets();
    } catch (err) { setError(err instanceof Error ? err.message : "Update failed."); }
  }

  async function assignTicket(id: string, assignedTo: string) {
    setError(null); setMessage(null);
    try {
      const res = await fetch(`/api/tickets/${id}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assigned_to: assignedTo }) });
      if (!res.ok) { const p = (await res.json()) as { error?: string }; throw new Error(p.error ?? "Assignment failed."); }
      setMessage("Ticket assigned.");
      await loadTickets();
    } catch (err) { setError(err instanceof Error ? err.message : "Assignment failed."); }
  }

  async function escalateTicket(id: string) {
    setError(null); setMessage(null);
    if (!window.confirm("Escalate this ticket now?")) return;
    try {
      const res = await fetch(`/api/tickets/${id}/escalate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "manual_admin_escalation" }) });
      if (!res.ok) { const p = (await res.json()) as { error?: string }; throw new Error(p.error ?? "Escalation failed."); }
      setMessage("Ticket escalated.");
      await loadTickets();
    } catch (err) { setError(err instanceof Error ? err.message : "Escalation failed."); }
  }

  async function runEscalationSweep() {
    setError(null); setMessage(null);
    if (!window.confirm("Run escalation sweep for all overdue pending/in-review/approved tickets?")) return;
    try {
      const res     = await fetch("/api/tickets/escalate", { method: "POST" });
      const payload = (await res.json()) as { error?: string; escalated_count?: number };
      if (!res.ok) throw new Error(payload.error ?? "Sweep failed.");
      setMessage(`Escalation sweep complete. Escalated: ${payload.escalated_count ?? 0}.`);
      await loadTickets();
    } catch (err) { setError(err instanceof Error ? err.message : "Sweep failed."); }
  }

  const overdueCount      = tickets.filter(isOverdue).length;
  const escalatedCount    = tickets.filter((t) => t.status === "escalated").length;
  const highPriorityCount = tickets.filter((t) => ["high", "urgent"].includes(t.priority)).length;
  const displayed         = adminMode && showOverdueOnly ? tickets.filter(isOverdue) : tickets;

  const baseColumns = [
    { key: "title",    label: "Title",    render: (t: TicketItem) => <span className="font-medium text-zinc-900">{t.title}</span> },
    { key: "type",     label: "Type",     render: (t: TicketItem) => <span className="capitalize text-sm">{t.type}</span> },
    { key: "priority", label: "Priority", render: (t: TicketItem) => <StatusBadge label={t.priority} /> },
    { key: "status",   label: "Status",   render: (t: TicketItem) => <StatusBadge label={t.status} /> },
    {
      key: "due_date", label: "Due",
      render: (t: TicketItem) => t.due_date
        ? <span className={isOverdue(t) ? "font-semibold text-red-700" : ""}>{new Date(t.due_date).toLocaleDateString()}</span>
        : <span className="text-zinc-400">—</span>,
    },
  ];

  const adminColumns = adminMode ? [
    { key: "assignee",   label: "Assignee",   render: (t: TicketItem) => <span className="text-xs text-zinc-500">{t.assigned_to ?? "Unassigned"}</span> },
    { key: "escalation", label: "Escalation", render: (t: TicketItem) => <span className="tabular-nums">{t.escalation_level ?? 0}</span> },
  ] : [];

  const endingColumns = [
    { key: "created", label: "Created", render: (t: TicketItem) => <span className="text-xs text-zinc-400">{t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</span> },
  ];

  const actionColumns = adminMode ? [
    {
      key: "actions", label: "Actions",
      render: (ticket: TicketItem) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={ticket.status}
            onChange={(e) => void updateStatus(ticket._id, e.target.value as (typeof statuses)[number])}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-zinc-400"
          >
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={assigneeDrafts[ticket._id] ?? ""}
            onChange={(e) => setAssigneeDrafts((prev) => ({ ...prev, [ticket._id]: e.target.value }))}
            placeholder="User ID…"
            className="w-28 rounded-lg border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-400"
          />
          <button
            type="button"
            onClick={() => { const v = assigneeDrafts[ticket._id]; if (v?.trim()) void assignTicket(ticket._id, v.trim()); }}
            disabled={!assigneeDrafts[ticket._id]?.trim()}
            className="cp-btn-secondary px-2 py-1 text-xs disabled:opacity-40"
          >
            Assign
          </button>
          <button
            type="button"
            onClick={() => void escalateTicket(ticket._id)}
            className="cp-btn px-2 py-1 text-xs border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            Escalate
          </button>
        </div>
      ),
    },
  ] : [];

  const columns = [...baseColumns, ...adminColumns, ...endingColumns, ...actionColumns];

  return (
    <section className="space-y-5">
      <PageHeader
        title={adminMode ? "Ticket Management" : "My Tickets"}
        subtitle={adminMode
          ? "Track, assign, and escalate ticket workflows across all users."
          : "Your submitted requests. Filter by status or type to browse history."}
        actions={
          <div className="flex items-center gap-2">
            {adminMode
              ? <button type="button" onClick={() => void runEscalationSweep()} className="cp-btn px-3 py-1.5 text-xs border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100">Run Escalation Sweep</button>
              : <Link href="/tickets/new" className="cp-btn-primary text-xs">+ New Request</Link>}
            <button type="button" onClick={() => void loadTickets()} className="cp-btn-secondary text-xs">Refresh</button>
          </div>
        }
      />

      {adminMode ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Overdue"     value={overdueCount}      accent="amber" />
          <MetricCard label="High/Urgent" value={highPriorityCount} accent="sky" />
          <MetricCard label="Escalated"   value={escalatedCount}    accent="indigo" />
        </div>
      ) : null}

      <FilterBar>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="cp-select w-auto">
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="cp-select w-auto">
          <option value="">All types</option>
          {ticketTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {adminMode ? (
          <button type="button" onClick={() => setShowOverdueOnly((v) => !v)} className={`cp-btn-secondary text-xs ${showOverdueOnly ? "ring-2 ring-amber-300" : ""}`}>
            {showOverdueOnly ? "Show All" : "Overdue Only"}
          </button>
        ) : null}
        <span className="ml-auto text-xs text-zinc-400">{totalItems} total</span>
      </FilterBar>

      {loading ? <InlineAlert tone="info"    message="Loading tickets…" /> : null}
      {error   ? <InlineAlert tone="error"   message={error} /> : null}
      {message ? <InlineAlert tone="success" message={message} /> : null}

      {!loading && displayed.length === 0 ? (
        <EmptyState
          title={showOverdueOnly ? "No overdue tickets on this page" : "No tickets found"}
          description={showOverdueOnly ? "Try another page or remove overdue-only filter." : "Adjust filters or create a new request."}
        />
      ) : null}

      {!loading && displayed.length > 0 ? (
        <>
          <EntityTable
            columns={columns}
            rows={displayed}
            rowKey={(row) => row._id}
            minWidthClassName={adminMode ? "min-w-[1050px]" : "min-w-[720px]"}
          />
          <div className="flex items-center justify-end gap-2">
            <button type="button" disabled={page <= 1}          onClick={() => setPage((p) => p - 1)} className="cp-btn-secondary text-xs disabled:opacity-40">← Prev</button>
            <span className="text-xs text-zinc-400">{page} / {Math.max(1, totalPages)}</span>
            <button type="button" disabled={page >= totalPages}  onClick={() => setPage((p) => p + 1)} className="cp-btn-secondary text-xs disabled:opacity-40">Next →</button>
          </div>
        </>
      ) : null}
    </section>
  );
}
