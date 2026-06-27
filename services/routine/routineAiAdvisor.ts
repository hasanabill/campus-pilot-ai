import { z } from "zod";

import { extractStructured } from "@/services/aiService";
import type { RoutineAiAdvice, RoutineSolverResult } from "@/services/routine/routineTypes";

const routineAiAdviceSchema = z.object({
  summary: z.string(),
  likely_causes: z.array(z.string()).default([]),
  suggested_relaxations: z.array(z.string()).default([]),
  risk_notes: z.array(z.string()).default([]),
});

export async function explainRoutineResult(params: {
  result: RoutineSolverResult;
  context: { semester: string; batch_count: number; section_count: number; class_count: number };
}): Promise<RoutineAiAdvice> {
  const fallback: RoutineAiAdvice = {
    summary:
      params.result.violations.length > 0
        ? "The routine generator could not satisfy every hard rule with the provided inputs."
        : "The routine generator produced a valid draft routine under the configured rules.",
    likely_causes: params.result.violations,
    suggested_relaxations:
      params.result.violations.length > 0
        ? ["Add more available slots or rooms.", "Reduce the number of required classes.", "Relax active-day or consecutive-class limits."]
        : [],
    risk_notes: params.result.warnings,
  };

  try {
    return await extractStructured({
      schema: routineAiAdviceSchema,
      system:
        "You explain academic class routine generation results. Be concise, practical, and never claim the routine is valid if violations exist. Return JSON only.",
      user: JSON.stringify({
        context: params.context,
        score: params.result.score,
        violations: params.result.violations,
        warnings: params.result.warnings,
        stats: params.result.stats,
      }),
    });
  } catch {
    return fallback;
  }
}
