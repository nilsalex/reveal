"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  getBestTime,
  addEntry,
  getEntries,
  getStoredGender,
  setStoredGender,
  clearEntries,
} from "@/lib/kv";
import type { Gender, LeaderboardEntry, RevealResult } from "@/lib/types";

const ADMIN_PIN = process.env.ADMIN_PIN;

// Simple in-memory rate limiting: max 5 failed attempts per IP per 5 minutes
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; firstAt: number }>();

function checkRateLimit(ip: string): void {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (entry) {
    if (now - entry.firstAt > WINDOW_MS) {
      // Window expired, reset
      failedAttempts.delete(ip);
    } else if (entry.count >= MAX_ATTEMPTS) {
      throw new Error("too_many_attempts");
    }
  }
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (entry && now - entry.firstAt < WINDOW_MS) {
    entry.count++;
  } else {
    failedAttempts.set(ip, { count: 1, firstAt: now });
  }
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  );
}

function isValidName(n: unknown): n is string {
  return typeof n === "string" && n.trim().length > 0 && n.trim().length <= 40;
}

function isValidDurationMs(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

async function resolveGender(): Promise<Gender> {
  const stored = await getStoredGender();
  if (stored !== null) return stored;
  throw new Error("Gender not set. Set it via /admin.");
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

export async function adminGetGender(input: {
  pin: string;
}): Promise<Gender | null> {
  const ip = await getClientIp();
  checkRateLimit(ip);

  if (input.pin !== ADMIN_PIN) {
    recordFailedAttempt(ip);
    throw new Error("unauthorized");
  }

  clearFailedAttempts(ip);
  return getStoredGender();
}

export async function adminSetGender(input: {
  pin: string;
  gender: Gender;
}): Promise<{ success: boolean }> {
  const ip = await getClientIp();
  checkRateLimit(ip);

  if (input.pin !== ADMIN_PIN) {
    recordFailedAttempt(ip);
    throw new Error("unauthorized");
  }

  clearFailedAttempts(ip);
  await setStoredGender(input.gender);
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function adminClearLeaderboard(input: {
  pin: string;
}): Promise<{ success: boolean }> {
  const ip = await getClientIp();
  checkRateLimit(ip);

  if (input.pin !== ADMIN_PIN) {
    recordFailedAttempt(ip);
    throw new Error("unauthorized");
  }

  clearFailedAttempts(ip);
  await clearEntries();
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}
