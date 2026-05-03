"use client";

import { useCallback, useEffect, useState } from "react";

import EmptyState  from "@/components/ui/EmptyState";
import FilterBar   from "@/components/ui/FilterBar";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader  from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type ApprovalItem = {
  _id?: string;
  entity_type: "ticket" | "generated_document" | "schedule_change";
  entity_id: string;
  stage: string;
  decision: "pending" | "approved" | "rejected";
  comments?: string | null;
  created_at?: string | null;
};

export default function ApprovalsQueueClient() {
  const [items,      setItems]      = useState<ApprovalItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [notice,     setNotice]     = useState<string | null>(null);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const q   = new URLSearchParams({ decision: "pending", limit: "10", page: String(page) });
      const res = await fetch(`/api/approvals?${q}`);
      const payload = (await res.json()) as { approvals?: ApprovalItem[]; total?: number; total_pages?: number; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load approvals.");
      const list = payload.approvals ?? [];
      setItems(list);
      setTotal(payload.total ?? 0);
      setTotalPages(payload.total_pages ?? 1);
      setSelectedId(list[0]?._id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  async function decideSelected(decision: "approved" | "rejected") {
    if (!selected?._id) return;
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/approvals/${selected._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comments: `${decision} from approvals queue` }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Approval update failed.");
      setNotice(`Approval ${decision}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval update failed.");
    }
  }

  useEffect(() => { void load(); }, [load]);

  const selected = items.find((i) => i._id === selectedId) ?? null;

  return (
    <section className="space-y-5">
      <PageHeader
        title="Approvals Queue"
        subtitle="Review and action approval-required items as they arrive."
        actions={<button type="button" onClick={() => void load()} className="cp-btn-secondary text-xs">Refresh</button>}
      />

      <FilterBar>
        <span className="text-xs text-zinc-400">Source: real Approval records</span>
        <span className="ml-auto text-xs text-zinc-400">{total} pending</span>
      </FilterBar>

      {loading ? <InlineAlert tone="info"    message="Loading approval queue…" /> : null}
      {error   ? <InlineAlert tone="error"   message={error} /> : null}
      {notice  ? <InlineAlert tone="success" message={notice} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No approval items"
          description="Approval-required documents and requests will appear here."
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* List */}
          <div className="cp-card p-0 overflow-hidden">
            <ul className="divide-y divide-zinc-100">
              {items.map((item) => {
                const active = item._id === selectedId;
                return (
                  <li key={item._id ?? item.entity_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item._id ?? null)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition ${active ? "bg-zinc-50" : "hover:bg-zinc-50/60"}`}
                    >
                      <StatusBadge label={item.decision} tone="warning" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {item.entity_type.replaceAll("_", " ")} · {item.stage.replaceAll("_", " ")}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-4 py-3">
              <button type="button" disabled={page <= 1}          onClick={() => setPage((p) => p - 1)} className="cp-btn-secondary text-xs disabled:opacity-40">← Prev</button>
              <span className="text-xs text-zinc-400">{page} / {Math.max(1, totalPages)}</span>
              <button type="button" disabled={page >= totalPages}  onClick={() => setPage((p) => p + 1)} className="cp-btn-secondary text-xs disabled:opacity-40">Next →</button>
            </div>
          </div>

          {/* Detail panel */}
          <div className="cp-card space-y-4 self-start">
            <p className="cp-section-title">Item details</p>
            {selected ? (
              <>
                <p className="text-sm text-zinc-900">
                  Review {selected.entity_type.replaceAll("_", " ")} at stage {selected.stage.replaceAll("_", " ")}.
                </p>
                <div className="grid gap-2">
                  <div className="cp-card-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Reference ID</p>
                    <p className="mt-0.5 text-sm font-mono text-zinc-700">{selected.entity_id ?? "—"}</p>
                  </div>
                  <div className="cp-card-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Created</p>
                    <p className="mt-0.5 text-sm text-zinc-700">{selected.created_at ? new Date(selected.created_at).toLocaleString() : "—"}</p>
                  </div>
                </div>
                <StatusBadge label={selected.decision} tone="warning" />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void decideSelected("approved")}
                    className="cp-btn flex-1 border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs py-2"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void decideSelected("rejected")}
                    className="cp-btn flex-1 border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 text-xs py-2"
                  >
                    Reject
                  </button>
                </div>
              </>
            ) : (
              <EmptyState title="No item selected" description="Select an item from the queue." />
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
