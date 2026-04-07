"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import FilterBar from "@/components/ui/FilterBar";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type NotificationItem = {
  _id?: string;
  type:
    | "ticket_update"
    | "schedule_update"
    | "approval_required"
    | "announcement"
    | "reminder";
  message: string;
  channel: "in_app" | "email";
  reference_type?: string | null;
  reference_id?: string | null;
  is_read: boolean;
  sent_at?: string | null;
  created_at?: string | null;
};

const notificationTypes = [
  "ticket_update",
  "schedule_update",
  "approval_required",
  "announcement",
  "reminder",
] as const;

function referenceToRoute(referenceType?: string | null): string | null {
  if (!referenceType) return null;
  if (referenceType === "ticket") return "/tickets";
  if (referenceType === "schedule") return "/schedules";
  if (referenceType === "document") return "/dashboard/reports";
  return null;
}

function dateGroupLabel(value?: string | null): string {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString();
}

export default function NotificationsClient() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [readFilter, setReadFilter] = useState<"all" | "read" | "unread">(
    "all"
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      query.set("limit", "12");
      query.set("page", String(page));
      if (typeFilter) query.set("type", typeFilter);
      if (readFilter !== "all")
        query.set("is_read", String(readFilter === "read"));

      const response = await fetch(`/api/notifications?${query.toString()}`);
      const payload = (await response.json()) as {
        notifications?: NotificationItem[];
        total?: number;
        total_pages?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load notifications.");
      }

      setItems(payload.notifications ?? []);
      setTotal(payload.total ?? 0);
      setTotalPages(payload.total_pages ?? 1);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load notifications.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, readFilter, typeFilter]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, NotificationItem[]>>((acc, item) => {
      const key = dateGroupLabel(item.created_at ?? item.sent_at ?? null);
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});
  }, [items]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Notifications"
        subtitle="Review updates from tickets, schedules, approvals, and announcements."
        actions={
          <button
            type="button"
            onClick={() => void loadNotifications()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Refresh
          </button>
        }
      />

      <FilterBar>
        <select
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          {notificationTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={readFilter}
          onChange={(event) => {
            setReadFilter(event.target.value as "all" | "read" | "unread");
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>

        <div className="ml-auto text-xs text-zinc-500">Total: {total}</div>
      </FilterBar>

      {loading ? (
        <InlineAlert tone="info" message="Loading notifications..." />
      ) : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No notifications found"
          description="You are all caught up for the current filters."
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, notifications]) => (
            <div
              key={group}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
                {group}
              </h3>
              <ul className="mt-3 space-y-2">
                {notifications.map((item, index) => {
                  const detailRoute = referenceToRoute(item.reference_type);
                  const key = `${item.reference_id ?? "none"}-${
                    item.type
                  }-${index}`;
                  return (
                    <li
                      key={key}
                      className={`rounded-md border p-3 ${
                        item.is_read
                          ? "border-zinc-200 bg-zinc-50"
                          : "border-sky-200 bg-sky-50/60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          label={item.type}
                          tone={item.is_read ? "muted" : "info"}
                        />
                        <StatusBadge label={item.channel} tone="default" />
                        {!item.is_read ? (
                          <span className="text-xs font-medium text-sky-700">
                            Unread
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-zinc-900">
                        {item.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-zinc-500">
                          {new Date(
                            item.created_at ?? item.sent_at ?? ""
                          ).toLocaleString()}
                        </p>
                        {detailRoute ? (
                          <Link
                            href={detailRoute}
                            className="text-xs font-medium text-zinc-700 underline hover:text-zinc-900"
                          >
                            Open related page
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

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
        </div>
      ) : null}
    </section>
  );
}
