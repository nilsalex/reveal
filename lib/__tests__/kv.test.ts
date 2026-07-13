import { describe, it, expect, beforeEach } from "vitest";
import {
  hasPlayed,
  addEntry,
  getEntries,
  __resetMemoryStore,
} from "@/lib/kv";
import type { LeaderboardEntry } from "@/lib/types";

function entry(name: string, durationMs = 5000): LeaderboardEntry {
  return {
    name,
    durationMs,
    timestamp: new Date("2026-07-13T12:00:00Z").toISOString(),
  };
}

describe("in-memory KV fallback", () => {
  beforeEach(() => {
    __resetMemoryStore();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("hasPlayed returns false for unknown name", async () => {
    expect(await hasPlayed("Oma")).toBe(false);
  });

  it("hasPlayed returns true after addEntry", async () => {
    await addEntry(entry("Oma"));
    expect(await hasPlayed("Oma")).toBe(true);
  });

  it("hasPlayed is case-insensitive on trimmed name", async () => {
    await addEntry(entry("Oma"));
    expect(await hasPlayed("  oma  ")).toBe(true);
    expect(await hasPlayed("OMA")).toBe(true);
  });

  it("getEntries returns entries sorted by durationMs ascending", async () => {
    await addEntry(entry("Slow", 10000));
    await addEntry(entry("Fast", 3000));
    await addEntry(entry("Medium", 5000));
    const list = await getEntries();
    expect(list).toHaveLength(3);
    expect(list[0].name).toBe("Fast");
    expect(list[1].name).toBe("Medium");
    expect(list[2].name).toBe("Slow");
  });

  it("getEntries returns a copy (not the internal array)", async () => {
    await addEntry(entry("Oma"));
    const a = await getEntries();
    const b = await getEntries();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
