import { scoreRoutine } from "@/services/routine/routineScoring";
import type {
  RoutineRoom,
  RoutineRuleSet,
  RoutineSession,
  RoutineSolverResult,
  RoutineStats,
  ScheduledRoutineClass,
} from "@/services/routine/routineTypes";

type OccupancyState = {
  teacherSlots: Set<string>;
  sectionSlots: Set<string>;
  roomSlots: Set<string>;
  courseDays: Set<string>;
  sectionDayIndexes: Map<string, Set<number>>;
  teacherDayIndexes: Map<string, Set<number>>;
};

function cloneState(state: OccupancyState): OccupancyState {
  return {
    teacherSlots: new Set(state.teacherSlots),
    sectionSlots: new Set(state.sectionSlots),
    roomSlots: new Set(state.roomSlots),
    courseDays: new Set(state.courseDays),
    sectionDayIndexes: new Map(Array.from(state.sectionDayIndexes.entries()).map(([k, v]) => [k, new Set(v)])),
    teacherDayIndexes: new Map(Array.from(state.teacherDayIndexes.entries()).map(([k, v]) => [k, new Set(v)])),
  };
}

function hasRunLongerThan(indexes: Set<number>, nextIndex: number, maxConsecutive: number): boolean {
  const next = new Set(indexes);
  next.add(nextIndex);
  const sorted = Array.from(next).sort((a, b) => a - b);
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === sorted[i - 1] + 1) {
      run += 1;
      if (run > maxConsecutive) return true;
    } else {
      run = 1;
    }
  }
  return false;
}

function canPlace(params: {
  session: RoutineSession;
  room: RoutineRoom;
  day: string;
  slotIndex: number;
  state: OccupancyState;
  rules: RoutineRuleSet;
}): boolean {
  const { session, room, day, slotIndex, state, rules } = params;
  const teacherKey = `${session.faculty_id}|${day}|${slotIndex}`;
  const sectionKey = `${session.section_id}|${day}|${slotIndex}`;
  const roomKey = `${room.room_id}|${day}|${slotIndex}`;
  const courseDayKey = `${session.section_id}|${session.course_id}|${day}`;

  if (state.teacherSlots.has(teacherKey) || state.sectionSlots.has(sectionKey) || state.roomSlots.has(roomKey)) {
    return false;
  }
  // Keep two weekly meetings of the same section-course on different days.
  if (state.courseDays.has(courseDayKey)) return false;

  const sectionDayKey = `${session.section_id}|${day}`;
  const teacherDayKey = `${session.faculty_id}|${day}`;
  if (
    hasRunLongerThan(
      state.sectionDayIndexes.get(sectionDayKey) ?? new Set<number>(),
      slotIndex,
      rules.max_section_consecutive_classes,
    )
  ) {
    return false;
  }
  if (
    hasRunLongerThan(
      state.teacherDayIndexes.get(teacherDayKey) ?? new Set<number>(),
      slotIndex,
      rules.max_teacher_consecutive_classes,
    )
  ) {
    return false;
  }

  return true;
}

function markPlaced(
  state: OccupancyState,
  slot: ScheduledRoutineClass,
): OccupancyState {
  const next = cloneState(state);
  next.teacherSlots.add(`${slot.faculty_id}|${slot.day}|${slot.slot_index}`);
  next.sectionSlots.add(`${slot.section_id}|${slot.day}|${slot.slot_index}`);
  next.roomSlots.add(`${slot.room_id}|${slot.day}|${slot.slot_index}`);
  next.courseDays.add(`${slot.section_id}|${slot.course_id}|${slot.day}`);

  const sectionDayKey = `${slot.section_id}|${slot.day}`;
  const teacherDayKey = `${slot.faculty_id}|${slot.day}`;
  next.sectionDayIndexes.set(sectionDayKey, new Set([...(next.sectionDayIndexes.get(sectionDayKey) ?? []), slot.slot_index]));
  next.teacherDayIndexes.set(teacherDayKey, new Set([...(next.teacherDayIndexes.get(teacherDayKey) ?? []), slot.slot_index]));
  return next;
}

function buildStats(slots: ScheduledRoutineClass[]): RoutineStats {
  const section_day_loads: RoutineStats["section_day_loads"] = {};
  const teacher_day_loads: RoutineStats["teacher_day_loads"] = {};
  const room_day_loads: RoutineStats["room_day_loads"] = {};
  for (const slot of slots) {
    section_day_loads[slot.section_name] ??= {};
    teacher_day_loads[slot.faculty_name ?? slot.faculty_id] ??= {};
    room_day_loads[slot.room_code ?? slot.room_id] ??= {};
    section_day_loads[slot.section_name][slot.day] = (section_day_loads[slot.section_name][slot.day] ?? 0) + 1;
    teacher_day_loads[slot.faculty_name ?? slot.faculty_id][slot.day] =
      (teacher_day_loads[slot.faculty_name ?? slot.faculty_id][slot.day] ?? 0) + 1;
    room_day_loads[slot.room_code ?? slot.room_id][slot.day] = (room_day_loads[slot.room_code ?? slot.room_id][slot.day] ?? 0) + 1;
  }
  return { section_day_loads, teacher_day_loads, room_day_loads };
}

function validateFinalActiveDays(slots: ScheduledRoutineClass[], rules: RoutineRuleSet): string[] {
  const violations: string[] = [];
  const sectionDayCounts = new Map<string, Map<string, number>>();
  for (const slot of slots) {
    const dayCounts = sectionDayCounts.get(slot.section_id) ?? new Map<string, number>();
    dayCounts.set(slot.day, (dayCounts.get(slot.day) ?? 0) + 1);
    sectionDayCounts.set(slot.section_id, dayCounts);
  }

  for (const [sectionId, dayCounts] of sectionDayCounts.entries()) {
    const activeDays = Array.from(dayCounts.entries()).filter(([, count]) => count > 0);
    if (activeDays.length < rules.min_days_per_section || activeDays.length > rules.max_days_per_section) {
      violations.push(
        `Section ${sectionId} has ${activeDays.length} active day(s); required ${rules.min_days_per_section}-${rules.max_days_per_section}.`,
      );
    }
    for (const [day, count] of activeDays) {
      if (count < rules.min_classes_per_active_day) {
        violations.push(
          `Section ${sectionId} has only ${count} class(es) on ${day}; minimum is ${rules.min_classes_per_active_day}.`,
        );
      }
    }
  }
  return violations;
}

function candidateOrder(params: {
  session: RoutineSession;
  rules: RoutineRuleSet;
  rooms: RoutineRoom[];
  state: OccupancyState;
}) {
  const { rules, rooms } = params;
  const candidates: Array<{ day: string; slotIndex: number; room: RoutineRoom }> = [];
  for (const day of rules.working_days) {
    for (let slotIndex = 0; slotIndex < rules.time_slots.length; slotIndex += 1) {
      for (const room of rooms) {
        candidates.push({ day, slotIndex, room });
      }
    }
  }
  return candidates;
}

export function solveRoutine(params: {
  sessions: RoutineSession[];
  rooms: RoutineRoom[];
  rules: RoutineRuleSet;
}): RoutineSolverResult {
  const { sessions, rooms, rules } = params;
  const sortedSessions = [...sessions].sort((a, b) => {
    const teacherA = sessions.filter((s) => s.faculty_id === a.faculty_id).length;
    const teacherB = sessions.filter((s) => s.faculty_id === b.faculty_id).length;
    const sectionA = sessions.filter((s) => s.section_id === a.section_id).length;
    const sectionB = sessions.filter((s) => s.section_id === b.section_id).length;
    return teacherB + sectionB - (teacherA + sectionA);
  });

  let best: ScheduledRoutineClass[] = [];
  let bestComplete: ScheduledRoutineClass[] | null = null;
  let explored = 0;
  const maxExplored = 80_000;

  function backtrack(index: number, placed: ScheduledRoutineClass[], state: OccupancyState): boolean {
    explored += 1;
    if (placed.length > best.length) best = placed;
    if (explored > maxExplored) return false;
    if (index >= sortedSessions.length) {
      const finalViolations = validateFinalActiveDays(placed, rules);
      if (finalViolations.length === 0) {
        bestComplete = placed;
        return true;
      }
      return false;
    }

    const session = sortedSessions[index];
    const candidates = candidateOrder({ session, rules, rooms, state });
    for (const candidate of candidates) {
      if (!canPlace({ session, room: candidate.room, day: candidate.day, slotIndex: candidate.slotIndex, state, rules })) {
        continue;
      }
      const block = rules.time_slots[candidate.slotIndex];
      const slot: ScheduledRoutineClass = {
        ...session,
        room_id: candidate.room.room_id,
        room_code: candidate.room.room_code,
        day: candidate.day,
        start_time: block.start,
        end_time: block.end,
        slot_index: candidate.slotIndex,
      };
      if (backtrack(index + 1, [...placed, slot], markPlaced(state, slot))) {
        return true;
      }
    }
    return false;
  }

  backtrack(0, [], {
    teacherSlots: new Set(),
    sectionSlots: new Set(),
    roomSlots: new Set(),
    courseDays: new Set(),
    sectionDayIndexes: new Map(),
    teacherDayIndexes: new Map(),
  });

  const resultSlots = bestComplete ?? best;
  const violations =
    bestComplete !== null
      ? []
      : [
          `Unable to place all classes. Placed ${best.length}/${sessions.length} session(s).`,
          ...validateFinalActiveDays(best, rules),
        ];
  const warnings = explored > maxExplored ? ["Search limit reached; routine may be partial."] : [];
  return {
    slots: resultSlots,
    violations,
    warnings,
    score: scoreRoutine(resultSlots, rules),
    stats: buildStats(resultSlots),
  };
}
