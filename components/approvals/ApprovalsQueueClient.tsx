"use client";

import { useCallback, useEffect, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import EntityTable from "@/components/ui/EntityTable";
import FilterBar from "@/components/ui/FilterBar";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type ApprovalQueueItem = {
  _id?: string;
  message: string;
  reference_id?: string | null;
  created_at?: string | null;
  is_read: boolean;
};

export default function ApprovalsQueueClient() {
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("type", "approval_required");
      query.set("limit", "10");
      query.set("page", String(page));

      const response = await fetch(`/api/notifications?${query.toString()}`);
      const payload = (await response.json()) as {
        notifications?: ApprovalQueueItem[];
        total?: number;
        total_pages?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load approval queue.");
      }

      const list = payload.notifications ?? [];
      setItems(list);
      setTotal(payload.total ?? 0);
      setTotalPages(payload.total_pages ?? 1);
      setSelectedId(list[0]?._id ?? null);
    } catch (loadError) {
      const text = loadError instanceof Error ? loadError.message : "Failed to load approval queue.";
      setError(text);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  const selected = items.find((item) => item._id === selectedId) ?? null;

  const columns = [
    {
      key: "status",
      label: "Status",
      render: (item: ApprovalQueueItem) => (
        <StatusBadge label={item.is_read ? "reviewed" : "pending"} tone={item.is_read ? "muted" : "warning"} />
      ),
    },
    {
      key: "message",
      label: "Approval Item",
      render: (item: ApprovalQueueItem) => (
        <button
          type="button"
          onClick={() => setSelectedId(item._id ?? null)}
          className="text-left text-sm text-zinc-900 underline-offset-2 hover:underline"
        >
          {item.message}
        </button>
      ),
    },
    {
      key: "created",
      label: "Created",
      render: (item: ApprovalQueueItem) =>
        item.created_at ? new Date(item.created_at).toLocaleString() : "-",
    },
  ];

  return (
    <section className="space-y-4">
      <PageHeader
        title="Approvals Queue"
        subtitle="Registrar/admin approval workspace. Queue actions are scaffolded while dedicated approval mutation APIs are pending."
        actions={
          <button
            type="button"
            onClick={() => void loadApprovals()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
          >
            Refresh
          </button>
        }
      />

      <FilterBar>
        <div className="text-xs text-zinc-600">
          Source: approval-required notifications (`/api/notifications?type=approval_required`)
        </div>
        <div className="ml-auto text-xs text-zinc-500">Total: {total}</div>
      </FilterBar>

      {loading ? <InlineAlert tone="info" message="Loading approval queue..." /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}
      {message ? <InlineAlert tone="warning" message={message} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No approval items found"
          description="Approval-required items will appear here when generated."
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <EntityTable columns={columns} rows={items} rowKey={(item) => item._id ?? item.message} />

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">Item Details</h3>
            {selected ? (
              <div className="mt-3 space-y-2 text-sm text-zinc-700">
                <p>{selected.message}</p>
                <p>
                  <span className="font-medium text-zinc-900">Reference ID:</span>{" "}
                  {selected.reference_id ?? "-"}
                </p>
                <p>
                  <span className="font-medium text-zinc-900">Created:</span>{" "}
                  {selected.created_at ? new Date(selected.created_at).toLocaleString() : "-"}
                </p>
                <div className="pt-1">
                  <StatusBadge
                    label={selected.is_read ? "reviewed" : "pending"}
                    tone={selected.is_read ? "muted" : "warning"}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMessage(
                        "Approve action is scaffolded. Connect dedicated approvals mutation API to activate.",
                      )
                    }
                    className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMessage(
                        "Reject action is scaffolded. Connect dedicated approvals mutation API to activate.",
                      )
                    }
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">Select an item from the queue to view details.</p>
            )}
          </div>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
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
      ) : null}
    </section>
  );
}
