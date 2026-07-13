import { kv } from "@vercel/kv";
import type { LeaderboardEntry } from "./types";

const KEY = "reveal_entries";

const memoryStore: LeaderboardEntry[] = [];

function hasKv(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    (!!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN)
  );
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function __resetMemoryStore(): void {
  memoryStore.length = 0;
}

export async function hasPlayed(name: string): Promise<boolean> {
  const needle = normalizeName(name);
  if (hasKv()) {
    const entries = await getEntries();
    return entries.some((e) => normalizeName(e.name) === needle);
  }
  return memoryStore.some((e) => normalizeName(e.name) === needle);
}

export async function addEntry(entry: LeaderboardEntry): Promise<void> {
  if (hasKv()) {
    await kv.lpush(KEY, JSON.stringify(entry));
    return;
  }
  memoryStore.push(entry);
}

export async function getEntries(): Promise<LeaderboardEntry[]> {
  if (hasKv()) {
    const raw = (await kv.lrange(KEY, 0, -1)) as unknown;
    if (!raw || !Array.isArray(raw)) return [];
    const parsed = raw.map((item) =>
      typeof item === "string"
        ? (JSON.parse(item) as LeaderboardEntry)
        : (item as LeaderboardEntry),
    );
    // Sort by durationMs ascending (fastest first)
    return parsed.sort((a, b) => a.durationMs - b.durationMs);
  }
  return [...memoryStore].sort((a, b) => a.durationMs - b.durationMs);
}
