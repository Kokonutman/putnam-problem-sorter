
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./putnam-dashboard.module.css";
import {
  METRICS,
  PROBLEMS,
  type MetricKey,
  type PracticeRecord,
  type PracticeStatus,
  type ProblemId,
  type PutnamDataset,
  type PutnamStatRow,
} from "@/lib/types";
import {
  difficultyScore,
  estimateCurrentLevel,
  isActiveStatus,
  isSolvedStatus,
  PRACTICE_STATUSES,
  problemKey,
  recommendationBucket,
} from "@/lib/training";

const METRIC_META: Record<
  MetricKey,
  { label: string; short: string; format: (value: number) => string; domainMax: number; description: string }
> = {
  perfect_solve_rate: {
    label: "Perfect Solve Rate",
    short: "Perfect",
    format: (value) => `${(value * 100).toFixed(1)}%`,
    domainMax: 1,
    description: "Share of the published Top N earning a 10.",
  },
  nonzero_score_rate: {
    label: "Nonzero Score Rate",
    short: "Nonzero",
    format: (value) => `${(value * 100).toFixed(1)}%`,
    domainMax: 1,
    description: "Share of Top N earning any positive score.",
  },
  attempted_rate: {
    label: "Attempt Rate",
    short: "Attempt",
    format: (value) => `${(value * 100).toFixed(1)}%`,
    domainMax: 1,
    description: "Share of Top N with a non-NA submission.",
  },
  average_score: {
    label: "Average Score",
    short: "Average",
    format: (value) => value.toFixed(2),
    domainMax: 10,
    description: "Mean score over the published Top N population.",
  },
  average_score_among_attempts: {
    label: "Average Score Among Attempts",
    short: "Attempt Avg",
    format: (value) => value.toFixed(2),
    domainMax: 10,
    description: "Mean score conditional on non-NA attempts.",
  },
};

const PROBLEM_COLORS: Record<ProblemId, string> = {
  A1: "#8ef0ff",
  A2: "#76d9ff",
  A3: "#62c1ff",
  A4: "#5a9cff",
  A5: "#6887ff",
  A6: "#846fff",
  B1: "#ffbf61",
  B2: "#f6a75d",
  B3: "#ed8d5c",
  B4: "#ef765f",
  B5: "#f66168",
  B6: "#ff8b92",
};

type SuggestionSort = "easiest" | "toughest";
type PracticeState = {
  records: PracticeRecord[];
  storageMode: "supabase" | "memory";
};

type TrainingEntry = PutnamStatRow & {
  key: string;
  difficulty: number;
  record: PracticeRecord | null;
  status: PracticeStatus;
  metadata: PutnamDataset["metadataByKey"][string] | null;
};

function usePracticeState() {
  const [state, setState] = useState<PracticeState>({ records: [], storageMode: "memory" });
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/practice", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load practice records");
        const next = (await response.json()) as PracticeState;
        if (!active) return;
        setState(next);
        setError(null);
        setIsLoaded(true);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load practice records");
        setIsLoaded(true);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function mutate(body: { action: "upsert"; record: PracticeRecord } | { action: "delete"; problem_key: string }) {
    const response = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Failed to update practice records");
    }

    const next = (await response.json()) as PracticeState;
    setState(next);
    setError(null);
  }

  return {
    ...state,
    isLoaded,
    error,
    async save(record: PracticeRecord) {
      await mutate({ action: "upsert", record });
    },
    async remove(problem_key: string) {
      await mutate({ action: "delete", problem_key });
    },
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function metricValue(row: PutnamStatRow, metric: MetricKey) {
  return row[metric];
}

function groupAverage(rows: PutnamStatRow[], metric: MetricKey) {
  return average(rows.map((row) => metricValue(row, metric)));
}

function formatYearRange(start: number, end: number) {
  return start === end ? `${start}` : `${start}-${end}`;
}

function formatStatus(status: PracticeStatus | "confidence" | "on_level" | "stretch") {
  return status.replaceAll("_", " ");
}

function formatAttemptDate(value: string | null) {
  if (!value) return "No recorded attempt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function problemSetUrl(year: number) {
  return `https://kskedlaya.org/putnam-archive/${year}.pdf`;
}

function solutionUrl(year: number) {
  return `https://kskedlaya.org/putnam-archive/${year}s.pdf`;
}

function TooltipBody({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string | number;
  metric: MetricKey;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(127,230,255,0.18)", background: "rgba(5,10,15,0.92)", padding: "10px 12px" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", letterSpacing: "0.08em", color: "#9ab2cb" }}>{label}</div>
      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
        {payload.map((item, index) => (
          <div key={`${item.name}-${index}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: item.color ?? "#7fe6ff", display: "inline-block" }} />
            <span style={{ color: "#dce7f5", fontSize: "0.86rem" }}>{item.name}</span>
            <span style={{ marginLeft: "auto", color: "#f8fbff", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
              {METRIC_META[metric].format(Number(item.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PutnamDashboard({ dataset }: { dataset: PutnamDataset }) {
  if (dataset.missing || dataset.rows.length === 0) {
    return <MissingDatasetState />;
  }

  return <PutnamDashboardLoaded dataset={dataset} />;
}

function MissingDatasetState() {
  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden />
      <header className={styles.header}>
        <div className={styles.brand}>
          <p className={styles.eyebrow}>Static Dataset</p>
          <h1 className={styles.brandTitle}>Putnam Proof Trainer</h1>
        </div>
      </header>

      <section className={clsx(styles.emptyState, styles.animateIn)}>
        <p className={styles.eyebrow}>Dataset Missing</p>
        <h2 className={styles.heroTitle}>Add the offline Putnam dataset to this project.</h2>
        <p>This site only reads precomputed files. It does not scrape the archive, run Python, or regenerate data at runtime.</p>
        <p>Expected file: <span className={styles.code}>putnam_problem_stats_all_years.csv</span></p>
        <p>Optional metadata file: <span className={styles.code}>putnam_problem_metadata.json</span> for future topic tagging.</p>
      </section>

      <Footer />
    </main>
  );
}
function PutnamDashboardLoaded({ dataset }: { dataset: PutnamDataset }) {
  const years = useMemo(() => [...new Set(dataset.rows.map((row) => row.year))].sort((a, b) => a - b), [dataset.rows]);
  const [yearStart, setYearStart] = useState(years[0]);
  const [yearEnd, setYearEnd] = useState(years[years.length - 1]);
  const [metric, setMetric] = useState<MetricKey>("average_score");
  const [side, setSide] = useState<"all" | "A" | "B">("all");
  const [selectedProblems, setSelectedProblems] = useState<ProblemId[]>([...PROBLEMS]);
  const [suggestionSort, setSuggestionSort] = useState<SuggestionSort>("easiest");
  const [selectedPracticeKey, setSelectedPracticeKey] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { records, storageMode, isLoaded, error, save, remove } = usePracticeState();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const recordsByKey = useMemo(() => new Map(records.map((record) => [record.problem_key, record])), [records]);

  const visibleProblems = useMemo(() => {
    if (side === "all") return PROBLEMS;
    return PROBLEMS.filter((problem) => problem.startsWith(side)) as readonly ProblemId[];
  }, [side]);

  const activeProblems = useMemo(() => {
    const next = selectedProblems.filter((problem) => visibleProblems.includes(problem));
    return next.length > 0 ? next : [...visibleProblems];
  }, [selectedProblems, visibleProblems]);

  const filteredRows = useMemo(
    () => dataset.rows.filter((row) => row.year >= yearStart && row.year <= yearEnd && visibleProblems.includes(row.problem)),
    [dataset.rows, visibleProblems, yearEnd, yearStart]
  );

  const trainingRows = useMemo<TrainingEntry[]>(
    () =>
      dataset.rows
        .filter((row) => row.year >= yearStart && row.year <= yearEnd && activeProblems.includes(row.problem))
        .map((row) => {
          const key = problemKey(row.year, row.problem);
          const record = recordsByKey.get(key) ?? null;
          return {
            ...row,
            key,
            difficulty: difficultyScore(row),
            record,
            status: record?.status ?? "unattempted",
            metadata: dataset.metadataByKey[key] ?? null,
          };
        }),
    [activeProblems, dataset.metadataByKey, dataset.rows, recordsByKey, yearEnd, yearStart]
  );

  const metricMeta = METRIC_META[metric];
  const currentLevel = useMemo(() => estimateCurrentLevel(dataset.rows, records), [dataset.rows, records]);
  const solvedCount = useMemo(() => records.filter((record) => isSolvedStatus(record.status)).length, [records]);
  const activeCount = useMemo(() => records.filter((record) => isActiveStatus(record.status)).length, [records]);
  const partialCount = useMemo(() => records.filter((record) => record.status === "partially_solved").length, [records]);
  const attemptedCount = useMemo(() => records.filter((record) => record.status !== "unattempted").length, [records]);
  const totalHours = useMemo(() => records.reduce((sum, record) => sum + record.total_minutes, 0) / 60, [records]);

  const recentPractice = useMemo(
    () =>
      [...records]
        .sort((a, b) => (b.last_attempted_at ?? "").localeCompare(a.last_attempted_at ?? ""))
        .slice(0, 8),
    [records]
  );

  const recommendationGroups = useMemo(() => {
    const remaining = trainingRows.filter((entry) => !isSolvedStatus(entry.status) && entry.status !== "archived");
    const sorted = [...remaining].sort((a, b) => {
      const aDistance = Math.abs(a.difficulty - currentLevel);
      const bDistance = Math.abs(b.difficulty - currentLevel);

      if (suggestionSort === "easiest" && a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
      if (suggestionSort === "toughest" && a.difficulty !== b.difficulty) return b.difficulty - a.difficulty;
      if (aDistance !== bDistance) return aDistance - bDistance;
      if (a.year !== b.year) return b.year - a.year;
      return PROBLEMS.indexOf(a.problem) - PROBLEMS.indexOf(b.problem);
    });

    const buckets = {
      confidence: [] as TrainingEntry[],
      on_level: [] as TrainingEntry[],
      stretch: [] as TrainingEntry[],
    };

    for (const entry of sorted) {
      const bucket = recommendationBucket(entry.difficulty, currentLevel);
      if (buckets[bucket].length < 6) buckets[bucket].push(entry);
    }

    return buckets;
  }, [currentLevel, suggestionSort, trainingRows]);

  const selectedPracticeEntry =
    trainingRows.find((entry) => entry.key === selectedPracticeKey) ??
    recommendationGroups.on_level[0] ??
    recommendationGroups.confidence[0] ??
    recommendationGroups.stretch[0] ??
    trainingRows[0] ??
    null;

  const completedEntries = useMemo(
    () =>
      trainingRows
        .filter((entry) => isSolvedStatus(entry.status))
        .sort((a, b) => {
          const aDate = a.record?.last_attempted_at ?? "";
          const bDate = b.record?.last_attempted_at ?? "";
          return bDate.localeCompare(aDate) || b.year - a.year || PROBLEMS.indexOf(a.problem) - PROBLEMS.indexOf(b.problem);
        })
        .slice(0, 10),
    [trainingRows]
  );

  const rankingData = useMemo(
    () =>
      visibleProblems
        .map((problem) => {
          const rows = filteredRows.filter((row) => row.problem === problem);
          return {
            problem,
            value: groupAverage(rows, metric),
            attempt: groupAverage(rows, "attempted_rate"),
          };
        })
        .sort((a, b) => b.value - a.value),
    [filteredRows, metric, visibleProblems]
  );

  const summary = useMemo(() => {
    const easiest = rankingData[0];
    const hardest = rankingData[rankingData.length - 1];
    const mostSkipped = [...rankingData].sort((a, b) => a.attempt - b.attempt)[0];

    return {
      years: new Set(filteredRows.map((row) => row.year)).size,
      meanPopulation: average(
        [...new Set(filteredRows.map((row) => `${row.year}:${row.population_top_n}`))].map((key) => Number(key.split(":")[1]))
      ),
      easiest,
      hardest,
      mostSkipped,
      longRunMean: groupAverage(filteredRows, metric),
    };
  }, [filteredRows, metric, rankingData]);

  const heatmapYears = useMemo(() => years.filter((year) => year >= yearStart && year <= yearEnd), [yearEnd, yearStart, years]);
  const heatmapValues = useMemo(() => {
    const values = activeProblems.flatMap((problem) =>
      heatmapYears.map((year) => {
        const row = dataset.rows.find((candidate) => candidate.year === year && candidate.problem === problem);
        return row ? metricValue(row, metric) : 0;
      })
    );

    return {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 1,
    };
  }, [activeProblems, dataset.rows, heatmapYears, metric]);

  const toggleProblem = (problem: ProblemId) => {
    setSelectedProblems((current) => {
      if (current.includes(problem)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== problem);
      }

      return [...current, problem].sort((a, b) => PROBLEMS.indexOf(a) - PROBLEMS.indexOf(b));
    });
  };
  async function handlePracticeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPracticeEntry) return;

    const formData = new FormData(event.currentTarget);
    const status = String(formData.get("status") ?? "unattempted") as PracticeStatus;
    const total_minutes = Number(formData.get("total_minutes") ?? 0);
    const attempt_count = Number(formData.get("attempt_count") ?? 0);
    const notes = String(formData.get("notes") ?? "");
    const touchDate = String(formData.get("touch_date") ?? "");

    setSaving(true);
    setSaveError(null);

    try {
      if (status === "unattempted" && total_minutes <= 0 && attempt_count <= 0 && notes.trim() === "") {
        await remove(selectedPracticeEntry.key);
      } else {
        await save({
          problem_key: selectedPracticeEntry.key,
          year: selectedPracticeEntry.year,
          problem: selectedPracticeEntry.problem,
          status,
          last_attempted_at: touchDate ? new Date(`${touchDate}T12:00:00`).toISOString() : new Date().toISOString(),
          total_minutes: Number.isFinite(total_minutes) ? total_minutes : 0,
          attempt_count: Number.isFinite(attempt_count) ? attempt_count : 0,
          notes,
        });
      }
    } catch (submitError) {
      setSaveError(submitError instanceof Error ? submitError.message : "Failed to save practice record");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(problemKeyValue: string) {
    setSaveError(null);
    setSaving(true);
    try {
      await remove(problemKeyValue);
    } catch (resetError) {
      setSaveError(resetError instanceof Error ? resetError.message : "Failed to reset practice record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main id="top" className={styles.page}>
      <div className={styles.backdrop} aria-hidden />

      <header className={styles.header}>
        <div className={styles.brand}>
          <p className={styles.eyebrow}>Personal Training System</p>
          <h1 className={styles.brandTitle}>Putnam Proof Trainer</h1>
        </div>
        <div className={styles.headerActions}>
          <nav className={styles.nav}>
            <a href="#training">Training</a>
            <a href="#controls">Controls</a>
            <a href="#rankings">Rankings</a>
            <a href="#overview">Overview</a>
          </nav>
          <a className={styles.logoutButton} href="/auth/logout">
            Log Out
          </a>
        </div>
      </header>

      <section className={clsx(styles.hero, styles.animateIn)}>
        <article className={styles.heroCard}>
          <p className={styles.eyebrow}>Proof Practice</p>
          <h2 className={styles.heroTitle}>Know what to work on next.</h2>
          <p className={styles.heroCopy}>
            This site uses historical Top N score distributions to calibrate problem difficulty, then uses your own practice
            history to keep you working near the edge of your current level.
          </p>
          <div className={styles.heroMeta}>
            <span className={styles.metaChip}>Window {formatYearRange(yearStart, yearEnd)}</span>
            <span className={styles.metaChip}>{attemptedCount} tracked problems</span>
            <span className={styles.metaChip}>{selectedPracticeEntry ? `Next ${selectedPracticeEntry.year} ${selectedPracticeEntry.problem}` : "No current recommendation"}</span>
          </div>
        </article>

        <div className={styles.heroSide}>
          <div className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Current Level</p>
              <p className={styles.summaryValue}>{currentLevel.toFixed(0)}</p>
              <p className={styles.summaryHint}>Difficulty estimate from your strongest and most recent work</p>
            </article>
            <article className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Solved</p>
              <p className={styles.summaryValue}>{solvedCount}</p>
              <p className={styles.summaryHint}>Solved, hinted, solution-read, or archived</p>
            </article>
            <article className={styles.summaryCard}>
              <p className={styles.summaryLabel}>In Progress</p>
              <p className={styles.summaryValue}>{activeCount}</p>
              <p className={styles.summaryHint}>{partialCount} partially solved</p>
            </article>
            <article className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Time Logged</p>
              <p className={styles.summaryValue}>{totalHours.toFixed(1)}h</p>
              <p className={styles.summaryHint}>Across all tracked practice records</p>
            </article>
          </div>

          <aside className={styles.notePanel}>
            <p className={styles.noteTitle}>Calibration Note</p>
            <p className={styles.noteCopy}>
              All rates are computed against each year&apos;s published <strong>Top N contestants</strong>, not the full
              contest population. The dataset is static and loaded locally. Practice state is stored server-side
              {storageMode === "supabase" ? " in Supabase." : " using the temporary in-memory fallback."}
            </p>
          </aside>
        </div>
      </section>

      <section id="training" className={styles.section}>
        <div className={styles.suggestionLayout}>
          <article className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Training Queue</h3>
                <p className={styles.sectionCopy}>
                  Recommendations are grouped into confidence wins, on-level work, and stretch problems. Solved and archived
                  problems are hidden from the queue until you reopen them.
                </p>
              </div>
              <div className={styles.suggestionControls}>
                {(["easiest", "toughest"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={clsx(styles.sideButton, suggestionSort === value && styles.sideButtonActive)}
                    onClick={() => setSuggestionSort(value)}
                  >
                    {value === "easiest" ? "Easier Bias" : "Harder Bias"}
                  </button>
                ))}
              </div>
            </div>

            {error ? <div className={styles.suggestionEmpty}>{error}</div> : null}

            {!isLoaded ? (
              <div className={styles.suggestionEmpty}>Loading practice state...</div>
            ) : (
              <>
                {([
                  ["confidence", "Confidence Wins", "Cleaner reps below your current level."],
                  ["on_level", "On-Level Problems", "Best fit for your current proof level."],
                  ["stretch", "Stretch Problems", "Harder pushes to test whether you are ready to move up."],
                ] as const).map(([bucketKey, title, copy]) => {
                  const entries = recommendationGroups[bucketKey];

                  return (
                    <div key={bucketKey} className={styles.trainingBucket}>
                      <div className={styles.sectionHeader}>
                        <div>
                          <h4 className={styles.sectionTitle}>{title}</h4>
                          <p className={styles.sectionCopy}>{copy}</p>
                        </div>
                      </div>

                      {entries.length === 0 ? (
                        <div className={styles.suggestionEmpty}>No matching problems in the current filter slice.</div>
                      ) : (
                        <div className={styles.suggestionList}>
                          {entries.map((row) => (
                            <div key={row.key} className={clsx(styles.suggestionRow, selectedPracticeEntry?.key === row.key && styles.suggestionRowActive)}>
                              <div className={styles.suggestionMeta}>
                                <span className={styles.suggestionYear}>{row.year}</span>
                                <span className={styles.suggestionTag}>Difficulty {row.difficulty.toFixed(1)}</span>
                              </div>
                              <div className={styles.suggestionMeta}>
                                <span className={styles.suggestionProblem}>{row.problem}</span>
                                <span className={styles.suggestionTag}>{formatStatus(row.status)}</span>
                              </div>
                              <div>
                                <p className={styles.suggestionValue}>{METRIC_META.perfect_solve_rate.format(row.perfect_solve_rate)} perfect</p>
                                <p className={styles.suggestionHint}>
                                  {METRIC_META.attempted_rate.format(row.attempted_rate)} attempted, avg {row.average_score.toFixed(2)}
                                </p>
                                {row.metadata?.primary_topic ? <p className={styles.suggestionHint}>Topic: {row.metadata.primary_topic}</p> : null}
                              </div>
                              <div className={styles.suggestionActions}>
                                <button className={styles.completeButton} type="button" onClick={() => setSelectedPracticeKey(row.key)}>
                                  Train
                                </button>
                                <a className={styles.ghostButton} href={problemSetUrl(row.year)} target="_blank" rel="noreferrer">
                                  Problem
                                </a>
                                <a className={styles.ghostButton} href={solutionUrl(row.year)} target="_blank" rel="noreferrer">
                                  Solution
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </article>
          <aside className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Practice Record</h3>
                <p className={styles.sectionCopy}>Update the selected problem without leaving the queue.</p>
              </div>
            </div>

            {!isLoaded ? (
              <div className={styles.suggestionEmpty}>Loading practice state...</div>
            ) : !selectedPracticeEntry ? (
              <div className={styles.suggestionEmpty}>No practice target available for the current filters.</div>
            ) : (
              <form key={selectedPracticeEntry.key} className={styles.trainingForm} onSubmit={handlePracticeSubmit}>
                <div className={styles.completedRow}>
                  <div>
                    <div className={styles.suggestionValue}>
                      {selectedPracticeEntry.year} {selectedPracticeEntry.problem}
                    </div>
                    <div className={styles.suggestionHint}>
                      Difficulty {selectedPracticeEntry.difficulty.toFixed(1)} | {selectedPracticeEntry.metadata?.primary_topic ?? "Topic pending"}
                    </div>
                    <div className={styles.suggestionHint}>Last touched: {formatAttemptDate(selectedPracticeEntry.record?.last_attempted_at ?? null)}</div>
                  </div>
                  <button className={styles.ghostButton} type="button" onClick={() => void handleReset(selectedPracticeEntry.key)}>
                    Reset
                  </button>
                </div>

                {saveError ? <div className={styles.suggestionEmpty}>{saveError}</div> : null}

                <label className={styles.controlGroup}>
                  <span className={styles.controlLabel}>Status</span>
                  <select className={styles.select} name="status" defaultValue={selectedPracticeEntry.record?.status ?? "unattempted"}>
                    {PRACTICE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.trainingInputs}>
                  <label className={styles.controlGroup}>
                    <span className={styles.controlLabel}>Total Minutes</span>
                    <input className={styles.select} name="total_minutes" type="number" min="0" defaultValue={selectedPracticeEntry.record?.total_minutes ?? 0} />
                  </label>
                  <label className={styles.controlGroup}>
                    <span className={styles.controlLabel}>Attempt Count</span>
                    <input className={styles.select} name="attempt_count" type="number" min="0" defaultValue={selectedPracticeEntry.record?.attempt_count ?? 0} />
                  </label>
                </div>

                <label className={styles.controlGroup}>
                  <span className={styles.controlLabel}>Last Attempted</span>
                  <input
                    className={styles.select}
                    name="touch_date"
                    type="date"
                    defaultValue={selectedPracticeEntry.record?.last_attempted_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
                  />
                </label>

                <label className={styles.controlGroup}>
                  <span className={styles.controlLabel}>Notes</span>
                  <textarea className={styles.notesField} name="notes" defaultValue={selectedPracticeEntry.record?.notes ?? ""} />
                </label>

                <div className={styles.suggestionActions}>
                  <button className={styles.completeButton} type="submit" disabled={saving}>
                    {saving ? "Saving" : "Save Record"}
                  </button>
                  <a className={styles.ghostButton} href={problemSetUrl(selectedPracticeEntry.year)} target="_blank" rel="noreferrer">
                    Problem
                  </a>
                  <a className={styles.ghostButton} href={solutionUrl(selectedPracticeEntry.year)} target="_blank" rel="noreferrer">
                    Solution
                  </a>
                </div>

                <div className={styles.practiceMetaGrid}>
                  <div className={styles.callout}>
                    <p className={styles.calloutTitle}>Recommended Bucket</p>
                    <p className={styles.calloutValue}>{formatStatus(recommendationBucket(selectedPracticeEntry.difficulty, currentLevel))}</p>
                    <p className={styles.calloutHint}>Relative to your current estimated level</p>
                  </div>
                  <div className={styles.callout}>
                    <p className={styles.calloutTitle}>Archive Average</p>
                    <p className={styles.calloutValue}>{METRIC_META.average_score.format(selectedPracticeEntry.average_score)}</p>
                    <p className={styles.calloutHint}>Average score for the Top N population</p>
                  </div>
                </div>

                <div className={styles.completedList}>
                  <div className={styles.completedRow}>
                    <div>
                      <div className={styles.calloutTitle}>Recent Practice</div>
                      <div className={styles.suggestionHint}>{recentPractice.length} most recent tracked records</div>
                    </div>
                  </div>
                  {recentPractice.length === 0 ? (
                    <div className={styles.suggestionEmpty}>No practice history yet.</div>
                  ) : (
                    recentPractice.map((record) => (
                      <button key={record.problem_key} type="button" className={styles.completedRow} onClick={() => setSelectedPracticeKey(record.problem_key)}>
                        <div>
                          <div className={styles.suggestionValue}>
                            {record.year} {record.problem}
                          </div>
                          <div className={styles.suggestionHint}>
                            {formatStatus(record.status)} | {record.total_minutes} min | {record.attempt_count} attempts
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className={styles.completedList}>
                  <div className={styles.completedRow}>
                    <div>
                      <div className={styles.calloutTitle}>Solved / Archived</div>
                      <div className={styles.suggestionHint}>Reopen anything here by selecting it and changing the status.</div>
                    </div>
                  </div>
                  {completedEntries.length === 0 ? (
                    <div className={styles.suggestionEmpty}>Nothing solved or archived yet.</div>
                  ) : (
                    completedEntries.map((entry) => (
                      <button key={entry.key} type="button" className={styles.completedRow} onClick={() => setSelectedPracticeKey(entry.key)}>
                        <div>
                          <div className={styles.suggestionValue}>
                            {entry.year} {entry.problem}
                          </div>
                          <div className={styles.suggestionHint}>
                            {formatStatus(entry.status)} | difficulty {entry.difficulty.toFixed(1)}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </form>
            )}
          </aside>
        </div>
      </section>

      <section id="controls" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Training Controls</h3>
            <p className={styles.sectionCopy}>Adjust the practice pool and the supporting historical views without touching the dataset.</p>
          </div>
        </div>

        <div className={clsx(styles.panel, styles.animateIn)}>
          <div className={styles.controlsGrid}>
            <div className={styles.controlGroup}>
              <p className={styles.controlLabel}>Year Window</p>
              <div className={styles.inlineControls}>
                <select
                  className={styles.select}
                  value={yearStart}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setYearStart(next);
                    if (next > yearEnd) setYearEnd(next);
                  }}
                >
                  {years.map((year) => (
                    <option key={`start-${year}`} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select className={styles.select} value={yearEnd} onChange={(event) => setYearEnd(Number(event.target.value))}>
                  {years
                    .filter((year) => year >= yearStart)
                    .map((year) => (
                      <option key={`end-${year}`} value={year}>
                        {year}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className={styles.controlGroup}>
              <p className={styles.controlLabel}>Metric</p>
              <div className={styles.metricRow}>
                {METRICS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={clsx(styles.metricButton, metric === key && styles.metricButtonActive)}
                    onClick={() => setMetric(key)}
                  >
                    {METRIC_META[key].short}
                  </button>
                ))}
              </div>
              <p className={styles.sectionCopy}>{metricMeta.description}</p>
            </div>

            <div className={styles.controlGroup}>
              <p className={styles.controlLabel}>Side and Problem Focus</p>
              <div className={styles.sideRow}>
                {(["all", "A", "B"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={clsx(styles.sideButton, side === value && styles.sideButtonActive)}
                    onClick={() => setSide(value)}
                  >
                    {value === "all" ? "Whole Exam" : `${value}-side`}
                  </button>
                ))}
              </div>
              <div className={styles.problemGrid}>
                {visibleProblems.map((problem) => (
                  <button
                    key={problem}
                    type="button"
                    className={clsx(styles.problemButton, activeProblems.includes(problem) && styles.problemButtonActive)}
                    onClick={() => toggleProblem(problem)}
                  >
                    {problem}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="rankings" className={styles.section}>
        <article className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 className={styles.sectionTitle}>Historical Rankings</h3>
              <p className={styles.sectionCopy}>Use the archive as context for where each slot tends to sit over the selected window.</p>
            </div>
          </div>

          <div className={styles.summaryStrip}>
            <div className={styles.summaryInlineCard}>
              <p className={styles.summaryLabel}>Active Years</p>
              <p className={styles.summaryInlineValue}>{summary.years}</p>
            </div>
            <div className={styles.summaryInlineCard}>
              <p className={styles.summaryLabel}>Mean Top N</p>
              <p className={styles.summaryInlineValue}>{summary.meanPopulation.toFixed(0)}</p>
            </div>
            <div className={styles.summaryInlineCard}>
              <p className={styles.summaryLabel}>Strongest Slot</p>
              <p className={styles.summaryInlineValue}>{summary.easiest.problem}</p>
            </div>
            <div className={styles.summaryInlineCard}>
              <p className={styles.summaryLabel}>Most Skipped</p>
              <p className={styles.summaryInlineValue}>{summary.mostSkipped.problem}</p>
            </div>
          </div>

          <div className={styles.rankingList}>
            {rankingData.map((entry, index) => (
              <div key={entry.problem} className={styles.rankingRow}>
                <span className={styles.rankIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.rankProblem}>{entry.problem}</span>
                <div className={styles.rankBar}>
                  <div className={styles.rankBarFill} style={{ width: `${(entry.value / metricMeta.domainMax) * 100}%` }} />
                </div>
                <span className={styles.rankValue}>{metricMeta.format(entry.value)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.section}>
        <article className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 className={styles.sectionTitle}>Attempt vs Skip</h3>
              <p className={styles.sectionCopy}>A quick scan of which slots the Top N tended to seriously engage with.</p>
            </div>
          </div>

          <div className={styles.compactChartWrap}>
            {isHydrated ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingData} layout="vertical" margin={{ left: 8, right: 16, top: 10, bottom: 8 }}>
                  <CartesianGrid stroke="rgba(151,177,201,0.12)" horizontal={false} />
                  <XAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} tick={{ fill: "#9fb5cb", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="problem" tick={{ fill: "#c8d8e8", fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip content={<TooltipBody metric="attempted_rate" />} />
                  <Bar dataKey="attempt" name="Attempt Rate" radius={[0, 6, 6, 0]}>
                    {rankingData.map((entry) => (
                      <Cell key={`attempt-${entry.problem}`} fill={PROBLEM_COLORS[entry.problem]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </article>
      </section>
      <section id="overview" className={styles.section}>
        <article className={styles.panel}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 className={styles.sectionTitle}>Dense Archive Overview</h3>
              <p className={styles.sectionCopy}>The training system is primary, but the archive remains available as a dense reference map.</p>
            </div>
          </div>

          <div className={styles.heatmap}>
            <div className={styles.heatmapTable} style={{ minWidth: `${58 + activeProblems.length * 48}px` }}>
              <div className={styles.heatmapHeader} style={{ gridTemplateColumns: `58px repeat(${activeProblems.length}, minmax(42px, 1fr))` }}>
                <div className={styles.heatmapYear}>Year</div>
                {activeProblems.map((problem) => (
                  <div key={`header-${problem}`} className={styles.heatmapProblem}>
                    {problem}
                  </div>
                ))}
              </div>
              {heatmapYears.map((year) => (
                <div key={`heat-${year}`} className={styles.heatmapRow} style={{ gridTemplateColumns: `58px repeat(${activeProblems.length}, minmax(42px, 1fr))` }}>
                  <div className={styles.heatmapYear}>{year}</div>
                  {activeProblems.map((problem) => {
                    const row = dataset.rows.find((candidate) => candidate.year === year && candidate.problem === problem);
                    const value = row ? metricValue(row, metric) : 0;
                    const ratio = heatmapValues.max === heatmapValues.min ? 0.5 : (value - heatmapValues.min) / (heatmapValues.max - heatmapValues.min);
                    const tint = problem.startsWith("A") ? "127, 230, 255" : "255, 191, 97";

                    return (
                      <div
                        key={`heat-${year}-${problem}`}
                        className={styles.heatmapCell}
                        title={`${year} ${problem}: ${metricMeta.format(value)}`}
                        style={{
                          background: `rgba(${tint}, ${0.18 + ratio * 0.82})`,
                          boxShadow: ratio > 0.85 ? `0 0 20px rgba(${tint}, 0.18)` : "none",
                        }}
                      >
                        {metricMeta.format(value)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <Footer />
    </main>
  );
}

function Footer() {
  return (
    <footer className={styles.footer}>
      <a className={styles.footerLink} href="https://arjun.systems" target="_blank" rel="noreferrer">
        <Image className={`${styles.footerIcon} ${styles.footerIconLarge}`} src="/systems%20site%20icon.png" alt="Arjun Systems" width={26} height={26} />
        <span className={styles.footerLinkText}>arjun.systems</span>
      </a>
      <span className={styles.footerDivider}>{"//"}</span>
      <a className={styles.footerLink} href="https://arjuniyer.dev" target="_blank" rel="noreferrer">
        <Image className={styles.footerIcon} src="/personal%20site%20icon.png" alt="Arjun Iyer" width={20} height={20} />
        <span className={styles.footerLinkText}>arjuniyer.dev</span>
      </a>
    </footer>
  );
}
