"use client";

import { useCallback, useEffect, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import InlineAlert from "@/components/ui/InlineAlert";
import StatusBadge from "@/components/ui/StatusBadge";
import FilterBar from "@/components/ui/FilterBar";

type Schedule = {
  _id: string;
  schedule_type: string;
  course?: { name: string; code: string } | null;
  faculty?: { employee_id: string; designation: string; name: string } | null;
  room?: { room_code: string; building: string } | null;
  day: string;
  date?: string | null;
  start_time: string;
  end_time: string;
  semester: string;
  section: string;
  status: "draft" | "published" | "updated" | "cancelled";
};

export default function ScheduleManagerClient() {
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ limit: "20" });
      if (section.trim()) q.set("section", section.trim());
      const res = await fetch(`/api/schedules?${q}`);
      const payload = (await res.json()) as {
        schedules?: Schedule[];
        error?: string;
      };
      if (!res.ok)
        throw new Error(payload.error ?? "Failed to load schedules.");
      setItems(payload.schedules ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load schedules."
      );
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: Schedule["status"]) {
    setMessage(null);
    setError(null);
    setBusyIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reason: status === "cancelled" ? "emergency" : "conflict_fix",
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Schedule update failed.");
      setMessage("Schedule updated and change log recorded.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schedule update failed.");
    } finally {
      setBusyIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this schedule? This cannot be undone.")) return;
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok)
        throw new Error(payload.error ?? "Schedule deletion failed.");
      setMessage("Schedule deleted.");
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Schedule deletion failed."
      );
    }
  }

  return (
    <section className="cp-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="cp-section-title">Existing schedules</p>
          <p className="text-xs text-zinc-500">
            Update status, cancel, or delete schedule records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="cp-btn-secondary text-xs"
        >
          Refresh
        </button>
      </div>
      {message ? <InlineAlert tone="success" message={message} /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}
      {loading ? (
        <InlineAlert tone="info" message="Loading schedules..." />
      ) : null}
      <FilterBar>
        <input
          value={section}
          onChange={(e) => setSection(e.target.value)}
          placeholder="Filter by section…"
          className="cp-input w-36"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="cp-btn-secondary text-xs"
        >
          Apply
        </button>
        {section.trim() ? (
          <button
            type="button"
            onClick={() => {
              setSection("");
              void load();
            }}
            className="cp-btn-ghost text-xs text-zinc-400"
          >
            × Clear
          </button>
        ) : null}
      </FilterBar>
      {!loading && items.length === 0 ? (
        <EmptyState
          title="No schedules"
          description="Create schedules above to manage them here."
        />
      ) : null}
      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item._id}
            className="cp-card-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-zinc-900">
                  {item.schedule_type} · {item.day}
                </p>
                <StatusBadge
                  label={item.status}
                  tone={item.status === "cancelled" ? "danger" : "info"}
                />
              </div>
              <p className="mt-1 text-sm text-zinc-700">
                {item.course
                  ? `${item.course.code} - ${item.course.name}`
                  : "—"}
                {" · "}
                {item.room
                  ? `${item.room.room_code} - ${item.room.building}`
                  : "—"}
                {" · "}
                {item.faculty
                  ? `${item.faculty.name} (${item.faculty.employee_id})`
                  : "—"}
              </p>
              <p className="mt-1 text-sm text-zinc-700">
                {item.start_time} - {item.end_time} · {item.semester} · Section{" "}
                {item.section}
              </p>
              <p className="mt-1 font-mono text-xs text-zinc-500">{item._id}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void updateStatus(item._id, "published")}
                disabled={busyIds[item._id] || item.status === "published"}
                className="cp-btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busyIds[item._id]
                  ? "Publishing..."
                  : item.status === "published"
                  ? "Published"
                  : "Publish"}
              </button>
              <button
                type="button"
                onClick={() => void updateStatus(item._id, "cancelled")}
                disabled={busyIds[item._id] || item.status === "cancelled"}
                className="cp-btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void remove(item._id)}
                disabled={busyIds[item._id]}
                className="cp-btn border border-red-200 bg-red-50 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
