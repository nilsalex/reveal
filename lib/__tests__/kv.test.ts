import { describe, it, expect, beforeEach } from "vitest";
import {
  getBestTime,
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

  it("getBestTime returns null for unknown name", async () => {
    expect(await getBestTime("Oma")).toBeNull();
  });

  it("getBestTime returns the duration after addEntry", async () => {
    await addEntry(entry("Oma", 8000));
    expect(await getBestTime("Oma")).toBe(8000);
  });

  it("getBestTime returns the best (lowest) time across replays", async () => {
    await addEntry(entry("Oma", 10000));
    await addEntry(entry("Oma", 6000));
    await addEntry(entry("Oma", 9000));
    expect(await getBestTime("Oma")).toBe(6000);
  });

  it("getBestTime is case-insensitive on trimmed name", async () => {
    await addEntry(entry("Oma", 7000));
    expect(await getBestTime("  oma  ")).toBe(7000);
    expect(await getBestTime("OMA")).toBe(7000);
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

  it("getEntries dedupes by name, keeping best time", async () => {
    await addEntry(entry("Oma", 10000));
    await addEntry(entry("Oma", 4000));
    await addEntry(entry("Opa", 7000));
    const list = await getEntries();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe("Oma");
    expect(list[0].durationMs).toBe(4000);
    expect(list[1].name).toBe("Opa");
  });

  it("getEntries returns a copy (not the internal array)", async () => {
    await addEntry(entry("Oma"));
    const a = await getEntries();
    const b = await getEntries();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
