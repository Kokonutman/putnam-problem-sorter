import { access } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getConfiguredPassword } from "@/lib/auth";

const DATASET_FILENAME = "putnam_problem_stats_all_years.csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function hasRequiredDataset(): Promise<boolean> {
  try {
    await access(path.join(process.cwd(), DATASET_FILENAME));
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const hasPassword = Boolean(getConfiguredPassword());
  const hasDataset = await hasRequiredDataset();
  const hasSupabase =
    Boolean(process.env.SUPABASE_URL?.trim()) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  const status = hasPassword && hasDataset && hasSupabase ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      service: "putnam-problem-sorter",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}
