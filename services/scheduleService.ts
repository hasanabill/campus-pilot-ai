import { Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import Faculty from "@/models/Faculty";
import Schedule from "@/models/Schedule";
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
  const schedules = await Schedule.find(filter)
    .sort({ day: 1, start_time: 1, created_at: -1 })
    .limit(limit)
    .lean();

  return schedules;
}
