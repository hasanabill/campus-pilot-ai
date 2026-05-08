"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";

type CourseListItem = {
  _id: string;
  code?: string;
  name?: string;
  credits?: number;
  department_id?: string;
};

type ProposalSlot = {
  course_id: string;
  course_code?: string;
  course_name?: string;
  faculty_id: string;
  faculty_name?: string;
  faculty_employee_id?: string;
  room_id: string;
  room_code?: string;
  room_building?: string;
  day: string;
  start_time: string;
  end_time: string;
  semester: string;
  section: string;
  schedule_type: string;
  score: number;
  soft_notes: string[];
};

type ProposeResponse = {
  semester: string;
  section: string;
  proposal: ProposalSlot[];
  violations: string[];
  soft_warnings: string[];
  score: number;
};

export default function TimetablePlannerClient() {
  const [semester, setSemester] = useState("Fall 2025");
  const [section, setSection] = useState("A");
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [minCapacity, setMinCapacity] = useState(30);
  const [classesPerCoursePerWeek, setClassesPerCoursePerWeek] = useState(2);
  const [randomizeRooms, setRandomizeRooms] = useState(true);
  const [randomSeed, setRandomSeed] = useState("");
  const [preferencesJson, setPreferencesJson] = useState(
    '{\n  "preferred_days": ["Saturday", "Monday", "Tuesday"],\n  "time_windows": [{ "start": "09:00", "end": "15:00" }],\n  "room_type": "classroom"\n}'
  );

  const [proposal, setProposal] = useState<ProposeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingPropose, setLoadingPropose] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      setCoursesLoading(true);
      setCoursesError(null);
      try {
        const all: CourseListItem[] = [];
        const seen = new Set<string>();
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages && all.length < 1000) {
          const res = await fetch(
            `/api/master-data/courses?limit=100&page=${page}`,
            {
              method: "GET",
            }
          );
          const payload = (await res.json()) as
            | { items: CourseListItem[]; total_pages?: number }
            | { error?: string };

          if (!res.ok || !("items" in payload)) {
            throw new Error(
              "error" in payload && payload.error
                ? payload.error
                : "Failed to load courses."
            );
          }

          for (const item of payload.items ?? []) {
            if (!item?._id) continue;
            if (seen.has(item._id)) continue;
            seen.add(item._id);
            all.push(item);
          }

          totalPages = payload.total_pages ?? totalPages;
          page += 1;
        }

        const sorted = all.sort((a, b) => {
          const aKey = `${(a.code ?? "").toUpperCase()} ${(
            a.name ?? ""
          ).toUpperCase()}`.trim();
          const bKey = `${(b.code ?? "").toUpperCase()} ${(
            b.name ?? ""
          ).toUpperCase()}`.trim();
          return aKey.localeCompare(bKey);
        });

        if (active) setCourses(sorted);
      } catch (err) {
        if (active)
          setCoursesError(
            err instanceof Error ? err.message : "Failed to load courses."
          );
      } finally {
        if (active) setCoursesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((course) => {
      const haystack = `${course.code ?? ""} ${
        course.name ?? ""
      }`.toLowerCase();
      return haystack.includes(q);
    });
  }, [courseSearch, courses]);

  const selectedCoursesLabel = useMemo(() => {
    const idToCourse = new Map(courses.map((c) => [c._id, c]));
    return selectedCourseIds
      .map((id) => {
        const c = idToCourse.get(id);
        return c ? `${c.code ?? id} ${c.name ? `— ${c.name}` : ""}`.trim() : id;
      })
      .slice(0, 8);
  }, [courses, selectedCourseIds]);

  async function runPropose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoadingPropose(true);
    try {
      const ids = selectedCourseIds;
      if (ids.length === 0) {
        throw new Error("Select at least one course.");
      }
      let preferences: unknown = undefined;
      if (preferencesJson.trim()) {
        try {
          preferences = JSON.parse(preferencesJson) as unknown;
        } catch {
          throw new Error("Preferences must be valid JSON.");
        }
      }
      const res = await fetch("/api/timetable/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semester,
          section,
          course_ids: ids,
          min_room_capacity: minCapacity,
          preferences,
          randomize_rooms: randomizeRooms,
          randomize_seed: randomSeed.trim() ? randomSeed.trim() : undefined,
          classes_per_course_per_week: classesPerCoursePerWeek,
        }),
      });
      const payload = (await res.json()) as
        | ProposeResponse
        | { error?: string };
      if (!res.ok || !("proposal" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Proposal failed."
        );
      }
      setProposal(payload);
      setNotice(
        `Generated proposal with ${
          payload.proposal.length
        } slots (score ${payload.score.toFixed(2)}).`
      );
    } catch (err) {
      setProposal(null);
      setError(err instanceof Error ? err.message : "Proposal failed.");
    } finally {
      setLoadingPropose(false);
    }
  }

  async function runApply() {
    if (!proposal || proposal.proposal.length === 0) return;
    setLoadingApply(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/timetable/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semester: proposal.semester,
          section: proposal.section,
          slots: proposal.proposal.map((slot) => ({
            course_id: slot.course_id,
            faculty_id: slot.faculty_id,
            room_id: slot.room_id,
            day: slot.day,
            start_time: slot.start_time,
            end_time: slot.end_time,
            schedule_type: slot.schedule_type,
          })),
        }),
      });
      const payload = (await res.json()) as {
        created_count?: number;
        schedule_ids?: string[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error ?? "Apply failed.");
      }
      setNotice(
        `Created ${
          payload.created_count ?? 0
        } draft schedule record(s). IDs: ${(payload.schedule_ids ?? [])
          .slice(0, 5)
          .join(", ")}${(payload.schedule_ids?.length ?? 0) > 5 ? "…" : ""}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed.");
    } finally {
      setLoadingApply(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable planner"
        subtitle="Generate a deterministic proposal from courses, rooms, faculty, and preferences. Apply as draft schedules."
      />

      <form onSubmit={runPropose} className="cp-card space-y-4 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-900">
            Semester
            <input
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-900">
            Section
            <input
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-zinc-900">Courses</p>
              <p className="text-xs text-zinc-600">
                Select courses for this semester/section proposal.
                {selectedCourseIds.length > 0
                  ? ` Selected: ${selectedCourseIds.length}.`
                  : ""}
              </p>
            </div>
            {selectedCourseIds.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedCourseIds([])}
                className="cp-btn-secondary text-xs"
              >
                Clear selection
              </button>
            ) : null}
          </div>

          {coursesError ? (
            <InlineAlert tone="error" message={coursesError} />
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-zinc-900">
              Search courses
              <input
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Type course code or name…"
              />
            </label>
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700">
              {selectedCourseIds.length === 0 ? (
                <span className="text-zinc-500">No courses selected yet.</span>
              ) : (
                <div className="space-y-1">
                  {selectedCoursesLabel.map((label) => (
                    <div key={label} className="truncate">
                      {label}
                    </div>
                  ))}
                  {selectedCourseIds.length > selectedCoursesLabel.length ? (
                    <div className="text-zinc-500">
                      +{selectedCourseIds.length - selectedCoursesLabel.length}{" "}
                      more
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="max-h-[260px] overflow-auto rounded-lg border border-zinc-200 bg-white">
            {coursesLoading ? (
              <div className="p-3 text-sm text-zinc-600">Loading courses…</div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-3 text-sm text-zinc-600">
                No courses matched your search.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {filteredCourses.map((course) => {
                  const checked = selectedCourseIds.includes(course._id);
                  const label = `${course.code ?? course._id} ${
                    course.name ? `— ${course.name}` : ""
                  }`.trim();
                  return (
                    <li key={course._id} className="px-3 py-2">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => {
                            setSelectedCourseIds((prev) =>
                              prev.includes(course._id)
                                ? prev.filter((id) => id !== course._id)
                                : [...prev, course._id]
                            );
                          }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-900">
                            {label}
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-500">
                            {typeof course.credits === "number"
                              ? `${course.credits} credit(s)`
                              : "Credits: —"}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm text-zinc-900">
          Minimum room capacity
          <input
            type="number"
            min={1}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={minCapacity}
            onChange={(e) => setMinCapacity(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-900">
          Classes per course per week
          <input
            type="number"
            min={1}
            max={6}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={classesPerCoursePerWeek}
            onChange={(e) => setClassesPerCoursePerWeek(Number(e.target.value))}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-zinc-900">
            <input
              type="checkbox"
              checked={randomizeRooms}
              onChange={(e) => setRandomizeRooms(e.target.checked)}
            />
            Randomize room selection (spread across rooms)
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-900">
            Random seed (optional)
            <input
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={randomSeed}
              onChange={(e) => setRandomSeed(e.target.value)}
              placeholder="e.g. v1"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm text-zinc-900">
          Preferences (JSON, optional)
          <textarea
            className="min-h-[140px] rounded-lg border border-zinc-200 px-3 py-2 font-mono text-xs"
            value={preferencesJson}
            onChange={(e) => setPreferencesJson(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={loadingPropose}
          className="cp-btn-primary"
        >
          {loadingPropose ? "Generating…" : "Generate proposal"}
        </button>
      </form>

      {error && <InlineAlert tone="error" message={error} />}
      {notice && <InlineAlert tone="success" message={notice} />}

      {proposal && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Proposal preview
              </h2>
              <p className="text-xs text-zinc-600">
                {proposal.proposal.length} slots · aggregate score{" "}
                {proposal.score.toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runApply()}
              disabled={loadingApply || proposal.proposal.length === 0}
              className="cp-btn-primary"
            >
              {loadingApply ? "Applying…" : "Apply proposal (draft schedules)"}
            </button>
          </div>

          {proposal.violations.length > 0 && (
            <InlineAlert
              tone="error"
              message={`Violations: ${proposal.violations.join(" · ")}`}
            />
          )}
          {proposal.soft_warnings.length > 0 && (
            <InlineAlert
              tone="warning"
              message={`Warnings: ${proposal.soft_warnings
                .slice(0, 5)
                .join(" · ")}`}
            />
          )}

          <div className="cp-card overflow-x-auto p-0">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Faculty</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {proposal.proposal.map((slot, idx) => (
                  <tr
                    key={`${slot.course_id}-${idx}`}
                    className="text-zinc-900"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">
                        {slot.course_code ?? slot.course_id}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {slot.course_name ?? ""}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {slot.schedule_type}
                      </div>
                    </td>
                    <td className="px-4 py-3">{slot.day}</td>
                    <td className="px-4 py-3">
                      {slot.start_time} – {slot.end_time}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-zinc-900">
                        {slot.faculty_name ?? "Unknown"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-zinc-900">
                        {slot.room_code ?? "Unknown room"}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {slot.room_building
                          ? `${slot.room_building}`
                          : slot.room_id}
                      </div>
                    </td>
                    <td className="px-4 py-3">{slot.score.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
