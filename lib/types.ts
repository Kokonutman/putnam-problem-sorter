export const PROBLEMS = ["A1", "A2", "A3", "A4", "A5", "A6", "B1", "B2", "B3", "B4", "B5", "B6"] as const;

export const METRICS = [
  "perfect_solve_rate",
  "nonzero_score_rate",
  "attempted_rate",
  "average_score",
  "average_score_among_attempts",
] as const;

export type ProblemId = (typeof PROBLEMS)[number];
export type MetricKey = (typeof METRICS)[number];
export type PracticeStatus =
  | "unattempted"
  | "attempted"
  | "partially_solved"
  | "solved"
  | "solved_with_hint"
  | "solved_after_reading_solution"
  | "abandoned"
  | "archived";

export type PutnamStatRow = {
  year: number;
  population_top_n: number;
  problem: ProblemId;
  perfect_solve_count: number;
  perfect_solve_rate: number;
  nonzero_score_count: number;
  nonzero_score_rate: number;
  attempted_count: number;
  attempted_rate: number;
  average_score: number;
  average_score_among_attempts: number;
};

export type ProblemMetadata = {
  year: number;
  problem: ProblemId;
  primary_topic?: string | null;
  secondary_topics?: string[];
  techniques?: string[];
};

export type PracticeRecord = {
  problem_key: string;
  year: number;
  problem: ProblemId;
  status: PracticeStatus;
  last_attempted_at: string | null;
  total_minutes: number;
  attempt_count: number;
  notes: string;
};

export type PutnamDataset = {
  rows: PutnamStatRow[];
  metadataByKey: Record<string, ProblemMetadata>;
  sourcePath: string;
  missing: boolean;
};
