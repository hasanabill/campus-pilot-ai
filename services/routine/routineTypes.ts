export type RoutineRuleSet = {
  working_days: string[];
  time_slots: Array<{ start: string; end: string }>;
  min_days_per_section: number;
  max_days_per_section: number;
  min_classes_per_active_day: number;
  max_teacher_consecutive_classes: number;
  max_section_consecutive_classes: number;
  classes_per_course_per_week: number;
};

export type RoutineInputAssignment = {
  course_id: string;
  faculty_id: string;
  weekly_classes: number;
};

export type RoutineInputSection = {
  name: string;
  assignments: RoutineInputAssignment[];
};

export type RoutineInputBatch = {
  name: string;
  sections: RoutineInputSection[];
};

export type RoutineGenerateInput = {
  department_id?: string;
  semester: string;
  batches: RoutineInputBatch[];
  room_ids: string[];
  rules: RoutineRuleSet;
  use_ai_explanation?: boolean;
};

export type RoutineSession = {
  session_id: string;
  batch_id: string;
  batch_name: string;
  section_id: string;
  section_name: string;
  course_id: string;
  course_code?: string;
  course_name?: string;
  faculty_id: string;
  faculty_name?: string;
};

export type RoutineRoom = {
  room_id: string;
  room_code?: string;
};

export type ScheduledRoutineClass = RoutineSession & {
  room_id: string;
  room_code?: string;
  day: string;
  start_time: string;
  end_time: string;
  slot_index: number;
};

export type RoutineStats = {
  section_day_loads: Record<string, Record<string, number>>;
  teacher_day_loads: Record<string, Record<string, number>>;
  room_day_loads: Record<string, Record<string, number>>;
};

export type RoutineSolverResult = {
  slots: ScheduledRoutineClass[];
  violations: string[];
  warnings: string[];
  score: number;
  stats: RoutineStats;
};

export type RoutineAiAdvice = {
  summary: string;
  likely_causes: string[];
  suggested_relaxations: string[];
  risk_notes: string[];
};
