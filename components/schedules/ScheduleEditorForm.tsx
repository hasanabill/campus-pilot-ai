"use client";

import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader  from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

const scheduleTypes    = ["class", "exam"] as const;
const scheduleStatuses = ["draft", "published", "updated", "cancelled"] as const;
const dayOptions       = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type ConflictWarning = {
  type: "room_conflict" | "faculty_conflict" | "time_conflict";
  conflicting_schedule_id: string;
  message: string;
};

function warningTone(type: ConflictWarning["type"]): "danger" | "warning" {
  return type === "faculty_conflict" || type === "room_conflict" ? "danger" : "warning";
}

export default function ScheduleEditorForm() {
  const [scheduleType, setScheduleType] = useState<(typeof scheduleTypes)[number]>("class");
  const [courseId,     setCourseId]     = useState("");
  const [facultyId,    setFacultyId]    = useState("");
  const [roomId,       setRoomId]       = useState("");
  const [day,          setDay]          = useState("");
  const [date,         setDate]         = useState("");
  const [startTime,    setStartTime]    = useState("");
  const [endTime,      setEndTime]      = useState("");
  const [semester,     setSemester]     = useState("");
  const [section,      setSection]      = useState("");
  const [status,       setStatus]       = useState<(typeof scheduleStatuses)[number]>("draft");
  const [loading,      setLoading]      = useState(false);
  const [message,      setMessage]      = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [warnings,     setWarnings]     = useState<ConflictWarning[]>([]);
  const [attemptedOverride, setAttemptedOverride] = useState(false);

  async function submit(allowConflicts = false) {
    setLoading(true); setError(null); setMessage(null);
    if (!allowConflicts) { setWarnings([]); setAttemptedOverride(false); }

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_type: scheduleType, course_id: courseId, faculty_id: facultyId,
          room_id: roomId, day, date: date ? new Date(date).toISOString() : null,
          start_time: startTime, end_time: endTime, semester, section, status,
          allow_conflicts: allowConflicts,
        }),
      });

      const payload = (await res.json()) as { error?: string; warnings?: ConflictWarning[] };

      if (res.status === 409) {
        setWarnings(payload.warnings ?? []);
        setError(payload.error ?? "Schedule conflicts detected.");
        return;
      }
      if (!res.ok) throw new Error(payload.error ?? "Failed to create schedule.");

      setMessage("Schedule created successfully.");
      setCourseId(""); setFacultyId(""); setRoomId(""); setDay(""); setDate("");
      setStartTime(""); setEndTime(""); setSemester(""); setSection(""); setStatus("draft");
      setWarnings([]); setAttemptedOverride(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schedule creation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cp-card space-y-5">
      <PageHeader
        title="Schedule Editor"
        subtitle="Create class/exam schedules, review conflict warnings, and override only when operationally required."
      />

      {message ? <InlineAlert tone="success" message={message} /> : null}
      {error   ? <InlineAlert tone="error"   message={error}   /> : null}

      <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); void submit(false); }} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sched-type" className="cp-label">Schedule type</label>
            <select id="sched-type" value={scheduleType} onChange={(e) => setScheduleType(e.target.value as typeof scheduleType)} className="cp-select">
              {scheduleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="sched-status" className="cp-label">Status</label>
            <select id="sched-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="cp-select">
              {scheduleStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="sched-course" className="cp-label">Course ID</label>
            <input id="sched-course" required value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="course_xxxx" className="cp-input" />
          </div>

          <div>
            <label htmlFor="sched-faculty" className="cp-label">Faculty ID</label>
            <input id="sched-faculty" required value={facultyId} onChange={(e) => setFacultyId(e.target.value)} placeholder="faculty_xxxx" className="cp-input" />
          </div>

          <div>
            <label htmlFor="sched-room" className="cp-label">Room ID</label>
            <input id="sched-room" required value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="room_xxxx" className="cp-input" />
          </div>

          <div>
            <label htmlFor="sched-day" className="cp-label">Day</label>
            <select id="sched-day" required value={day} onChange={(e) => setDay(e.target.value)} className="cp-select">
              <option value="">Select day</option>
              {dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="sched-date" className="cp-label">Date <span className="font-normal text-zinc-400">(optional)</span></label>
            <input id="sched-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="cp-input" />
          </div>

          <div className="sm:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sched-start" className="cp-label">Start time</label>
              <input id="sched-start" required value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="10:00 AM" className="cp-input" />
            </div>
            <div>
              <label htmlFor="sched-end" className="cp-label">End time</label>
              <input id="sched-end" required value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="11:30 AM" className="cp-input" />
            </div>
          </div>

          <div>
            <label htmlFor="sched-sem" className="cp-label">Semester</label>
            <input id="sched-sem" required value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="Spring 2026" className="cp-input" />
          </div>

          <div>
            <label htmlFor="sched-sec" className="cp-label">Section</label>
            <input id="sched-sec" required value={section} onChange={(e) => setSection(e.target.value)} placeholder="A, B, C…" className="cp-input" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="cp-btn-primary w-full py-2.5">
          {loading ? "Saving…" : "Create Schedule"}
        </button>
      </form>

      {warnings.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-amber-900">Conflict warnings detected</p>
            <p className="text-xs text-amber-700 mt-0.5">Review each warning before overriding — conflicts can cause room and faculty collisions.</p>
          </div>
          <ul className="space-y-2">
            {warnings.map((w, i) => (
              <li key={`${w.conflicting_schedule_id}-${i}`} className="rounded-lg border border-amber-200 bg-white p-3 space-y-1.5">
                <StatusBadge label={w.type} tone={warningTone(w.type)} />
                <p className="text-sm text-zinc-900">{w.message}</p>
                <p className="text-xs text-zinc-400 font-mono">Related: {w.conflicting_schedule_id}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setAttemptedOverride(true);
                if (window.confirm("Create schedule with conflicts? Only use for urgent operational cases.")) void submit(true);
              }}
              className="cp-btn px-3 py-1.5 text-xs border border-amber-400 bg-white text-amber-800 hover:bg-amber-50"
            >
              Create Anyway (Override Conflicts)
            </button>
            <span className="text-xs text-amber-700">Recommended: adjust time/room/faculty and resubmit.</span>
          </div>
          {attemptedOverride ? (
            <p className="text-xs text-amber-700">Override attempt noted. Confirm only when necessary.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
