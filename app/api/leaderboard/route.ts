import { NextResponse } from "next/server";
import { getEntries } from "@/lib/kv";
import type { LeaderboardResponse } from "@/lib/types";

export async function GET() {
  try {
    const entries = await getEntries();
    return NextResponse.json<LeaderboardResponse>({ entries });
  } catch (e) {
    console.error("KV getEntries failed", e);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 },
    );
  }
}
