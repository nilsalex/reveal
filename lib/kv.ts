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

export async function getBestTime(name: string): Promise<number | null> {
  const needle = normalizeName(name);
  const entries = await getEntries();
  const matching = entries.filter((e) => normalizeName(e.name) === needle);
  if (matching.length === 0) return null;
  return Math.min(...matching.map((e) => e.durationMs));
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
    return dedupeAndSort(parsed);
  }
  return dedupeAndSort([...memoryStore]);
}

function dedupeAndSort(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  // Keep only the best (lowest) durationMs per name
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
