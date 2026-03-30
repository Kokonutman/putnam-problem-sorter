import type { PracticeRecord, PracticeStatus, PutnamStatRow } from "@/lib/types";

export const PRACTICE_STATUSES: PracticeStatus[] = [
  "unattempted",
  "attempted",
  "partially_solved",
  "solved",
  "solved_with_hint",
  "solved_after_reading_solution",
  "abandoned",
  "archived",
];

const STATUS_WEIGHT: Record<PracticeStatus, number> = {
  unattempted: 0,
  attempted: 0.22,
  partially_solved: 0.46,
  solved: 1,
  solved_with_hint: 0.82,
  solved_after_reading_solution: 0.66,
  abandoned: 0.1,
  archived: 1,
};

const ACTIVE_STATUSES = new Set<PracticeStatus>(["attempted", "partially_solved"]);
const SOLVED_STATUSES = new Set<PracticeStatus>(["solved", "solved_with_hint", "solved_after_reading_solution", "archived"]);

export function problemKey(year: number, problem: string) {
  return `${year}-${problem}`;
}

export function difficultyScore(row: PutnamStatRow) {
  const score =
    0.45 * (1 - row.perfect_solve_rate) +
    0.25 * (1 - row.nonzero_score_rate) +
    0.1 * (1 - row.attempted_rate) +
    0.2 * (1 - row.average_score / 10);
  return Math.max(0, Math.min(100, score * 100));
}

function recencyWeight(record: PracticeRecord) {
  if (!record.last_attempted_at) return 0.9;
  const then = new Date(record.last_attempted_at).getTime();
  if (Number.isNaN(then)) return 0.9;
  const ageDays = (Date.now() - then) / (1000 * 60 * 60 * 24);
  if (ageDays <= 14) return 1.12;
  if (ageDays <= 45) return 1.04;
  if (ageDays <= 120) return 1;
  return 0.9;
}

export function estimateCurrentLevel(rows: PutnamStatRow[], records: PracticeRecord[]) {
  const difficultyByKey = new Map(rows.map((row) => [problemKey(row.year, row.problem), difficultyScore(row)]));
  const weighted = records
    .map((record) => {
      const difficulty = difficultyByKey.get(record.problem_key);
      if (difficulty === undefined) return null;
      const weight = STATUS_WEIGHT[record.status] * recencyWeight(record);
      return { difficulty, weight };
    })
    .filter((entry): entry is { difficulty: number; weight: number } => entry !== null && entry.weight > 0)
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, 12);

  if (weighted.length === 0) {
    const baseline = rows.map(difficultyScore).sort((a, b) => a - b);
    return baseline[Math.floor(baseline.length * 0.35)] ?? 35;
  }

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  return weighted.reduce((sum, entry) => sum + entry.difficulty * entry.weight, 0) / totalWeight;
}

export function recommendationBucket(difficulty: number, level: number) {
  const delta = difficulty - level;
  if (delta <= -6) return "confidence";
  if (delta <= 7) return "on_level";
  return "stretch";
}

export function isSolvedStatus(status: PracticeStatus) {
  return SOLVED_STATUSES.has(status);
}

export function isActiveStatus(status: PracticeStatus) {
  return ACTIVE_STATUSES.has(status);
}
