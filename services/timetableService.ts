import { Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import Department from "@/models/Department";
import Faculty from "@/models/Faculty";
import Room from "@/models/Room";
import Schedule from "@/models/Schedule";
import User from "@/models/User";

type AppRole = "student" | "faculty" | "admin" | "registrar";

const DEFAULT_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"] as const;

const DEFAULT_SLOT_BLOCKS: Array<{ start: string; end: string }> = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "12:00", end: "13:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
];

export const timetablePreferencesSchema = z.object({
  preferred_days: z.array(z.string().min(2)).optional(),
  time_windows: z
    .array(
      z.object({
        start: z.string().min(3).max(12),
        end: z.string().min(3).max(12),
      }),
    )
    .optional(),
  room_type: z.enum(["classroom", "lab", "exam_hall"]).optional(),
});

export const timetableProposeSchema = z.object({
  semester: z.string().min(1).max(60),
  section: z.string().min(1).max(40),
  course_ids: z.array(z.string().min(1)).min(1),
  schedule_type: z.enum(["class", "exam"]).optional().default("class"),
  min_room_capacity: z.number().int().min(1).optional().default(30),
  preferences: timetablePreferencesSchema.optional(),
  randomize_rooms: z.boolean().optional().default(true),
  randomize_seed: z.string().max(200).optional(),
  classes_per_course_per_week: z.number().int().min(1).max(6).optional().default(2),
});

export const timetableApplySlotSchema = z.object({
  course_id: z.string().min(1),
  faculty_id: z.string().min(1),
  room_id: z.string().min(1),
  day: z.string().min(2).max(40),
  start_time: z.string().min(3).max(20),
  end_time: z.string().min(3).max(20),
  schedule_type: z.enum(["class", "exam"]).optional(),
});

export const timetableApplySchema = z.object({
  semester: z.string().min(1).max(60),
  section: z.string().min(1).max(40),
  slots: z.array(timetableApplySlotSchema).min(1),
});

export type TimetableProposalSlot = {
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
  schedule_type: "class" | "exam";
  score: number;
  soft_notes: string[];
};

export type TimetableProposalResult = {
  semester: string;
  section: string;
  proposal: TimetableProposalSlot[];
  violations: string[];
  soft_warnings: string[];
  score: number;
};

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseTimeToMinutes(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  const ampm = normalized.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = Number(ampm[2]);
    const meridian = ampm[3];
    if (hour === 12) hour = 0;
    if (meridian === "pm") hour += 12;
    return hour * 60 + minute;
  }

  const hhmm = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    return Number(hhmm[1]) * 60 + Number(hhmm[2]);
  }

  return null;
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

function slotWithinWindows(
  block: { start: string; end: string },
  windows?: Array<{ start: string; end: string }>,
): boolean {
  if (!windows || windows.length === 0) return true;
  const bStart = parseTimeToMinutes(block.start);
  const bEnd = parseTimeToMinutes(block.end);
  if (bStart === null || bEnd === null) return false;
  return windows.some((window) => {
    const wStart = parseTimeToMinutes(window.start);
    const wEnd = parseTimeToMinutes(window.end);
    if (wStart === null || wEnd === null) return false;
    return bStart >= wStart && bEnd <= wEnd;
  });
}

function softScoreSlot(params: {
  day: string;
  block: { start: string; end: string };
  preferences?: z.infer<typeof timetablePreferencesSchema>;
}): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 0;

  if (params.preferences?.preferred_days?.length) {
    const pref = params.preferences.preferred_days.map((d) => d.toLowerCase());
    if (pref.includes(params.day.toLowerCase())) {
      score += 2;
      notes.push(`Preferred day match (${params.day}).`);
    } else {
      score -= 0.5;
    }
  }

  if (params.preferences?.time_windows?.length) {
    if (slotWithinWindows(params.block, params.preferences.time_windows)) {
      score += 1;
      notes.push("Within preferred time window.");
    } else {
      notes.push("Outside preferred time windows (soft).");
    }
  }

  return { score, notes };
}

export async function proposeTimetable(
  payload: z.infer<typeof timetableProposeSchema>,
): Promise<TimetableProposalResult> {
  const parsed = timetableProposeSchema.parse(payload);
  await connectToDatabase();

  const courseObjectIds = parsed.course_ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  if (courseObjectIds.length === 0) {
    throw new Error("At least one valid course_id is required.");
  }

  const courses = await Course.find({ _id: { $in: courseObjectIds } })
    .select("_id code name credits department_id")
    .lean<
      Array<{
        _id: Types.ObjectId;
        code: string;
        name: string;
        credits: number;
        department_id: Types.ObjectId;
      }>
    >();

  if (courses.length === 0) {
    throw new Error("No courses found for the provided ids.");
  }

  const departmentIds = Array.from(new Set(courses.map((c) => String(c.department_id))));

  const departments = await Department.find({ _id: { $in: departmentIds } })
    .select("_id code")
    .lean<Array<{ _id: Types.ObjectId; code: string }>>();
  const deptIdToCode = new Map<string, string>(
    departments.map((d) => [String(d._id), String(d.code ?? "").toUpperCase()]),
  );
  const departmentKeysForUsers = Array.from(
    new Set([
      ...departmentIds,
      ...departments.map((d) => String(d.code ?? "").toUpperCase()).filter(Boolean),
    ]),
  );

  const facultyUsers = await User.find({
    role: "faculty",
    department_id: { $in: departmentKeysForUsers },
    is_active: true,
  })
    .select("_id department_id")
    .lean<Array<{ _id: Types.ObjectId; department_id?: string | null }>>();

  const facultyProfiles = await Faculty.find({
    user_id: { $in: facultyUsers.map((u) => u._id) },
  })
    .select("_id user_id workload_limit employee_id")
    .lean<
      Array<{ _id: Types.ObjectId; user_id: Types.ObjectId; workload_limit?: number; employee_id: string }>
    >();

  const facultyUserIds = Array.from(new Set(facultyProfiles.map((f) => String(f.user_id))));
  const facultyUserDocs = await User.find({ _id: { $in: facultyUserIds } })
    .select("_id name")
    .lean<Array<{ _id: Types.ObjectId; name: string }>>();
  const facultyUserNameById = new Map<string, string>(facultyUserDocs.map((u) => [String(u._id), u.name]));
  const facultyMetaByFacultyId = new Map<string, { name: string; employee_id: string }>(
    facultyProfiles.map((f) => [
      String(f._id),
      {
        name: facultyUserNameById.get(String(f.user_id)) ?? "Unknown",
        employee_id: f.employee_id,
      },
    ]),
  );

  const facultyByDept = new Map<string, Types.ObjectId[]>();
  for (const course of courses) {
    const deptKey = String(course.department_id);
    const deptCode = deptIdToCode.get(deptKey);
    const eligibleUserIds = facultyUsers
      .filter((u) => {
        const raw = (u.department_id ?? "").trim();
        if (!raw) return false;
        if (Types.ObjectId.isValid(raw)) return String(new Types.ObjectId(raw)) === deptKey;
        if (deptCode) return raw.toUpperCase() === deptCode;
        return false;
      })
      .map((u) => u._id);
    const eligibleFacultyIds = facultyProfiles
      .filter((f) => eligibleUserIds.some((u) => String(u) === String(f.user_id)))
      .map((f) => f._id);
    facultyByDept.set(deptKey, eligibleFacultyIds);
  }

  const roomFilter: Record<string, unknown> = {
    is_active: true,
    capacity: { $gte: parsed.min_room_capacity },
  };
  if (parsed.preferences?.room_type) {
    roomFilter.room_type = parsed.preferences.room_type;
  }

  const rooms = await Room.find(roomFilter)
    .select("_id capacity room_type room_code building")
    .lean<
      Array<{ _id: Types.ObjectId; capacity: number; room_type: string; room_code: string; building: string }>
    >();
  const roomMetaById = new Map<string, { room_code: string; building: string }>(
    rooms.map((r) => [String(r._id), { room_code: r.room_code, building: r.building }]),
  );
  const roomIterationList =
    parsed.randomize_rooms && rooms.length > 1
      ? shuffle(
          rooms,
          mulberry32(
            stableHash(
              parsed.randomize_seed?.trim() ||
                `${parsed.semester}|${parsed.section}|${parsed.min_room_capacity}|${String(Date.now())}`,
            ),
          ),
        )
      : rooms;

  if (rooms.length === 0) {
    throw new Error("No rooms satisfy capacity/type filters. Relax min_room_capacity or room_type.");
  }

  const existingSchedules = await Schedule.find({
    semester: parsed.semester,
    status: { $ne: "cancelled" },
  })
    .select("_id faculty_id room_id day start_time end_time semester section date")
    .lean<
      Array<{
        _id: Types.ObjectId;
        faculty_id: Types.ObjectId;
        room_id: Types.ObjectId;
        day: string;
        start_time: string;
        end_time: string;
        semester: string;
        section: string;
        date?: Date | null;
      }>
    >();

  const facultyLoads = new Map<string, number>();
  for (const row of existingSchedules) {
    if (String(row.semester) !== parsed.semester) continue;
    const key = String(row.faculty_id);
    facultyLoads.set(key, (facultyLoads.get(key) ?? 0) + 1);
  }

  const occupiedFaculty = new Set<string>();
  const occupiedRoom = new Set<string>();
  const occupiedSection = new Set<string>();
  const sectionDayPeriodIndexes = new Map<string, Set<number>>();
  const sectionDayCounts = new Map<string, number>();
  const sectionCourseDayUsed = new Set<string>();

  function markOccupiedFromExisting() {
    for (const row of existingSchedules) {
      if (String(row.semester) !== parsed.semester) continue;
      const start = parseTimeToMinutes(row.start_time);
      const end = parseTimeToMinutes(row.end_time);
      if (start === null || end === null) continue;
      const fKey = `${row.day}|${start}|${end}|${String(row.faculty_id)}`;
      const rKey = `${row.day}|${start}|${end}|${String(row.room_id)}`;
      const sKey = `${row.day}|${start}|${end}|${parsed.section}`;
      occupiedFaculty.add(fKey);
      occupiedRoom.add(rKey);
      occupiedSection.add(sKey);
    }
  }

  markOccupiedFromExisting();

  const preferredLower = (parsed.preferences?.preferred_days ?? []).map((d) => d.toLowerCase());
  const orderedDays =
    preferredLower.length > 0
      ? [
          ...DEFAULT_DAYS.filter((d) => preferredLower.includes(d.toLowerCase())),
          ...DEFAULT_DAYS.filter((d) => !preferredLower.includes(d.toLowerCase())),
        ]
      : [...DEFAULT_DAYS];

  const proposal: TimetableProposalSlot[] = [];
  const violations: string[] = [];
  const softWarnings: string[] = [];

  const courseNeeds = courses
    .map((course) => ({
      course,
      weekly_slots: parsed.classes_per_course_per_week,
    }))
    .sort((a, b) => b.weekly_slots - a.weekly_slots);

  for (const item of courseNeeds) {
    const { course, weekly_slots } = item;
    const deptKey = String(course.department_id);
    const facultyPool = facultyByDept.get(deptKey) ?? [];

    if (facultyPool.length === 0) {
      violations.push(
        `No faculty linked to department for course ${course.code}. Add faculty users in this department.`,
      );
      continue;
    }

    for (let i = 0; i < weekly_slots; i += 1) {
      let placed = false;

      dayLoop: for (const day of orderedDays) {
        const courseDayKey = `${parsed.section}|${String(course._id)}|${day}`;
        // Enforce: a course can appear at most once per day for the same section.
        if (sectionCourseDayUsed.has(courseDayKey)) {
          continue;
        }

        const sectionDayKey = `${parsed.section}|${day}`;
        const dayCount = sectionDayCounts.get(sectionDayKey) ?? 0;
        if (dayCount >= 3) {
          continue;
        }

        for (let slotIndex = 0; slotIndex < DEFAULT_SLOT_BLOCKS.length; slotIndex += 1) {
          const block = DEFAULT_SLOT_BLOCKS[slotIndex];
          if (!slotWithinWindows(block, parsed.preferences?.time_windows)) {
            continue;
          }

          const start = parseTimeToMinutes(block.start);
          const end = parseTimeToMinutes(block.end);
          if (start === null || end === null) continue;

          const usedIndexes = sectionDayPeriodIndexes.get(sectionDayKey) ?? new Set<number>();
          // Enforce "break period": do not allow consecutive periods for the same section/day.
          if (usedIndexes.has(slotIndex - 1) || usedIndexes.has(slotIndex + 1) || usedIndexes.has(slotIndex)) {
            continue;
          }

          for (const room of roomIterationList) {
            const facultyCandidates = [...facultyPool].sort(
              (a, b) => (facultyLoads.get(String(a)) ?? 0) - (facultyLoads.get(String(b)) ?? 0),
            );

            for (const facultyId of facultyCandidates) {
              const profile = facultyProfiles.find((f) => String(f._id) === String(facultyId));
              const load = facultyLoads.get(String(facultyId)) ?? 0;
              if (profile && profile.workload_limit && profile.workload_limit > 0) {
                if (load >= profile.workload_limit) {
                  softWarnings.push(
                    `Faculty ${String(facultyId)} workload_limit (${profile.workload_limit}) reached; still attempting assignment.`,
                  );
                }
              }

              const fKey = `${day}|${start}|${end}|${String(facultyId)}`;
              const rKey = `${day}|${start}|${end}|${String(room._id)}`;
              const sKey = `${day}|${start}|${end}|${parsed.section}`;

              if (occupiedFaculty.has(fKey) || occupiedRoom.has(rKey) || occupiedSection.has(sKey)) {
                continue;
              }

              const conflictsExisting = existingSchedules.some((row) => {
                if (String(row.semester) !== parsed.semester) return false;
                if (row.day !== day) return false;
                const rs = parseTimeToMinutes(row.start_time);
                const re = parseTimeToMinutes(row.end_time);
                if (rs === null || re === null) return false;
                if (!overlaps(start, end, rs, re)) return false;

                if (String(row.faculty_id) === String(facultyId)) return true;
                if (String(row.room_id) === String(room._id)) return true;
                if (String(row.section) === parsed.section) return true;
                return false;
              });

              if (conflictsExisting) {
                continue;
              }

              const soft = softScoreSlot({ day, block, preferences: parsed.preferences });
              const facultyMeta = facultyMetaByFacultyId.get(String(facultyId));
              const roomMeta = roomMetaById.get(String(room._id));
              occupiedFaculty.add(fKey);
              occupiedRoom.add(rKey);
              occupiedSection.add(sKey);
              facultyLoads.set(String(facultyId), load + 1);
              sectionDayCounts.set(sectionDayKey, dayCount + 1);
              const updatedIndexes = new Set(sectionDayPeriodIndexes.get(sectionDayKey) ?? []);
              updatedIndexes.add(slotIndex);
              sectionDayPeriodIndexes.set(sectionDayKey, updatedIndexes);
              sectionCourseDayUsed.add(courseDayKey);

              proposal.push({
                course_id: String(course._id),
                course_code: course.code,
                course_name: course.name,
                faculty_id: String(facultyId),
                faculty_name: facultyMeta?.name,
                faculty_employee_id: facultyMeta?.employee_id,
                room_id: String(room._id),
                room_code: roomMeta?.room_code,
                room_building: roomMeta?.building,
                day,
                start_time: block.start,
                end_time: block.end,
                semester: parsed.semester,
                section: parsed.section,
                schedule_type: parsed.schedule_type,
                score: soft.score,
                soft_notes: soft.notes,
              });

              placed = true;
              break dayLoop;
            }
          }
        }
      }

      if (!placed) {
        violations.push(
          `Unable to place slot ${i + 1}/${weekly_slots} for course ${course.code} (${course.name}). This can happen if the rules (max 3 classes/day, break period, max 1 class/course/day) leave too few slots, or if rooms/faculty are fully booked.`,
        );
      }
    }
  }

  const totalScore = proposal.reduce((sum, row) => sum + row.score, 0);

  return {
    semester: parsed.semester,
    section: parsed.section,
    proposal,
    violations,
    soft_warnings: softWarnings,
    score: totalScore,
  };
}

export async function applyTimetableProposal(
  requester: { userId: string; role: AppRole },
  payload: z.infer<typeof timetableApplySchema>,
) {
  if (requester.role !== "admin") {
    throw new Error("Only administrators can apply timetable proposals.");
  }

  const parsed = timetableApplySchema.parse(payload);
  await connectToDatabase();

  const userObjectId = new Types.ObjectId(requester.userId);
  const created: Types.ObjectId[] = [];

  for (const slot of parsed.slots) {
    const doc = await Schedule.create({
      schedule_type: slot.schedule_type ?? "class",
      course_id: new Types.ObjectId(slot.course_id),
      faculty_id: new Types.ObjectId(slot.faculty_id),
      room_id: new Types.ObjectId(slot.room_id),
      day: slot.day,
      date: null,
      start_time: slot.start_time,
      end_time: slot.end_time,
      semester: parsed.semester,
      section: parsed.section,
      status: "draft",
      created_by: userObjectId,
    });
    created.push(doc._id as Types.ObjectId);
  }

  return {
    created_count: created.length,
    schedule_ids: created.map((id) => String(id)),
  };
}
