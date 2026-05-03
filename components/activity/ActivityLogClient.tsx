"use client";

import { useCallback, useEffect, useState } from "react";

import EmptyState  from "@/components/ui/EmptyState";
import EntityTable from "@/components/ui/EntityTable";
import FilterBar   from "@/components/ui/FilterBar";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader  from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type ActivityLogItem = {
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

export default function ActivityLogClient() {
  const [items,      setItems]      = useState<ActivityLogItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const [source,     setSource]     = useState<"all" | "audit" | "ticket">("all");
  const [severity,   setSeverity]   = useState<"all" | "info" | "warning" | "critical">("all");
  const [action,     setAction]     = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const q = new URLSearchParams({ page: String(page), limit: "20", source, severity });
      if (action.trim()) q.set("action", action.trim());

      const res     = await fetch(`/api/activity-logs?${q}`);
      const payload = (await res.json()) as { items?: ActivityLogItem[]; total?: number; total_pages?: number; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load activity logs.");
      setItems(payload.items ?? []);
      setTotal(payload.total ?? 0);
      setTotalPages(payload.total_pages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  }, [action, page, severity, source]);

  useEffect(() => { void load(); }, [load]);

  const columns = [
    {
      key: "created_at",
      label: "Timestamp",
      render: (item: ActivityLogItem) => <span className="text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()}</span>,
    },
    {
      key: "source",
      label: "Source",
      render: (item: ActivityLogItem) => <StatusBadge label={item.source} tone="default" />,
    },
    {
      key: "severity",
      label: "Severity",
      render: (item: ActivityLogItem) => (
        <StatusBadge
          label={item.severity}
          tone={item.severity === "critical" ? "danger" : item.severity === "warning" ? "warning" : "info"}
        />
      ),
    },
    {
      key: "summary",
      label: "Event",
      render: (item: ActivityLogItem) => (
        <div>
          <p className="font-medium text-zinc-900 text-sm">{item.summary}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {item.action} · {item.entity_type}{item.entity_id ? ` · ${item.entity_id}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "actor",
      label: "Actor",
      render: (item: ActivityLogItem) => (
        <span className="text-xs text-zinc-500 font-mono">{item.actor_id ?? "—"}</span>
      ),
    },
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        title="Activity Log"
        subtitle="Consolidated audit and ticket activity stream. Admin-only."
        actions={
          <button type="button" onClick={() => void load()} className="cp-btn-secondary text-xs">
            Refresh
          </button>
        }
      />

      <FilterBar>
        <select value={source}   onChange={(e) => { setSource(e.target.value as typeof source); setPage(1); }}   className="cp-select w-auto">
          <option value="all">All sources</option>
          <option value="audit">Audit</option>
          <option value="ticket">Ticket</option>
        </select>
        <select value={severity} onChange={(e) => { setSeverity(e.target.value as typeof severity); setPage(1); }} className="cp-select w-auto">
          <option value="all">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <input
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          placeholder="Filter by action…"
          className="cp-input w-44"
        />
        <span className="ml-auto text-xs text-zinc-400">{total} events</span>
      </FilterBar>

      {loading ? <InlineAlert tone="info" message="Loading activity logs…" /> : null}
      {error   ? <InlineAlert tone="error" message={error} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title="No activity logs" description="Try broadening your filters." />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <EntityTable
            columns={columns}
            rows={items}
            rowKey={(item) => item.id}
            minWidthClassName="min-w-[900px]"
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
