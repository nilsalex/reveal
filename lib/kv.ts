import { Redis } from "@upstash/redis";
import type { Gender, LeaderboardEntry } from "./types";

const KEY = "reveal_entries";
const GENDER_KEY = "reveal_gender";

const memoryStore: LeaderboardEntry[] = [];
let memoryGender: Gender | null = null;

function hasRedis(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    (!!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN)
  );
}

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return redis;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function __resetMemoryStore(): void {
  memoryStore.length = 0;
  memoryGender = null;
}

export async function getBestTime(name: string): Promise<number | null> {
  const needle = normalizeName(name);
  const entries = await getEntries();
  const matching = entries.filter((e) => normalizeName(e.name) === needle);
  if (matching.length === 0) return null;
  return Math.min(...matching.map((e) => e.durationMs));
}

export async function addEntry(entry: LeaderboardEntry): Promise<void> {
  if (hasRedis()) {
    await getRedis().lpush(KEY, JSON.stringify(entry));
    return;
  }
  memoryStore.push(entry);
}

export async function getEntries(): Promise<LeaderboardEntry[]> {
  if (hasRedis()) {
    const raw = (await getRedis().lrange(KEY, 0, -1)) as unknown;
    if (!raw || !Array.isArray(raw)) return [];
    const parsed = raw.map((item) =>
      typeof item === "string"
        ? (JSON.parse(item) as LeaderboardEntry)
        : (item as LeaderboardEntry),
    );
    return dedupeAndSort(parsed);
  }
  return dedupeAndSort([...memoryStore]);
}

export async function clearEntries(): Promise<void> {
  if (hasRedis()) {
    await getRedis().del(KEY);
    return;
  }
  memoryStore.length = 0;
}

export async function getStoredGender(): Promise<Gender | null> {
  if (hasRedis()) {
    const val = (await getRedis().get(GENDER_KEY)) as unknown;
    if (val === "boy" || val === "girl") return val;
    return null;
  }
  return memoryGender;
}

export async function setStoredGender(gender: Gender): Promise<void> {
  if (hasRedis()) {
    await getRedis().set(GENDER_KEY, gender);
    return;
  }
  memoryGender = gender;
}

function dedupeAndSort(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const bestByName = new Map<string, LeaderboardEntry>();
  for (const e of entries) {
    const key = normalizeName(e.name);
    const existing = bestByName.get(key);
    if (!existing || e.durationMs < existing.durationMs) {
      bestByName.set(key, e);
    }
  }
  return [...bestByName.values()].sort((a, b) => a.durationMs - b.durationMs);
}
