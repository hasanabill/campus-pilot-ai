"use client";

import { useCallback, useEffect, useState } from "react";

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

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (semester) query.set("semester", semester);
    if (day) query.set("day", day);

    try {
      const response = await fetch(`/api/schedules?${query.toString()}`);
      const payload = (await response.json()) as {
        schedules?: ScheduleItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load schedules.");
      }

      setSchedules(payload.schedules ?? []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load schedules.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [day, semester]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-xl font-semibold text-zinc-900">Schedule Viewer</h2>
        <input
          value={semester}
          onChange={(event) => setSemester(event.target.value)}
          placeholder="Filter by semester"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />
        <input
          value={day}
          onChange={(event) => setDay(event.target.value)}
          placeholder="Filter by day"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => void loadSchedules()}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="text-sm text-zinc-600">Loading schedules...</p> : null}
      {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
      {!loading && schedules.length === 0 ? (
        <p className="text-sm text-zinc-600">No schedules found.</p>
      ) : null}

      {!loading && schedules.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-600">
                <th className="py-2">Type</th>
                <th className="py-2">Day</th>
                <th className="py-2">Date</th>
                <th className="py-2">Time</th>
                <th className="py-2">Semester</th>
                <th className="py-2">Section</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((item) => (
                <tr key={item._id} className="border-b border-zinc-100">
                  <td className="py-2">{item.schedule_type}</td>
                  <td className="py-2">{item.day}</td>
                  <td className="py-2">{item.date ? new Date(item.date).toLocaleDateString() : "-"}</td>
                  <td className="py-2">{item.start_time} - {item.end_time}</td>
                  <td className="py-2">{item.semester}</td>
                  <td className="py-2">{item.section}</td>
                  <td className="py-2">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
