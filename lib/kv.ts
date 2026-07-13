import { kv } from "@vercel/kv";
import type { LeaderboardEntry } from "./types";

const KEY = "jackpot_entries";

// Module-scoped in-memory fallback used in dev when KV env vars are absent.
// Never active in production: callers route to real KV when env is set.
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

// Test helper
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
    // Entries may come back as JSON strings or already-parsed objects
    // depending on the KV provider; handle both.
    const parsed = raw.map((item) =>
      typeof item === "string" ? (JSON.parse(item) as LeaderboardEntry) : (item as LeaderboardEntry),
    );
    // lpush prepends (newest-first); reverse for oldest-first
    return parsed.reverse();
  }
  return [...memoryStore];
}
