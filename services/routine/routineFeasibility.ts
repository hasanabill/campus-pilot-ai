import type { RoutineRuleSet, RoutineSession } from "@/services/routine/routineTypes";

function maxClassesWithoutConsecutiveRun(slotCount: number, maxConsecutive: number): number {
  if (slotCount <= 0) return 0;
  if (maxConsecutive <= 0) return 0;
  const fullBlocks = Math.floor(slotCount / (maxConsecutive + 1));
  const remainder = slotCount % (maxConsecutive + 1);
  return fullBlocks * maxConsecutive + Math.min(remainder, maxConsecutive);
}

export function validateRoutineFeasibility(params: {
  sessions: RoutineSession[];
  roomCount: number;
  rules: RoutineRuleSet;
}): string[] {
  const { sessions, roomCount, rules } = params;
  const violations: string[] = [];
  const sectionTotals = new Map<string, number>();
  const teacherTotals = new Map<string, number>();

  if (roomCount <= 0) {
    violations.push("At least one active room is required.");
  }
  if (rules.min_days_per_section > rules.max_days_per_section) {
    violations.push("Minimum active days cannot be greater than maximum active days.");
  }
  if (rules.working_days.length < rules.min_days_per_section) {
    violations.push("Working days are fewer than required minimum section days.");
  }
  if (rules.time_slots.length === 0) {
    violations.push("At least one time slot is required.");
  }

  for (const session of sessions) {
    sectionTotals.set(session.section_id, (sectionTotals.get(session.section_id) ?? 0) + 1);
    teacherTotals.set(session.faculty_id, (teacherTotals.get(session.faculty_id) ?? 0) + 1);
  }

  const maxSectionClassesPerDay = maxClassesWithoutConsecutiveRun(
    rules.time_slots.length,
    rules.max_section_consecutive_classes,
  );
  const maxTeacherClassesPerDay = maxClassesWithoutConsecutiveRun(
    rules.time_slots.length,
    rules.max_teacher_consecutive_classes,
  );

  for (const [sectionId, total] of sectionTotals) {
    const minRequired = rules.min_days_per_section * rules.min_classes_per_active_day;
    const maxPossible = rules.max_days_per_section * maxSectionClassesPerDay;
    if (total < minRequired) {
      violations.push(
        `Section ${sectionId} needs ${total} class(es), but the active-day rule requires at least ${minRequired}. Add courses or relax min days/classes.`,
      );
    }
    if (total > maxPossible) {
      violations.push(
        `Section ${sectionId} needs ${total} class(es), but the current day/consecutive rules allow at most ${maxPossible}. Add slots/days or relax rules.`,
      );
    }
  }

  const teacherWeeklyCapacity = rules.working_days.length * maxTeacherClassesPerDay;
  for (const [facultyId, total] of teacherTotals) {
    if (total > teacherWeeklyCapacity) {
      violations.push(
        `Teacher ${facultyId} needs ${total} class(es), exceeding weekly capacity ${teacherWeeklyCapacity} under consecutive limits.`,
      );
    }
  }

  const simultaneousCapacity = roomCount * rules.working_days.length * rules.time_slots.length;
  if (sessions.length > simultaneousCapacity) {
    violations.push(
      `The routine needs ${sessions.length} class placements, but rooms/days/slots provide only ${simultaneousCapacity} placements.`,
    );
  }

  return violations;
}
