"use server";

import { revalidatePath } from "next/cache";
import {
  getBestTime,
  addEntry,
  getEntries,
  getStoredGender,
  setStoredGender,
  clearEntries,
} from "@/lib/kv";
import type { Gender, LeaderboardEntry, RevealResult } from "@/lib/types";

const ADMIN_PIN = process.env.ADMIN_PIN ?? "1101";

function isValidName(n: unknown): n is string {
  return typeof n === "string" && n.trim().length > 0 && n.trim().length <= 40;
}

function isValidDurationMs(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

async function resolveGender(): Promise<Gender> {
  // KV-stored gender takes precedence over env var
  const stored = await getStoredGender();
  if (stored) return stored;

  const envGender = process.env.REVEAL_GENDER;
  if (envGender === "boy" || envGender === "girl") return envGender;

  throw new Error("REVEAL_GENDER not set in KV or env");
}

export async function revealGender(input: {
  name: string;
  durationMs: number;
}): Promise<RevealResult> {
  const { name, durationMs } = input;

  if (!isValidName(name) || !isValidDurationMs(durationMs)) {
    throw new Error("invalid_input");
  }

  const gender = await resolveGender();

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

  return { revealedGender: gender };
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return getEntries();
}

export async function adminSetGender(input: {
  pin: string;
  gender: Gender;
}): Promise<{ success: boolean }> {
  if (input.pin !== ADMIN_PIN) {
    throw new Error("unauthorized");
  }
  await setStoredGender(input.gender);
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function adminClearLeaderboard(input: {
  pin: string;
}): Promise<{ success: boolean }> {
  if (input.pin !== ADMIN_PIN) {
    throw new Error("unauthorized");
  }
  await clearEntries();
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function adminGetGender(): Promise<Gender | null> {
  return getStoredGender();
}
