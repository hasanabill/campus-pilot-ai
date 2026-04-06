"use client";

import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

const scheduleTypes = ["class", "exam"] as const;
const scheduleStatuses = ["draft", "published", "updated", "cancelled"] as const;
const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type ConflictWarning = {
  type: "room_conflict" | "faculty_conflict" | "time_conflict";
  conflicting_schedule_id: string;
  message: string;
};

export default function ScheduleEditorForm() {
  const [scheduleType, setScheduleType] = useState<(typeof scheduleTypes)[number]>("class");
  const [courseId, setCourseId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [day, setDay] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState<(typeof scheduleStatuses)[number]>("draft");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ConflictWarning[]>([]);
  const [attemptedOverride, setAttemptedOverride] = useState(false);

  async function submitSchedule(allowConflicts = false) {
    setLoading(true);
    setError(null);
    setMessage(null);
    if (!allowConflicts) {
      setWarnings([]);
      setAttemptedOverride(false);
    }

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_type: scheduleType,
          course_id: courseId,
          faculty_id: facultyId,
          room_id: roomId,
          day,
          date: date ? new Date(date).toISOString() : null,
          start_time: startTime,
          end_time: endTime,
          semester,
          section,
          status,
          allow_conflicts: allowConflicts,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        warnings?: ConflictWarning[];
      };
      if (response.status === 409) {
        setWarnings(payload.warnings ?? []);
        setError(payload.error ?? "Schedule conflicts detected.");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create schedule.");
      }

      setMessage("Schedule created successfully.");
      setCourseId("");
      setFacultyId("");
      setRoomId("");
      setDay("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setSemester("");
      setSection("");
      setStatus("draft");
      setWarnings([]);
      setAttemptedOverride(false);
    } catch (submitError) {
      const msg = submitError instanceof Error ? submitError.message : "Schedule creation failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitSchedule(false);
  }

  function warningTone(type: ConflictWarning["type"]): "warning" | "danger" | "info" {
    if (type === "faculty_conflict" || type === "room_conflict") return "danger";
    return "warning";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
      <PageHeader
        title="Schedule Editor (Admin)"
        subtitle="Create class/exam schedules, review conflict warnings, and override only when operationally required."
      />

      {message ? <InlineAlert tone="success" message={message} /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Schedule Type</span>
          <select
            value={scheduleType}
            onChange={(event) => setScheduleType(event.target.value as (typeof scheduleTypes)[number])}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {scheduleTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof scheduleStatuses)[number])}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {scheduleStatuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Course ID</span>
          <input value={courseId} onChange={(e) => setCourseId(e.target.value)} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Faculty ID</span>
          <input value={facultyId} onChange={(e) => setFacultyId(e.target.value)} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Room ID</span>
          <input value={roomId} onChange={(e) => setRoomId(e.target.value)} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Day</span>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Select day</option>
            {dayOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Date (optional)</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Start Time</span>
          <input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="10:00 AM" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">End Time</span>
          <input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="11:30 AM" required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Semester</span>
          <input value={semester} onChange={(e) => setSemester(e.target.value)} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Section</span>
          <input value={section} onChange={(e) => setSection(e.target.value)} required className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "Saving..." : "Create Schedule"}
      </button>

      {warnings.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">Conflict warnings detected</p>
          <p className="mt-1 text-xs text-amber-800">
            Review each warning before overriding. Conflicts can cause room and faculty collisions.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-amber-900">
            {warnings.map((warning, index) => (
              <li
                key={`${warning.conflicting_schedule_id}-${index}`}
                className="rounded border border-amber-200 bg-amber-100/70 p-2"
              >
                <div className="mb-1">
                  <StatusBadge label={warning.type} tone={warningTone(warning.type)} />
                </div>
                <p>{warning.message}</p>
                <p className="mt-1 text-xs text-amber-800">
                  Related schedule: {warning.conflicting_schedule_id}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAttemptedOverride(true);
                const confirmed = window.confirm(
                  "Create schedule with conflicts? This should be used only for urgent operational cases.",
                );
                if (confirmed) {
                  void submitSchedule(true);
                }
              }}
              className="rounded-md border border-amber-400 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
            >
              Create Anyway (Allow Conflicts)
            </button>
            <span className="text-xs text-amber-900">
              Recommended: adjust day/time/room/faculty and submit again.
            </span>
          </div>
          {attemptedOverride ? (
            <p className="mt-2 text-xs text-amber-900">
              Override attempt recorded in UI flow. Confirm only when necessary.
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
