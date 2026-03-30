import { createClient } from "@supabase/supabase-js";
import type { PracticeRecord, PracticeStatus } from "@/lib/types";
import { problemKey } from "@/lib/training";

const TABLE_NAME = "putnam_practice_records";
const KEY_PATTERN = /^\d{4}-(A|B)[1-6]$/;
const memoryState = {
  records: [] as PracticeRecord[],
};

type RowShape = {
  problem_key: string;
  year: number;
  problem: string;
  status: PracticeStatus;
  last_attempted_at: string | null;
  total_minutes: number;
  attempt_count: number;
  notes: string | null;
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeRecord(input: PracticeRecord): PracticeRecord {
  return {
    ...input,
    problem_key: problemKey(input.year, input.problem),
    notes: input.notes.trim(),
    total_minutes: Math.max(0, Math.round(input.total_minutes)),
    attempt_count: Math.max(0, Math.round(input.attempt_count)),
  };
}

function mapRow(row: RowShape): PracticeRecord {
  return {
    problem_key: row.problem_key,
    year: row.year,
    problem: row.problem as PracticeRecord["problem"],
    status: row.status,
    last_attempted_at: row.last_attempted_at,
    total_minutes: row.total_minutes,
    attempt_count: row.attempt_count,
    notes: row.notes ?? "",
  };
}

export async function getPracticeState() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { records: memoryState.records, storageMode: "memory" as const };
  }

  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("updated_at", { ascending: false });
  if (error) throw error;

  return { records: (data ?? []).map((row) => mapRow(row as RowShape)), storageMode: "supabase" as const };
}

export async function upsertPracticeRecord(record: PracticeRecord) {
  const normalized = normalizeRecord(record);
  if (!KEY_PATTERN.test(normalized.problem_key)) {
    throw new Error("Invalid practice record key");
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    memoryState.records = [
      normalized,
      ...memoryState.records.filter((entry) => entry.problem_key !== normalized.problem_key),
    ];
    return { records: memoryState.records, storageMode: "memory" as const };
  }

  const { error } = await supabase.from(TABLE_NAME).upsert({
    problem_key: normalized.problem_key,
    year: normalized.year,
    problem: normalized.problem,
    status: normalized.status,
    last_attempted_at: normalized.last_attempted_at,
    total_minutes: normalized.total_minutes,
    attempt_count: normalized.attempt_count,
    notes: normalized.notes,
  });
  if (error) throw error;

  return getPracticeState();
}

export async function deletePracticeRecord(problem_key: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    memoryState.records = memoryState.records.filter((entry) => entry.problem_key !== problem_key);
    return { records: memoryState.records, storageMode: "memory" as const };
  }

  const { error } = await supabase.from(TABLE_NAME).delete().eq("problem_key", problem_key);
  if (error) throw error;
  return getPracticeState();
}
