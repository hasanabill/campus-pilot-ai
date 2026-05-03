"use client";

import { useCallback, useEffect, useState } from "react";

import EmptyState  from "@/components/ui/EmptyState";
import EntityTable from "@/components/ui/EntityTable";
import FilterBar   from "@/components/ui/FilterBar";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader  from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type ScheduleItem = {
  _id: string;
  schedule_type: "class" | "exam";
  day: string;
  date?: string | null;
  start_time: string;
  end_time: string;
  semester: string;
  section: string;
  status: string;
};

type AppRole = "student" | "faculty" | "admin" | "registrar";

const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ScheduleViewerClient({ role }: { role?: AppRole }) {
  const [schedules,   setSchedules]   = useState<ScheduleItem[]>([]);
  const [semester,    setSemester]    = useState("");
  const [day,         setDay]         = useState("");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalItems,  setTotalItems]  = useState(0);

  const isStudent = role === "student";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({ limit: "10", page: String(page) });
    if (semester) q.set("semester", semester);
    if (day)      q.set("day", day);
    try {
      const res     = await fetch(`/api/schedules?${q}`);
      const payload = (await res.json()) as { schedules?: ScheduleItem[]; total?: number; total_pages?: number; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load schedules.");
      setSchedules(payload.schedules ?? []);
      setTotalItems(payload.total ?? 0);
      setTotalPages(payload.total_pages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedules.");
    } finally {
      setLoading(false);
    }
  }, [day, page, semester]);

  useEffect(() => { void load(); }, [load]);

  const columns = [
    { key: "type",     label: "Type",     render: (s: ScheduleItem) => <StatusBadge label={s.schedule_type} tone="default" /> },
    { key: "day",      label: "Day",      render: (s: ScheduleItem) => s.day },
    { key: "date",     label: "Date",     render: (s: ScheduleItem) => s.date ? new Date(s.date).toLocaleDateString() : <span className="text-zinc-400">—</span> },
    { key: "time",     label: "Time",     render: (s: ScheduleItem) => `${s.start_time} – ${s.end_time}` },
    { key: "semester", label: "Semester", render: (s: ScheduleItem) => s.semester },
    { key: "section",  label: "Section",  render: (s: ScheduleItem) => s.section },
    { key: "status",   label: "Status",   render: (s: ScheduleItem) => <StatusBadge label={s.status} /> },
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        title="Schedule Viewer"
        subtitle={isStudent
          ? "Browse your class and exam schedule. Filter by day or semester."
          : "View and filter published schedule records."}
      />

      <FilterBar>
        <input
          value={semester}
          onChange={(e) => { setSemester(e.target.value); setPage(1); }}
          placeholder="Filter by semester…"
          className="cp-input w-44"
        />
        <select
          value={day}
          onChange={(e) => { setDay(e.target.value); setPage(1); }}
          className="cp-select w-auto"
        >
          <option value="">All days</option>
          {dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button type="button" onClick={() => void load()} className="cp-btn-secondary text-xs">Refresh</button>
        {(semester || day) ? (
          <button type="button" onClick={() => { setSemester(""); setDay(""); setPage(1); }} className="cp-btn-ghost text-xs text-zinc-400">
            × Clear filters
          </button>
        ) : null}
        <span className="ml-auto text-xs text-zinc-400">{schedules.length} of {totalItems}</span>
      </FilterBar>

      {loading ? <InlineAlert tone="info"  message="Loading schedules…" /> : null}
      {error   ? <InlineAlert tone="error" message={error} /> : null}

      {!loading && schedules.length === 0 ? (
        <EmptyState
          title="No schedules found"
          description={isStudent
            ? "No matching schedule rows for your filters. Try another day or semester."
            : "Try adjusting filters."}
        />
      ) : null}

      {!loading && schedules.length > 0 ? (
        <>
          <EntityTable columns={columns} rows={schedules} rowKey={(s) => s._id} />
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
