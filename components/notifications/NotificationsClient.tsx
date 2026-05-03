"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import EmptyState  from "@/components/ui/EmptyState";
import FilterBar   from "@/components/ui/FilterBar";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader  from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type NotificationItem = {
  _id?: string;
  type: "ticket_update" | "schedule_update" | "approval_required" | "announcement" | "reminder";
  message: string;
  channel: "in_app" | "email";
  reference_type?: string | null;
  reference_id?: string | null;
  is_read: boolean;
  sent_at?: string | null;
  created_at?: string | null;
};

const notifTypes = ["ticket_update", "schedule_update", "approval_required", "announcement", "reminder"] as const;

function dateLabel(v?: string | null): string {
  if (!v) return "Unknown date";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "Unknown date" : d.toLocaleDateString();
}

export default function NotificationsClient() {
  const [items,      setItems]      = useState<NotificationItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [readFilter, setReadFilter] = useState<"all" | "read" | "unread">("all");
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ limit: "12", page: String(page) });
      if (typeFilter) q.set("type", typeFilter);
      if (readFilter !== "all") q.set("is_read", String(readFilter === "read"));

      const res     = await fetch(`/api/notifications?${q}`);
      const payload = (await res.json()) as { notifications?: NotificationItem[]; total?: number; total_pages?: number; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load notifications.");
      setItems(payload.notifications ?? []);
      setTotal(payload.total ?? 0);
      setTotalPages(payload.total_pages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [page, readFilter, typeFilter]);

  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() =>
    items.reduce<Record<string, NotificationItem[]>>((acc, item) => {
      const key = dateLabel(item.created_at ?? item.sent_at ?? null);
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {}),
  [items]);

  return (
    <section className="max-w-4xl mx-auto space-y-5">
      <PageHeader
        title="Notifications"
        subtitle="Updates from tickets, schedules, approvals, and announcements."
        actions={
          <button type="button" onClick={() => void load()} className="cp-btn-secondary text-xs">
            Refresh
          </button>
        }
      />

      <FilterBar>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="cp-select w-auto">
          <option value="">All types</option>
          {notifTypes.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
        </select>
        <select value={readFilter} onChange={(e) => { setReadFilter(e.target.value as typeof readFilter); setPage(1); }} className="cp-select w-auto">
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
        <span className="ml-auto text-xs text-zinc-400">{total} total</span>
      </FilterBar>

      {loading ? <InlineAlert tone="info" message="Loading notifications…" /> : null}
      {error   ? <InlineAlert tone="error" message={error} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title="No notifications" description="You are all caught up for the selected filters." />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, notifications]) => (
            <div key={group} className="cp-card space-y-2">
              <p className="cp-section-title">{group}</p>
              {notifications.map((item, i) => (
                <div
                  key={`${item.reference_id ?? "none"}-${item.type}-${i}`}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${item.is_read ? "border-zinc-100 bg-zinc-50" : "border-sky-100 bg-sky-50/60"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <StatusBadge label={item.type}    tone={item.is_read ? "muted" : "info"} />
                      <StatusBadge label={item.channel} tone="default" />
                      {!item.is_read ? <span className="text-[10px] font-semibold text-sky-600 uppercase tracking-wide">Unread</span> : null}
                    </div>
                    <p className="text-sm text-zinc-900">{item.message}</p>
                    <p className="mt-1 text-xs text-zinc-400">{new Date(item.created_at ?? item.sent_at ?? "").toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="flex items-center justify-end gap-2">
            <button type="button" disabled={page <= 1}          onClick={() => setPage((p) => p - 1)} className="cp-btn-secondary text-xs disabled:opacity-40">← Prev</button>
            <span className="text-xs text-zinc-400">{page} / {Math.max(1, totalPages)}</span>
            <button type="button" disabled={page >= totalPages}  onClick={() => setPage((p) => p + 1)} className="cp-btn-secondary text-xs disabled:opacity-40">Next →</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
