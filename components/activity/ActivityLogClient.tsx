"use client";

import { useCallback, useEffect, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import EntityTable from "@/components/ui/EntityTable";
import FilterBar from "@/components/ui/FilterBar";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";
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
  const [items, setItems] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<"all" | "audit" | "ticket">("all");
  const [severity, setSeverity] = useState<
    "all" | "info" | "warning" | "critical"
  >("all");
  const [action, setAction] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("page", String(page));
      query.set("limit", "20");
      query.set("source", source);
      query.set("severity", severity);
      if (action.trim()) query.set("action", action.trim());

      const response = await fetch(`/api/activity-logs?${query.toString()}`);
      const payload = (await response.json()) as {
        items?: ActivityLogItem[];
        total?: number;
        total_pages?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load activity logs.");
      }
      setItems(payload.items ?? []);
      setTotal(payload.total ?? 0);
      setTotalPages(payload.total_pages ?? 1);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load activity logs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [action, page, severity, source]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const columns = [
    {
      key: "created_at",
      label: "Timestamp",
      render: (item: ActivityLogItem) =>
        new Date(item.created_at).toLocaleString(),
    },
    {
      key: "source",
      label: "Source",
      render: (item: ActivityLogItem) => (
        <StatusBadge label={item.source} tone="default" />
      ),
    },
    {
      key: "severity",
      label: "Severity",
      render: (item: ActivityLogItem) => <StatusBadge label={item.severity} />,
    },
    {
      key: "summary",
      label: "Summary",
      render: (item: ActivityLogItem) => (
        <div>
          <p className="font-medium text-zinc-900">{item.summary}</p>
          <p className="text-xs text-zinc-900">
            action: {item.action} | entity: {item.entity_type} | entity_id:{" "}
            {item.entity_id ?? "-"}
          </p>
        </div>
      ),
    },
    {
      key: "actor",
      label: "Actor ID",
      render: (item: ActivityLogItem) => item.actor_id ?? "-",
    },
  ];

  return (
    <section className="space-y-4 text-zinc-700">
      <PageHeader
        title="Activity Log"
        subtitle="Admin-only consolidated activity stream (audit + ticket activity logs)."
        actions={
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
          >
            Refresh
          </button>
        }
      />

      <FilterBar>
        <select
          value={source}
          onChange={(event) => {
            setSource(event.target.value as "all" | "audit" | "ticket");
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">All sources</option>
          <option value="audit">Audit logs</option>
          <option value="ticket">Ticket logs</option>
        </select>

        <select
          value={severity}
          onChange={(event) => {
            setSeverity(
              event.target.value as "all" | "info" | "warning" | "critical"
            );
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>

        <input
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          placeholder="Filter by action"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />

        <div className="ml-auto text-xs text-zinc-900">Total: {total}</div>
      </FilterBar>

      {loading ? (
        <InlineAlert tone="info" message="Loading activity logs..." />
      ) : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No activity logs found"
          description="Try broadening your filters."
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <EntityTable
            columns={columns}
            rows={items}
            rowKey={(item) => item.id}
            minWidthClassName="min-w-[1100px]"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-900">
              Page {page} / {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
