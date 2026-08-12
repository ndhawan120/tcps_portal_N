import { ACCA_EXAMS } from "@/lib/accaExams";

export const TOTAL_OBJECTIVES = 22;
export const TOTAL_EXAMS = 13;

/**
 * ACCA has 15 modules in the tracker, but only 13 papers count toward
 * completion: 11 compulsory papers + 2 of the 4 Strategic Professional
 * options. Extra optional passes should not push progress above 13/13.
 */
export function countPassedExams(
  exams: Array<{ exam_module?: string | null; status?: string | null; result?: string | null }>
) {
  const requiredPassed = exams.filter((exam) => {
    const definition = ACCA_EXAMS.find((item) => item.name === exam.exam_module);
    if (definition?.optional) return false;
    return exam.status === "passed" || exam.result?.toLowerCase() === "pass";
  }).length;

  const optionalPassed = exams.filter((exam) => {
    const definition = ACCA_EXAMS.find((item) => item.name === exam.exam_module);
    if (!definition?.optional) return false;
    return exam.status === "passed" || exam.result?.toLowerCase() === "pass";
  }).length;

  return Math.min(TOTAL_EXAMS, requiredPassed + Math.min(2, optionalPassed));
}

export function examProgressPercentage(exams: Parameters<typeof countPassedExams>[0]) {
  return Math.round((countPassedExams(exams) / TOTAL_EXAMS) * 100);
}
