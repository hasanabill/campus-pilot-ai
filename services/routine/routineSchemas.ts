import { Types } from "mongoose";
import { z } from "zod";

const objectIdString = z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid ObjectId.");

export const routineRuleSetSchema = z.object({
  working_days: z.array(z.string().min(2).max(40)).min(3).max(7),
  time_slots: z
    .array(
      z.object({
        start: z.string().min(3).max(12),
        end: z.string().min(3).max(12),
      }),
    )
    .min(2)
    .max(12),
  min_days_per_section: z.number().int().min(1).max(7).default(3),
  max_days_per_section: z.number().int().min(1).max(7).default(4),
  min_classes_per_active_day: z.number().int().min(1).max(8).default(2),
  max_teacher_consecutive_classes: z.number().int().min(1).max(8).default(2),
  max_section_consecutive_classes: z.number().int().min(1).max(8).default(2),
  classes_per_course_per_week: z.number().int().min(1).max(6).default(2),
});

export const routineInputAssignmentSchema = z.object({
  course_id: objectIdString,
  faculty_id: objectIdString,
  weekly_classes: z.number().int().min(1).max(6).optional(),
});

export const routineInputSectionSchema = z.object({
  name: z.string().min(1).max(40),
  assignments: z.array(routineInputAssignmentSchema).min(1),
});

export const routineInputBatchSchema = z.object({
  name: z.string().min(1).max(80),
  sections: z.array(routineInputSectionSchema).min(1),
});

export const routineGenerateSchema = z.object({
  department_id: objectIdString.optional(),
  semester: z.string().min(1).max(80),
  batches: z.array(routineInputBatchSchema).min(1),
  room_ids: z.array(objectIdString).min(1),
  rules: routineRuleSetSchema,
  use_ai_explanation: z.boolean().optional().default(true),
});

export const routineApplySchema = z.object({
  routine_id: objectIdString,
  apply_as: z.enum(["draft", "published"]).optional().default("draft"),
});

export const routineExplainSchema = z.object({
  routine_id: objectIdString,
});

export type RoutineGeneratePayload = z.infer<typeof routineGenerateSchema>;
export type RoutineApplyPayload = z.infer<typeof routineApplySchema>;
