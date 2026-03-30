import { NextResponse } from "next/server";
import type { PracticeRecord } from "@/lib/types";
import { deletePracticeRecord, getPracticeState, upsertPracticeRecord } from "@/lib/practice-store";

export async function GET() {
  const state = await getPracticeState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as
    | { action: "upsert"; record: PracticeRecord }
    | { action: "delete"; problem_key: string };

  if (payload.action === "upsert" && payload.record) {
    const state = await upsertPracticeRecord(payload.record);
    return NextResponse.json(state);
  }

  if (payload.action === "delete" && payload.problem_key) {
    const state = await deletePracticeRecord(payload.problem_key);
    return NextResponse.json(state);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
