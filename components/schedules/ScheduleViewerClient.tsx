"use client";

import { useCallback, useEffect, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import EntityTable from "@/components/ui/EntityTable";
import FilterBar from "@/components/ui/FilterBar";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";
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

export default function ScheduleViewerClient() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [semester, setSemester] = useState("");
  const [day, setDay] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (semester) query.set("semester", semester);
    if (day) query.set("day", day);
    query.set("limit", "10");
    query.set("page", String(page));

    try {
      const response = await fetch(`/api/schedules?${query.toString()}`);
      const payload = (await response.json()) as {
        schedules?: ScheduleItem[];
        total?: number;
        total_pages?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load schedules.");
      }

      setSchedules(payload.schedules ?? []);
      setTotalItems(payload.total ?? 0);
      setTotalPages(payload.total_pages ?? 1);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load schedules.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [day, page, semester]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const columns = [
    { key: "type", label: "Type", render: (item: ScheduleItem) => item.schedule_type },
    { key: "day", label: "Day", render: (item: ScheduleItem) => item.day },
    {
      key: "date",
      label: "Date",
      render: (item: ScheduleItem) => (item.date ? new Date(item.date).toLocaleDateString() : "-"),
    },
    {
      key: "time",
      label: "Time",
      render: (item: ScheduleItem) => `${item.start_time} - ${item.end_time}`,
    },
    { key: "semester", label: "Semester", render: (item: ScheduleItem) => item.semester },
    { key: "section", label: "Section", render: (item: ScheduleItem) => item.section },
    { key: "status", label: "Status", render: (item: ScheduleItem) => <StatusBadge label={item.status} /> },
  ];

  return (
    <section className="space-y-4">
      <PageHeader title="Schedule Viewer" subtitle="View and filter schedule records." />

      <FilterBar>
        <input
          value={semester}
          onChange={(event) => {
            setSemester(event.target.value);
            setPage(1);
          }}
          placeholder="Filter by semester"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />
        <input
          value={day}
          onChange={(event) => {
            setDay(event.target.value);
            setPage(1);
          }}
          placeholder="Filter by day"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => void loadSchedules()}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
        >
          Refresh
        </button>
        <div className="ml-auto text-xs text-zinc-500">Total: {totalItems}</div>
      </FilterBar>

      {loading ? <InlineAlert tone="info" message="Loading schedules..." /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}
      {!loading && schedules.length === 0 ? (
        <EmptyState title="No schedules found" description="Try adjusting filters." />
      ) : null}

      {!loading && schedules.length > 0 ? (
        <>
          <EntityTable columns={columns} rows={schedules} rowKey={(item) => item._id} />
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
