import { Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import Faculty from "@/models/Faculty";
import Schedule from "@/models/Schedule";
import ScheduleChangeLog from "@/models/ScheduleChangeLog";
import { notifyScheduleChange } from "@/services/notificationService";

const scheduleTypes = ["class", "exam"] as const;
const scheduleStatuses = ["draft", "published", "updated", "cancelled"] as const;

type AppRole = "student" | "faculty" | "admin" | "registrar";
type ScheduleStatus = (typeof scheduleStatuses)[number];

export const createScheduleSchema = z.object({
  schedule_type: z.enum(scheduleTypes),
  course_id: z.string().min(1),
  faculty_id: z.string().min(1),
  room_id: z.string().min(1),
  day: z.string().min(2).max(20),
  date: z.string().datetime().optional().nullable(),
  start_time: z.string().min(3).max(20),
  end_time: z.string().min(3).max(20),
  semester: z.string().min(1).max(40),
  section: z.string().min(1).max(30),
  status: z.enum(scheduleStatuses).optional().default("draft"),
  allow_conflicts: z.boolean().optional().default(false),
});

export const listSchedulesQuerySchema = z.object({
  schedule_type: z.enum(scheduleTypes).optional(),
  status: z.enum(scheduleStatuses).optional(),
  semester: z.string().optional(),
  day: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  page: z.number().int().min(1).optional(),
});

export const updateScheduleSchema = createScheduleSchema.partial().extend({
  reason: z
    .enum(["faculty_unavailable", "holiday", "emergency", "optimization", "conflict_fix"])
    .optional()
    .default("conflict_fix"),
});

function requireObjectId(id: string, field: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${field}.`);
  }
  return new Types.ObjectId(id);
}

function canManageSchedules(role: AppRole): boolean {
  return role === "admin";
}

export type ScheduleConflictWarning = {
  type: "room_conflict" | "faculty_conflict" | "time_conflict";
  conflicting_schedule_id: string;
  message: string;
};

export class ScheduleConflictError extends Error {
  warnings: ScheduleConflictWarning[];

  constructor(warnings: ScheduleConflictWarning[]) {
    super("Schedule conflicts detected.");
    this.name = "ScheduleConflictError";
    this.warnings = warnings;
  }
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

function sameCalendarDate(a?: Date | null, b?: Date | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return true; // recurring schedule can conflict with dated schedules on same weekday
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

async function detectConflicts(payload: z.infer<typeof createScheduleSchema>) {
  const start = parseTimeToMinutes(payload.start_time);
  const end = parseTimeToMinutes(payload.end_time);
  if (start === null || end === null || start >= end) {
    throw new Error("Invalid start_time or end_time format/range.");
  }

  const roomId = requireObjectId(payload.room_id, "room_id");
  const facultyId = requireObjectId(payload.faculty_id, "faculty_id");
  const targetDate = payload.date ? new Date(payload.date) : null;

  const existing = await Schedule.find({
    day: payload.day,
    status: { $ne: "cancelled" as ScheduleStatus },
  })
    .select("_id room_id faculty_id start_time end_time date")
    .lean<
      Array<{
        _id: Types.ObjectId;
        room_id: Types.ObjectId;
        faculty_id: Types.ObjectId;
        start_time: string;
        end_time: string;
        date?: Date | null;
      }>
    >();

  const warnings: ScheduleConflictWarning[] = [];

  for (const item of existing) {
    const itemStart = parseTimeToMinutes(item.start_time);
    const itemEnd = parseTimeToMinutes(item.end_time);
    if (itemStart === null || itemEnd === null) {
      continue;
    }
    if (!sameCalendarDate(targetDate, item.date ?? null)) {
      continue;
    }
    if (!overlaps(start, end, itemStart, itemEnd)) {
      continue;
    }

    const conflictId = String(item._id);
    warnings.push({
      type: "time_conflict",
      conflicting_schedule_id: conflictId,
      message: `Time overlap detected with schedule ${conflictId}.`,
    });

    if (String(item.room_id) === String(roomId)) {
      warnings.push({
        type: "room_conflict",
        conflicting_schedule_id: conflictId,
        message: `Room conflict detected with schedule ${conflictId}.`,
      });
    }

    if (String(item.faculty_id) === String(facultyId)) {
      warnings.push({
        type: "faculty_conflict",
        conflicting_schedule_id: conflictId,
        message: `Faculty conflict detected with schedule ${conflictId}.`,
      });
    }
  }

  return warnings;
}

export async function createSchedule(
  requester: { userId: string; role: AppRole },
  payload: z.infer<typeof createScheduleSchema>,
) {
  if (!canManageSchedules(requester.role)) {
    throw new Error("Only admin can create schedules.");
  }

  const parsed = createScheduleSchema.parse(payload);
  await connectToDatabase();

  const warnings = await detectConflicts(parsed);
  if (warnings.length > 0 && !parsed.allow_conflicts) {
    throw new ScheduleConflictError(warnings);
  }

  const schedule = await Schedule.create({
    schedule_type: parsed.schedule_type,
    course_id: requireObjectId(parsed.course_id, "course_id"),
    faculty_id: requireObjectId(parsed.faculty_id, "faculty_id"),
    room_id: requireObjectId(parsed.room_id, "room_id"),
    day: parsed.day,
    date: parsed.date ? new Date(parsed.date) : null,
    start_time: parsed.start_time,
    end_time: parsed.end_time,
    semester: parsed.semester,
    section: parsed.section,
    status: parsed.status,
    created_by: requireObjectId(requester.userId, "user id"),
  });

  try {
    const facultyProfile = await Faculty.findById(schedule.faculty_id)
      .select("user_id")
      .lean<{ user_id: Types.ObjectId } | null>();
    if (facultyProfile) {
      await notifyScheduleChange({
        faculty_user_id: String(facultyProfile.user_id),
        schedule_id: String(schedule._id),
        message: `A schedule (${schedule.schedule_type}) has been created/updated for your assignment on ${schedule.day}.`,
      });
    }
  } catch {
    // Notification failure should not block schedule creation.
  }

  return {
    schedule: schedule.toObject(),
    warnings,
  };
}

export async function listSchedules(query: z.infer<typeof listSchedulesQuerySchema>) {
  const parsed = listSchedulesQuerySchema.parse(query);
  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (parsed.schedule_type) {
    filter.schedule_type = parsed.schedule_type;
  }
  if (parsed.status) {
    filter.status = parsed.status;
  }
  if (parsed.semester) {
    filter.semester = parsed.semester;
  }
  if (parsed.day) {
    filter.day = parsed.day;
  }

  const limit = parsed.limit ?? 100;
  const page = parsed.page ?? 1;
  const skip = (page - 1) * limit;
  const [schedules, total] = await Promise.all([
    Schedule.find(filter)
      .select(
        "_id schedule_type course_id faculty_id room_id day date start_time end_time semester section status created_at updated_at",
      )
      .sort({ day: 1, start_time: 1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Schedule.countDocuments(filter),
  ]);

  return {
    schedules,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

function scheduleSlot(schedule: {
  day?: string;
  date?: Date | string | null;
  start_time?: string;
  end_time?: string;
  room_id?: unknown;
  faculty_id?: unknown;
  status?: string;
}) {
  return {
    day: schedule.day,
    date: schedule.date,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    room_id: schedule.room_id ? String(schedule.room_id) : null,
    faculty_id: schedule.faculty_id ? String(schedule.faculty_id) : null,
    status: schedule.status,
  };
}

export async function getScheduleById(scheduleId: string) {
  await connectToDatabase();
  return Schedule.findById(requireObjectId(scheduleId, "schedule id")).lean();
}

export async function updateSchedule(
  requester: { userId: string; role: AppRole },
  scheduleId: string,
  payload: z.infer<typeof updateScheduleSchema>,
) {
  if (!canManageSchedules(requester.role)) {
    throw new Error("Only admin can update schedules.");
  }

  const parsed = updateScheduleSchema.parse(payload);
  await connectToDatabase();

  const existing = await Schedule.findById(requireObjectId(scheduleId, "schedule id"));
  if (!existing) return null;

  const oldSlot = scheduleSlot(existing);
  const nextPayload = {
    schedule_type: parsed.schedule_type ?? existing.schedule_type,
    course_id: parsed.course_id ?? String(existing.course_id),
    faculty_id: parsed.faculty_id ?? String(existing.faculty_id),
    room_id: parsed.room_id ?? String(existing.room_id),
    day: parsed.day ?? existing.day,
    date:
      parsed.date !== undefined
        ? parsed.date
        : existing.date
          ? existing.date.toISOString()
          : null,
    start_time: parsed.start_time ?? existing.start_time,
    end_time: parsed.end_time ?? existing.end_time,
    semester: parsed.semester ?? existing.semester,
    section: parsed.section ?? existing.section,
    status: parsed.status ?? existing.status,
    allow_conflicts: parsed.allow_conflicts ?? false,
  };

  const warnings = await detectConflicts(nextPayload);
  const filteredWarnings = warnings.filter(
    (warning) => warning.conflicting_schedule_id !== String(existing._id),
  );
  if (filteredWarnings.length > 0 && !nextPayload.allow_conflicts) {
    throw new ScheduleConflictError(filteredWarnings);
  }

  if (parsed.schedule_type !== undefined) existing.schedule_type = parsed.schedule_type;
  if (parsed.course_id !== undefined) existing.course_id = requireObjectId(parsed.course_id, "course_id");
  if (parsed.faculty_id !== undefined) existing.faculty_id = requireObjectId(parsed.faculty_id, "faculty_id");
  if (parsed.room_id !== undefined) existing.room_id = requireObjectId(parsed.room_id, "room_id");
  if (parsed.day !== undefined) existing.day = parsed.day;
  if (parsed.date !== undefined) existing.date = parsed.date ? new Date(parsed.date) : null;
  if (parsed.start_time !== undefined) existing.start_time = parsed.start_time;
  if (parsed.end_time !== undefined) existing.end_time = parsed.end_time;
  if (parsed.semester !== undefined) existing.semester = parsed.semester;
  if (parsed.section !== undefined) existing.section = parsed.section;
  if (parsed.status !== undefined) existing.status = parsed.status;

  await existing.save();

  await ScheduleChangeLog.create({
    schedule_id: existing._id,
    reason: parsed.reason,
    old_slot: oldSlot,
    new_slot: scheduleSlot(existing),
    changed_by: requireObjectId(requester.userId, "user id"),
  });

  try {
    const facultyProfile = await Faculty.findById(existing.faculty_id)
      .select("user_id")
      .lean<{ user_id: Types.ObjectId } | null>();
    if (facultyProfile) {
      await notifyScheduleChange({
        faculty_user_id: String(facultyProfile.user_id),
        schedule_id: String(existing._id),
        message: `A schedule (${existing.schedule_type}) was updated for ${existing.day}.`,
      });
    }
  } catch {
    // Notification failure should not block schedule update.
  }

  return { schedule: existing.toObject(), warnings: filteredWarnings };
}

export async function deleteSchedule(requester: { role: AppRole }, scheduleId: string) {
  if (!canManageSchedules(requester.role)) {
    throw new Error("Only admin can delete schedules.");
  }
  await connectToDatabase();
  return Schedule.findByIdAndDelete(requireObjectId(scheduleId, "schedule id")).lean();
}
