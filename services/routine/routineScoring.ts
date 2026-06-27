import type { RoutineRuleSet, ScheduledRoutineClass } from "@/services/routine/routineTypes";

function dayLoadVariance(loads: number[]): number {
  if (loads.length === 0) return 0;
  const avg = loads.reduce((sum, value) => sum + value, 0) / loads.length;
  return loads.reduce((sum, value) => sum + Math.abs(value - avg), 0);
}

function countGaps(slotIndexes: number[]): number {
  if (slotIndexes.length <= 1) return 0;
  const sorted = [...slotIndexes].sort((a, b) => a - b);
  let gaps = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    gaps += Math.max(0, sorted[i] - sorted[i - 1] - 1);
  }
  return gaps;
}

export function scoreRoutine(slots: ScheduledRoutineClass[], rules: RoutineRuleSet): number {
  let score = 1000;
  const sectionDaySlots = new Map<string, number[]>();
  const teacherDaySlots = new Map<string, number[]>();
  const sectionDayCounts = new Map<string, number>();
  const teacherDayCounts = new Map<string, number>();
  const sectionRooms = new Map<string, Set<string>>();

  for (const slot of slots) {
    const sectionDayKey = `${slot.section_id}|${slot.day}`;
    const teacherDayKey = `${slot.faculty_id}|${slot.day}`;
    sectionDaySlots.set(sectionDayKey, [...(sectionDaySlots.get(sectionDayKey) ?? []), slot.slot_index]);
    teacherDaySlots.set(teacherDayKey, [...(teacherDaySlots.get(teacherDayKey) ?? []), slot.slot_index]);
    sectionDayCounts.set(sectionDayKey, (sectionDayCounts.get(sectionDayKey) ?? 0) + 1);
    teacherDayCounts.set(teacherDayKey, (teacherDayCounts.get(teacherDayKey) ?? 0) + 1);
    const rooms = sectionRooms.get(slot.section_id) ?? new Set<string>();
    rooms.add(slot.room_id);
    sectionRooms.set(slot.section_id, rooms);

    // Slightly prefer earlier slots when other constraints are equal.
    score -= slot.slot_index * 0.05;
  }

  for (const indexes of sectionDaySlots.values()) score -= countGaps(indexes) * 2;
  for (const indexes of teacherDaySlots.values()) score -= countGaps(indexes) * 1.2;

  const sections = Array.from(new Set(slots.map((slot) => slot.section_id)));
  for (const sectionId of sections) {
    const loads = rules.working_days.map((day) => sectionDayCounts.get(`${sectionId}|${day}`) ?? 0).filter(Boolean);
    score -= dayLoadVariance(loads) * 1.5;
    score -= Math.max(0, (sectionRooms.get(sectionId)?.size ?? 1) - 1) * 0.5;
  }

  const teachers = Array.from(new Set(slots.map((slot) => slot.faculty_id)));
  for (const facultyId of teachers) {
    const loads = rules.working_days.map((day) => teacherDayCounts.get(`${facultyId}|${day}`) ?? 0).filter(Boolean);
    score -= dayLoadVariance(loads);
  }

  return Number(score.toFixed(2));
}
