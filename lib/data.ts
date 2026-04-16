import { readFile } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import { PROBLEMS, type ProblemId, type ProblemMetadata, type PutnamDataset, type PutnamStatRow } from "@/lib/types";

const DATASET_FILENAME = "putnam_problem_stats_all_years.csv";
const METADATA_FILENAME = "putnam_problem_metadata.json";
const ARCHIVE_START_YEAR = 1985;
const ARCHIVE_END_YEAR = 2025;
const ESTIMATE_SOURCE_YEARS = new Set([1985, 1986, 1987, 1988, 1995, 1996, 1997, 1998, 1999]);

type RawRow = Record<string, string | number>;

function parseNumber(value: string | number, field: string, row: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid numeric value for ${field} on row ${row + 2}`);
  }
  return numeric;
}

function normalizeRow(raw: RawRow, rowIndex: number): PutnamStatRow {
  const problem = String(raw.problem).trim().toUpperCase() as ProblemId;
  if (!PROBLEMS.includes(problem)) {
    throw new Error(`Invalid problem label "${raw.problem}" on row ${rowIndex + 2}`);
  }

  return {
    year: parseNumber(raw.year, "year", rowIndex),
    population_top_n: parseNumber(raw.population_top_n, "population_top_n", rowIndex),
    problem,
    perfect_solve_count: parseNumber(raw.perfect_solve_count, "perfect_solve_count", rowIndex),
    perfect_solve_rate: parseNumber(raw.perfect_solve_rate, "perfect_solve_rate", rowIndex),
    nonzero_score_count: parseNumber(raw.nonzero_score_count, "nonzero_score_count", rowIndex),
    nonzero_score_rate: parseNumber(raw.nonzero_score_rate, "nonzero_score_rate", rowIndex),
    attempted_count: parseNumber(raw.attempted_count, "attempted_count", rowIndex),
    attempted_rate: parseNumber(raw.attempted_rate, "attempted_rate", rowIndex),
    average_score: parseNumber(raw.average_score, "average_score", rowIndex),
    average_score_among_attempts: parseNumber(raw.average_score_among_attempts, "average_score_among_attempts", rowIndex),
    stats_source: "actual",
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildArchiveRows(rows: PutnamStatRow[]) {
  const existing = new Map(rows.map((row) => [`${row.year}-${row.problem}`, row]));
  const estimateRows = rows.filter((row) => ESTIMATE_SOURCE_YEARS.has(row.year));

  const estimateByProblem = new Map(
    PROBLEMS.map((problem) => {
      const problemRows = estimateRows.filter((row) => row.problem === problem);
      const population = Math.max(1, Math.round(average(problemRows.map((row) => row.population_top_n))));
      const perfectSolveRate = average(problemRows.map((row) => row.perfect_solve_rate));
      const nonzeroScoreRate = average(problemRows.map((row) => row.nonzero_score_rate));
      const attemptedRate = average(problemRows.map((row) => row.attempted_rate));
      const averageScore = average(problemRows.map((row) => row.average_score));
      return [
        problem,
        {
          population_top_n: population,
          perfect_solve_count: Math.round(perfectSolveRate * population),
          perfect_solve_rate: perfectSolveRate,
          nonzero_score_count: Math.round(nonzeroScoreRate * population),
          nonzero_score_rate: nonzeroScoreRate,
          attempted_count: Math.round(attemptedRate * population),
          attempted_rate: attemptedRate,
          average_score: averageScore,
          average_score_among_attempts: average(problemRows.map((row) => row.average_score_among_attempts)),
        },
      ] as const;
    })
  );

  const archiveRows: PutnamStatRow[] = [];
  for (let year = ARCHIVE_START_YEAR; year <= ARCHIVE_END_YEAR; year += 1) {
    for (const problem of PROBLEMS) {
      const key = `${year}-${problem}`;
      const actual = existing.get(key);
      if (actual) {
        archiveRows.push(actual);
        continue;
      }

      const estimate = estimateByProblem.get(problem);
      if (!estimate) continue;
      archiveRows.push({
        year,
        problem,
        ...estimate,
        stats_source: "estimated",
      });
    }
  }

  return archiveRows;
}

export async function loadPutnamDataset(): Promise<PutnamDataset> {
  const sourcePath = path.join(process.cwd(), DATASET_FILENAME);
  const metadataPath = path.join(process.cwd(), METADATA_FILENAME);

  try {
    const content = await readFile(sourcePath, "utf8");
    const parsed = Papa.parse<RawRow>(content, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      const first = parsed.errors[0];
      throw new Error(`CSV parse error at row ${first.row ?? "unknown"}: ${first.message}`);
    }

    const rows = parsed.data.map(normalizeRow).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return PROBLEMS.indexOf(a.problem) - PROBLEMS.indexOf(b.problem);
    });

    let metadataByKey: Record<string, ProblemMetadata> = {};
    try {
      const metadataText = await readFile(metadataPath, "utf8");
      const parsedMetadata = JSON.parse(metadataText) as ProblemMetadata[];
      metadataByKey = Object.fromEntries(
        parsedMetadata
          .filter((entry) => entry && PROBLEMS.includes(entry.problem))
          .map((entry) => [`${entry.year}-${entry.problem}`, entry])
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    return { rows, archiveRows: buildArchiveRows(rows), metadataByKey, sourcePath, missing: false };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { rows: [], archiveRows: [], metadataByKey: {}, sourcePath, missing: true };
    }
    throw error;
  }
}
