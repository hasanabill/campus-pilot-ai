"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";

type CourseItem = { _id: string; code?: string; name?: string; department_id?: string };
type FacultyItem = { _id: string; employee_id?: string; designation?: string };
type RoomItem = { _id: string; room_code?: string; building?: string; is_active?: boolean };
type DepartmentItem = { _id: string; name?: string; code?: string };

type AssignmentDraft = {
  course_id: string;
  faculty_id: string;
  weekly_classes: number;
};

type SectionDraft = {
  name: string;
  assignments: AssignmentDraft[];
};

type BatchDraft = {
  name: string;
  sections: SectionDraft[];
};

type RoutineRules = {
  working_days: string[];
  time_slots: Array<{ start: string; end: string }>;
  min_days_per_section: number;
  max_days_per_section: number;
  min_classes_per_active_day: number;
  max_teacher_consecutive_classes: number;
  max_section_consecutive_classes: number;
  classes_per_course_per_week: number;
};

type RoutineSlot = {
  batch_name: string;
  section_name: string;
  course_code?: string;
  course_name?: string;
  faculty_name?: string;
  room_code?: string;
  day: string;
  start_time: string;
  end_time: string;
};

type RoutineResponse = {
  routine_id: string;
  semester: string;
  proposal: RoutineSlot[];
  score: number;
  violations: string[];
  warnings: string[];
  ai?: {
    summary: string;
    likely_causes: string[];
    suggested_relaxations: string[];
    risk_notes: string[];
  } | null;
};

const defaultRules: RoutineRules = {
  working_days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"],
  time_slots: [
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "12:00", end: "13:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
  ],
  min_days_per_section: 3,
  max_days_per_section: 4,
  min_classes_per_active_day: 2,
  max_teacher_consecutive_classes: 2,
  max_section_consecutive_classes: 2,
  classes_per_course_per_week: 2,
};

const dayOptions = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function emptyAssignment(): AssignmentDraft {
  return { course_id: "", faculty_id: "", weekly_classes: 2 };
}

function emptySection(name = "A"): SectionDraft {
  return { name, assignments: [emptyAssignment(), emptyAssignment(), emptyAssignment()] };
}

function emptyBatch(): BatchDraft {
  return { name: "Batch 15", sections: [emptySection()] };
}

async function fetchAll<T>(resource: string): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && items.length < 1000) {
    const res = await fetch(`/api/master-data/${resource}?limit=100&page=${page}`);
    const payload = (await res.json()) as { items?: T[]; total_pages?: number; error?: string };
    if (!res.ok) throw new Error(payload.error ?? `Failed to load ${resource}.`);
    items.push(...(payload.items ?? []));
    totalPages = payload.total_pages ?? 1;
    page += 1;
  }
  return items;
}

export default function RoutineGeneratorClient() {
  const [semester, setSemester] = useState("Fall 2026");
  const [departmentId, setDepartmentId] = useState("");
  const [batches, setBatches] = useState<BatchDraft[]>([emptyBatch()]);
  const [rules, setRules] = useState<RoutineRules>(defaultRules);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [useAiExplanation, setUseAiExplanation] = useState(true);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [faculty, setFaculty] = useState<FacultyItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoutineResponse | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoadingData(true);
      setError(null);
      try {
        const [departmentItems, courseItems, facultyItems, roomItems] = await Promise.all([
          fetchAll<DepartmentItem>("departments"),
          fetchAll<CourseItem>("courses"),
          fetchAll<FacultyItem>("faculty"),
          fetchAll<RoomItem>("rooms"),
        ]);
        if (!active) return;
        setDepartments(departmentItems);
        setCourses(courseItems);
        setFaculty(facultyItems);
        setRooms(roomItems.filter((room) => room.is_active !== false));
        setDepartmentId((prev) => prev || departmentItems[0]?._id || "");
        setSelectedRoomIds((prev) => (prev.length > 0 ? prev : roomItems.filter((room) => room.is_active !== false).map((room) => room._id)));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load routine data.");
      } finally {
        if (active) setLoadingData(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const courseOptions = useMemo(
    () => courses.map((course) => ({ value: course._id, label: `${course.code ?? "Course"} ${course.name ? `- ${course.name}` : ""}`.trim() })),
    [courses],
  );
  const facultyOptions = useMemo(
    () => faculty.map((item) => ({ value: item._id, label: `${item.employee_id ?? "Faculty"} ${item.designation ? `- ${item.designation}` : ""}`.trim() })),
    [faculty],
  );

  function updateBatch(index: number, patch: Partial<BatchDraft>) {
    setBatches((prev) => prev.map((batch, i) => (i === index ? { ...batch, ...patch } : batch)));
  }

  function updateSection(batchIndex: number, sectionIndex: number, patch: Partial<SectionDraft>) {
    setBatches((prev) =>
      prev.map((batch, i) =>
        i === batchIndex
          ? {
              ...batch,
              sections: batch.sections.map((section, j) => (j === sectionIndex ? { ...section, ...patch } : section)),
            }
          : batch,
      ),
    );
  }

  function updateAssignment(batchIndex: number, sectionIndex: number, assignmentIndex: number, patch: Partial<AssignmentDraft>) {
    setBatches((prev) =>
      prev.map((batch, i) =>
        i === batchIndex
          ? {
              ...batch,
              sections: batch.sections.map((section, j) =>
                j === sectionIndex
                  ? {
                      ...section,
                      assignments: section.assignments.map((assignment, k) =>
                        k === assignmentIndex ? { ...assignment, ...patch } : assignment,
                      ),
                    }
                  : section,
              ),
            }
          : batch,
      ),
    );
  }

  function toggleDay(day: string) {
    setRules((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((item) => item !== day)
        : [...prev.working_days, day],
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerating(true);
    setMessage(null);
    setError(null);
    setResult(null);
    try {
      const cleanBatches = batches.map((batch) => ({
        name: batch.name.trim(),
        sections: batch.sections.map((section) => ({
          name: section.name.trim(),
          assignments: section.assignments
            .filter((assignment) => assignment.course_id && assignment.faculty_id)
            .map((assignment) => ({
              course_id: assignment.course_id,
              faculty_id: assignment.faculty_id,
              weekly_classes: assignment.weekly_classes,
            })),
        })),
      }));
      if (cleanBatches.some((batch) => !batch.name || batch.sections.some((section) => !section.name || section.assignments.length === 0))) {
        throw new Error("Every batch and section needs a name, and every section needs at least one course-teacher assignment.");
      }
      const res = await fetch("/api/routine/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semester,
          department_id: departmentId || undefined,
          batches: cleanBatches,
          room_ids: selectedRoomIds,
          rules,
          use_ai_explanation: useAiExplanation,
        }),
      });
      const payload = (await res.json()) as RoutineResponse | { error?: string };
      if (!res.ok || !("proposal" in payload)) throw new Error("error" in payload && payload.error ? payload.error : "Routine generation failed.");
      setResult(payload);
      setMessage(`Generated routine ${payload.routine_id} with ${payload.proposal.length} slot(s), score ${payload.score}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Routine generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function applyRoutine() {
    if (!result) return;
    setApplying(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/routine/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routine_id: result.routine_id, apply_as: "draft" }),
      });
      const payload = (await res.json()) as { created_count?: number; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Routine apply failed.");
      setMessage(`Applied routine as ${payload.created_count ?? 0} draft schedule record(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Routine apply failed.");
    } finally {
      setApplying(false);
    }
  }

  const groupedPreview = useMemo(() => {
    const groups = new Map<string, RoutineSlot[]>();
    for (const slot of result?.proposal ?? []) {
      const key = slot.section_name;
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return Array.from(groups.entries());
  }, [result]);

  return (
    <section className="space-y-5">
      <PageHeader
        title="AI Routine Generator"
        subtitle="Define batches, sections, course teachers, rooms, and rules. The solver builds the routine; AI explains the outcome."
      />
      {message ? <InlineAlert tone="success" message={message} /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}
      {loadingData ? <InlineAlert tone="info" message="Loading courses, faculty, rooms, and departments..." /> : null}

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="cp-card grid gap-4 md:grid-cols-2">
            <div>
              <label className="cp-label" htmlFor="semester">Semester</label>
              <input id="semester" className="cp-input" value={semester} onChange={(event) => setSemester(event.target.value)} />
            </div>
            <div>
              <label className="cp-label" htmlFor="department">Department</label>
              <select id="department" className="cp-select" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                <option value="">Auto-detect from first course</option>
                {departments.map((department) => (
                  <option key={department._id} value={department._id}>
                    {department.code ?? department.name ?? department._id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {batches.map((batch, batchIndex) => (
            <div key={`${batch.name}-${batchIndex}`} className="cp-card space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="cp-label" htmlFor={`batch-${batchIndex}`}>Batch</label>
                  <input
                    id={`batch-${batchIndex}`}
                    className="cp-input"
                    value={batch.name}
                    onChange={(event) => updateBatch(batchIndex, { name: event.target.value })}
                  />
                </div>
                <button
                  type="button"
                  className="cp-btn-secondary mt-5 text-xs"
                  onClick={() => setBatches((prev) => prev.filter((_, index) => index !== batchIndex))}
                  disabled={batches.length === 1}
                >
                  Remove Batch
                </button>
              </div>

              {batch.sections.map((section, sectionIndex) => (
                <div key={`${section.name}-${sectionIndex}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <label className="cp-label" htmlFor={`section-${batchIndex}-${sectionIndex}`}>Section</label>
                      <input
                        id={`section-${batchIndex}-${sectionIndex}`}
                        className="cp-input max-w-40"
                        value={section.name}
                        onChange={(event) => updateSection(batchIndex, sectionIndex, { name: event.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      className="cp-btn-secondary text-xs"
                      onClick={() =>
                        updateBatch(batchIndex, {
                          sections: batch.sections.filter((_, index) => index !== sectionIndex),
                        })
                      }
                      disabled={batch.sections.length === 1}
                    >
                      Remove Section
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="hidden gap-2 px-1 text-xs font-medium text-zinc-500 md:grid md:grid-cols-[1fr_1fr_110px_80px]">
                      <span>Course</span>
                      <span>Teacher</span>
                      <span>Weekly Classes</span>
                      <span>Action</span>
                    </div>
                    {section.assignments.map((assignment, assignmentIndex) => (
                      <div key={assignmentIndex} className="grid gap-2 md:grid-cols-[1fr_1fr_110px_80px]">
                        <select aria-label="Course" className="cp-select" value={assignment.course_id} onChange={(event) => updateAssignment(batchIndex, sectionIndex, assignmentIndex, { course_id: event.target.value })}>
                          <option value="">Course</option>
                          {courseOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <select aria-label="Teacher" className="cp-select" value={assignment.faculty_id} onChange={(event) => updateAssignment(batchIndex, sectionIndex, assignmentIndex, { faculty_id: event.target.value })}>
                          <option value="">Teacher</option>
                          {facultyOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <input
                          aria-label="Weekly classes"
                          className="cp-input"
                          type="number"
                          min={1}
                          max={6}
                          value={assignment.weekly_classes}
                          onChange={(event) => updateAssignment(batchIndex, sectionIndex, assignmentIndex, { weekly_classes: Number(event.target.value) })}
                        />
                        <button
                          type="button"
                          className="cp-btn-secondary text-xs"
                          onClick={() =>
                            updateSection(batchIndex, sectionIndex, {
                              assignments: section.assignments.filter((_, index) => index !== assignmentIndex),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="cp-btn-secondary mt-3 text-xs"
                    onClick={() => updateSection(batchIndex, sectionIndex, { assignments: [...section.assignments, emptyAssignment()] })}
                  >
                    Add Course-Teacher
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="cp-btn-secondary text-xs"
                onClick={() => updateBatch(batchIndex, { sections: [...batch.sections, emptySection(String.fromCharCode(65 + batch.sections.length))] })}
              >
                Add Section
              </button>
            </div>
          ))}
          <button type="button" className="cp-btn-secondary" onClick={() => setBatches((prev) => [...prev, emptyBatch()])}>
            Add Batch
          </button>
        </div>

        <aside className="space-y-5">
          <div className="cp-card space-y-4">
            <p className="cp-section-title">Rules</p>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-full border px-3 py-1 text-xs ${rules.working_days.includes(day) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-zinc-200 bg-white text-zinc-600"}`}
                >
                  {day}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs text-zinc-500">
                Min days
                <input className="cp-input" type="number" value={rules.min_days_per_section} onChange={(event) => setRules((prev) => ({ ...prev, min_days_per_section: Number(event.target.value) }))} />
              </label>
              <label className="space-y-1 text-xs text-zinc-500">
                Max days
                <input className="cp-input" type="number" value={rules.max_days_per_section} onChange={(event) => setRules((prev) => ({ ...prev, max_days_per_section: Number(event.target.value) }))} />
              </label>
              <label className="space-y-1 text-xs text-zinc-500">
                Min/day
                <input className="cp-input" type="number" value={rules.min_classes_per_active_day} onChange={(event) => setRules((prev) => ({ ...prev, min_classes_per_active_day: Number(event.target.value) }))} />
              </label>
              <label className="space-y-1 text-xs text-zinc-500">
                Classes/course
                <input className="cp-input" type="number" value={rules.classes_per_course_per_week} onChange={(event) => setRules((prev) => ({ ...prev, classes_per_course_per_week: Number(event.target.value) }))} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs text-zinc-500">
                Teacher max consecutive
                <input className="cp-input" type="number" value={rules.max_teacher_consecutive_classes} onChange={(event) => setRules((prev) => ({ ...prev, max_teacher_consecutive_classes: Number(event.target.value) }))} />
              </label>
              <label className="space-y-1 text-xs text-zinc-500">
                Section max consecutive
                <input className="cp-input" type="number" value={rules.max_section_consecutive_classes} onChange={(event) => setRules((prev) => ({ ...prev, max_section_consecutive_classes: Number(event.target.value) }))} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-600">
              <input type="checkbox" checked={useAiExplanation} onChange={(event) => setUseAiExplanation(event.target.checked)} />
              Include AI explanation
            </label>
          </div>

          <div className="cp-card space-y-3">
            <p className="cp-section-title">Rooms</p>
            {rooms.length === 0 ? <EmptyState title="No rooms found" description="Add active rooms in master data before generating." /> : null}
            <div className="max-h-56 space-y-2 overflow-auto">
              {rooms.map((room) => (
                <label key={room._id} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={selectedRoomIds.includes(room._id)}
                    onChange={(event) =>
                      setSelectedRoomIds((prev) =>
                        event.target.checked ? [...prev, room._id] : prev.filter((id) => id !== room._id),
                      )
                    }
                  />
                  {room.room_code ?? room._id} {room.building ? `(${room.building})` : ""}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="cp-btn-primary w-full" disabled={generating || loadingData}>
            {generating ? "Generating..." : "Generate Routine"}
          </button>
        </aside>
      </form>

      <section className="cp-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="cp-section-title">Routine Preview</p>
            <p className="text-xs text-zinc-500">Review warnings and generated class slots before applying as draft schedules.</p>
          </div>
          <button type="button" className="cp-btn-primary text-xs" onClick={() => void applyRoutine()} disabled={!result || result.proposal.length === 0 || applying}>
            {applying ? "Applying..." : "Apply Draft"}
          </button>
        </div>
        {!result ? <EmptyState title="No generated routine yet" description="Fill the setup and generate a routine preview." /> : null}
        {result?.violations.length ? <InlineAlert tone="error" message={result.violations.join(" ")} /> : null}
        {result?.warnings.length ? <InlineAlert tone="warning" message={result.warnings.join(" ")} /> : null}
        {result?.ai?.summary ? <InlineAlert tone="info" message={result.ai.summary} /> : null}
        <div className="space-y-4">
          {groupedPreview.map(([sectionName, slots]) => (
            <div key={sectionName} className="rounded-2xl border border-zinc-200">
              <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-800">{sectionName}</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-4 py-2">Day</th>
                      <th className="px-4 py-2">Time</th>
                      <th className="px-4 py-2">Course</th>
                      <th className="px-4 py-2">Teacher</th>
                      <th className="px-4 py-2">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot, index) => (
                      <tr key={`${sectionName}-${index}`} className="border-t border-zinc-100">
                        <td className="px-4 py-2">{slot.day}</td>
                        <td className="px-4 py-2">{slot.start_time}-{slot.end_time}</td>
                        <td className="px-4 py-2">{slot.course_code ?? slot.course_name ?? "Course"}</td>
                        <td className="px-4 py-2">{slot.faculty_name ?? "Teacher"}</td>
                        <td className="px-4 py-2">{slot.room_code ?? "Room"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        {result?.ai?.suggested_relaxations.length ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">AI suggestions</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {result.ai.suggested_relaxations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </section>
  );
}
