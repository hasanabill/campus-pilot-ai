import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import Department from "@/models/Department";
import Faculty from "@/models/Faculty";
import GeneratedRoutine from "@/models/GeneratedRoutine";
import GeneratedRoutineSlot from "@/models/GeneratedRoutineSlot";
import Room from "@/models/Room";
import RoutineCourseAssignment from "@/models/RoutineCourseAssignment";
import Schedule from "@/models/Schedule";
import Section from "@/models/Section";
import User from "@/models/User";
import { explainRoutineResult } from "@/services/routine/routineAiAdvisor";
import { validateRoutineFeasibility } from "@/services/routine/routineFeasibility";
import { routineApplySchema, routineGenerateSchema, type RoutineApplyPayload, type RoutineGeneratePayload } from "@/services/routine/routineSchemas";
import { solveRoutine } from "@/services/routine/routineSolver";
import type { RoutineRoom, RoutineSession } from "@/services/routine/routineTypes";

type AppRole = "student" | "faculty" | "admin" | "registrar";

function requireAdmin(role: AppRole) {
  if (role !== "admin") throw new Error("Only administrators can manage routine generation.");
}

function toObjectId(id: string, label: string) {
  if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid ${label}.`);
  return new Types.ObjectId(id);
}

function parseTimeToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

async function resolveDepartmentId(payload: RoutineGeneratePayload): Promise<Types.ObjectId> {
  if (payload.department_id) return toObjectId(payload.department_id, "department_id");
  const firstCourseId = payload.batches[0]?.sections[0]?.assignments[0]?.course_id;
  if (firstCourseId) {
    const course = await Course.findById(firstCourseId).select("department_id").lean<{ department_id: Types.ObjectId } | null>();
    if (course) return course.department_id;
  }
  const department = await Department.findOne({}).sort({ created_at: 1 }).select("_id").lean<{ _id: Types.ObjectId } | null>();
  if (!department) throw new Error("No department found. Create a department before generating routines.");
  return department._id;
}

async function persistRoutineInputs(payload: RoutineGeneratePayload, departmentId: Types.ObjectId) {
  const batches: Array<{ id: string; name: string; sections: Array<{ id: string; name: string; assignments: RoutineGeneratePayload["batches"][number]["sections"][number]["assignments"] }> }> = [];

  for (const inputBatch of payload.batches) {
    const batch = await Batch.findOneAndUpdate(
      { department_id: departmentId, semester: payload.semester, name: inputBatch.name.trim() },
      { department_id: departmentId, semester: payload.semester, name: inputBatch.name.trim(), is_active: true },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const sections: Array<{ id: string; name: string; assignments: RoutineGeneratePayload["batches"][number]["sections"][number]["assignments"] }> = [];
    for (const inputSection of inputBatch.sections) {
      const section = await Section.findOneAndUpdate(
        { batch_id: batch._id, name: inputSection.name.trim() },
        { batch_id: batch._id, name: inputSection.name.trim(), is_active: true },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      for (const assignment of inputSection.assignments) {
        await RoutineCourseAssignment.findOneAndUpdate(
          { section_id: section._id, course_id: toObjectId(assignment.course_id, "course_id") },
          {
            section_id: section._id,
            course_id: toObjectId(assignment.course_id, "course_id"),
            faculty_id: toObjectId(assignment.faculty_id, "faculty_id"),
            weekly_classes: assignment.weekly_classes ?? payload.rules.classes_per_course_per_week,
            class_duration_minutes: 60,
            is_active: true,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }
      sections.push({ id: String(section._id), name: inputSection.name.trim(), assignments: inputSection.assignments });
    }
    batches.push({ id: String(batch._id), name: inputBatch.name.trim(), sections });
  }
  return batches;
}

async function buildSessions(payload: RoutineGeneratePayload, batches: Awaited<ReturnType<typeof persistRoutineInputs>>) {
  const courseIds = Array.from(
    new Set(payload.batches.flatMap((batch) => batch.sections.flatMap((section) => section.assignments.map((assignment) => assignment.course_id)))),
  );
  const facultyIds = Array.from(
    new Set(payload.batches.flatMap((batch) => batch.sections.flatMap((section) => section.assignments.map((assignment) => assignment.faculty_id)))),
  );
  const [courses, facultyProfiles] = await Promise.all([
    Course.find({ _id: { $in: courseIds.map((id) => toObjectId(id, "course_id")) } })
      .select("_id code name")
      .lean<Array<{ _id: Types.ObjectId; code: string; name: string }>>(),
    Faculty.find({ _id: { $in: facultyIds.map((id) => toObjectId(id, "faculty_id")) } })
      .select("_id user_id employee_id")
      .lean<Array<{ _id: Types.ObjectId; user_id: Types.ObjectId; employee_id: string }>>(),
  ]);

  const userDocs = await User.find({ _id: { $in: facultyProfiles.map((faculty) => faculty.user_id) } })
    .select("_id name")
    .lean<Array<{ _id: Types.ObjectId; name: string }>>();
  const courseById = new Map(courses.map((course) => [String(course._id), course]));
  const facultyById = new Map(facultyProfiles.map((faculty) => [String(faculty._id), faculty]));
  const userNameById = new Map(userDocs.map((user) => [String(user._id), user.name]));
  const sessions: RoutineSession[] = [];

  for (const batch of batches) {
    for (const section of batch.sections) {
      for (const assignment of section.assignments) {
        const course = courseById.get(assignment.course_id);
        const faculty = facultyById.get(assignment.faculty_id);
        if (!course) throw new Error(`Course ${assignment.course_id} was not found.`);
        if (!faculty) throw new Error(`Faculty ${assignment.faculty_id} was not found.`);
        const count = assignment.weekly_classes ?? payload.rules.classes_per_course_per_week;
        for (let index = 0; index < count; index += 1) {
          sessions.push({
            session_id: `${section.id}|${assignment.course_id}|${index}`,
            batch_id: batch.id,
            batch_name: batch.name,
            section_id: section.id,
            section_name: `${batch.name} - ${section.name}`,
            course_id: assignment.course_id,
            course_code: course.code,
            course_name: course.name,
            faculty_id: assignment.faculty_id,
            faculty_name: userNameById.get(String(faculty.user_id)) ?? faculty.employee_id,
          });
        }
      }
    }
  }

  return sessions;
}

async function buildRooms(roomIds: string[]): Promise<RoutineRoom[]> {
  const rooms = await Room.find({ _id: { $in: roomIds.map((id) => toObjectId(id, "room_id")) }, is_active: true })
    .select("_id room_code")
    .lean<Array<{ _id: Types.ObjectId; room_code: string }>>();
  if (rooms.length === 0) throw new Error("No active rooms found for routine generation.");
  return rooms.map((room) => ({ room_id: String(room._id), room_code: room.room_code }));
}

async function saveGeneratedRoutine(params: {
  requesterId: string;
  departmentId: Types.ObjectId;
  payload: RoutineGeneratePayload;
  result: ReturnType<typeof solveRoutine>;
  aiSummary: string | null;
}) {
  const routine = await GeneratedRoutine.create({
    department_id: params.departmentId,
    semester: params.payload.semester,
    status: "draft",
    score: params.result.score,
    violations: params.result.violations,
    warnings: params.result.warnings,
    ai_summary: params.aiSummary,
    generated_by: toObjectId(params.requesterId, "user id"),
  });

  if (params.result.slots.length > 0) {
    await GeneratedRoutineSlot.insertMany(
      params.result.slots.map((slot) => ({
        routine_id: routine._id,
        batch_id: toObjectId(slot.batch_id, "batch_id"),
        section_id: toObjectId(slot.section_id, "section_id"),
        course_id: toObjectId(slot.course_id, "course_id"),
        faculty_id: toObjectId(slot.faculty_id, "faculty_id"),
        room_id: toObjectId(slot.room_id, "room_id"),
        batch_name: slot.batch_name,
        section_name: slot.section_name,
        course_code: slot.course_code,
        course_name: slot.course_name,
        faculty_name: slot.faculty_name,
        room_code: slot.room_code,
        day: slot.day,
        start_time: slot.start_time,
        end_time: slot.end_time,
      })),
    );
  }
  return routine;
}

export async function generateRoutine(
  requester: { userId: string; role: AppRole },
  payload: RoutineGeneratePayload,
) {
  requireAdmin(requester.role);
  const parsed = routineGenerateSchema.parse(payload);
  await connectToDatabase();
  const departmentId = await resolveDepartmentId(parsed);
  const batches = await persistRoutineInputs(parsed, departmentId);
  const sessions = await buildSessions(parsed, batches);
  const rooms = await buildRooms(parsed.room_ids);
  const feasibilityViolations = validateRoutineFeasibility({ sessions, roomCount: rooms.length, rules: parsed.rules });
  const result =
    feasibilityViolations.length > 0
      ? { slots: [], violations: feasibilityViolations, warnings: [], score: 0, stats: { section_day_loads: {}, teacher_day_loads: {}, room_day_loads: {} } }
      : solveRoutine({ sessions, rooms, rules: parsed.rules });
  const aiAdvice = parsed.use_ai_explanation
    ? await explainRoutineResult({
        result,
        context: {
          semester: parsed.semester,
          batch_count: batches.length,
          section_count: batches.reduce((sum, batch) => sum + batch.sections.length, 0),
          class_count: sessions.length,
        },
      })
    : null;
  const routine = await saveGeneratedRoutine({
    requesterId: requester.userId,
    departmentId,
    payload: parsed,
    result,
    aiSummary: aiAdvice?.summary ?? null,
  });

  return {
    routine_id: String(routine._id),
    semester: parsed.semester,
    proposal: result.slots,
    score: result.score,
    violations: result.violations,
    warnings: result.warnings,
    stats: result.stats,
    ai: aiAdvice,
  };
}

async function ensureNoApplyConflicts(slots: Array<{ day: string; start_time: string; end_time: string; room_id: Types.ObjectId; faculty_id: Types.ObjectId; section_name: string }>) {
  const existing = await Schedule.find({ status: { $ne: "cancelled" } })
    .select("_id day start_time end_time room_id faculty_id section")
    .lean<Array<{ _id: Types.ObjectId; day: string; start_time: string; end_time: string; room_id: Types.ObjectId; faculty_id: Types.ObjectId; section: string }>>();
  const conflicts: string[] = [];
  for (const slot of slots) {
    const start = parseTimeToMinutes(slot.start_time);
    const end = parseTimeToMinutes(slot.end_time);
    if (start === null || end === null) throw new Error("Invalid routine slot time.");
    for (const row of existing) {
      if (row.day !== slot.day) continue;
      const rowStart = parseTimeToMinutes(row.start_time);
      const rowEnd = parseTimeToMinutes(row.end_time);
      if (rowStart === null || rowEnd === null || !overlaps(start, end, rowStart, rowEnd)) continue;
      if (String(row.room_id) === String(slot.room_id)) conflicts.push(`Room conflict with existing schedule ${String(row._id)}.`);
      if (String(row.faculty_id) === String(slot.faculty_id)) conflicts.push(`Faculty conflict with existing schedule ${String(row._id)}.`);
      if (row.section === slot.section_name) conflicts.push(`Section conflict with existing schedule ${String(row._id)}.`);
    }
  }
  if (conflicts.length > 0) throw new Error(conflicts.slice(0, 5).join(" "));
}

export async function applyRoutine(
  requester: { userId: string; role: AppRole },
  payload: RoutineApplyPayload,
) {
  requireAdmin(requester.role);
  const parsed = routineApplySchema.parse(payload);
  await connectToDatabase();
  const routine = await GeneratedRoutine.findById(parsed.routine_id).lean<{ _id: Types.ObjectId; semester: string; status: string } | null>();
  if (!routine) throw new Error("Generated routine was not found.");
  if (routine.status === "applied") throw new Error("Routine has already been applied.");
  const slots = await GeneratedRoutineSlot.find({ routine_id: routine._id })
    .sort({ batch_name: 1, section_name: 1, day: 1, start_time: 1 })
    .lean<
      Array<{
        course_id: Types.ObjectId;
        faculty_id: Types.ObjectId;
        room_id: Types.ObjectId;
        day: string;
        start_time: string;
        end_time: string;
        section_name: string;
      }>
    >();
  if (slots.length === 0) throw new Error("Routine has no slots to apply.");
  await ensureNoApplyConflicts(slots);
  const created = await Schedule.insertMany(
    slots.map((slot) => ({
      schedule_type: "class",
      course_id: slot.course_id,
      faculty_id: slot.faculty_id,
      room_id: slot.room_id,
      day: slot.day,
      date: null,
      start_time: slot.start_time,
      end_time: slot.end_time,
      semester: routine.semester,
      section: slot.section_name,
      status: parsed.apply_as,
      created_by: toObjectId(requester.userId, "user id"),
    })),
  );
  await GeneratedRoutine.findByIdAndUpdate(routine._id, { status: "applied" });
  return { created_count: created.length, schedule_ids: created.map((doc) => String(doc._id)) };
}

export async function explainRoutine(requester: { role: AppRole }, routineId: string) {
  requireAdmin(requester.role);
  await connectToDatabase();
  const routine = await GeneratedRoutine.findById(routineId).lean<{
    _id: Types.ObjectId;
    semester: string;
    score: number;
    violations: string[];
    warnings: string[];
  } | null>();
  if (!routine) throw new Error("Generated routine was not found.");
  const slots = await GeneratedRoutineSlot.find({ routine_id: routine._id }).lean();
  return explainRoutineResult({
    result: {
      slots: [],
      score: routine.score,
      violations: routine.violations,
      warnings: routine.warnings,
      stats: { section_day_loads: {}, teacher_day_loads: {}, room_day_loads: {} },
    },
    context: { semester: routine.semester, batch_count: 0, section_count: 0, class_count: slots.length },
  });
}
