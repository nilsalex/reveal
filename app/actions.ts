"use server";

import { revalidatePath } from "next/cache";
import { getBestTime, addEntry, getEntries } from "@/lib/kv";
import type { Gender, LeaderboardEntry, RevealResult } from "@/lib/types";

function isValidName(n: unknown): n is string {
  return typeof n === "string" && n.trim().length > 0 && n.trim().length <= 40;
}

function isValidDurationMs(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

export async function revealGender(input: {
  name: string;
  durationMs: number;
}): Promise<RevealResult> {
  const { name, durationMs } = input;

  if (!isValidName(name) || !isValidDurationMs(durationMs)) {
    throw new Error("invalid_input");
  }

  const revealGender = process.env.REVEAL_GENDER;
  if (revealGender !== "boy" && revealGender !== "girl") {
    throw new Error("REVEAL_GENDER env var missing or invalid");
  }

  // Only record if this is a new best (or first time)
  const best = await getBestTime(name);
  if (best === null || durationMs < best) {
    await addEntry({
      name: name.trim(),
      durationMs,
      timestamp: new Date().toISOString(),
    });
    revalidatePath("/");
  }

  return { revealedGender: revealGender as Gender };
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return getEntries();
}
