import { describe, it, expect, vi } from "vitest";
import {
  createBalloons,
  hitTest,
  assignReveal,
  getRevealThreshold,
} from "@/lib/balloon";
import type { Balloon } from "@/lib/types";

describe("getRevealThreshold", () => {
  it("returns ceil(25% of total)", () => {
    expect(getRevealThreshold(30)).toBe(8);
    expect(getRevealThreshold(8)).toBe(2);
    expect(getRevealThreshold(1)).toBe(1);
    expect(getRevealThreshold(0)).toBe(0);
  });
});

describe("createBalloons", () => {
  it("creates the requested count", () => {
    vi.stubGlobal("Math", { random: () => 0.5, floor: Math.floor, ceil: Math.ceil, sqrt: Math.sqrt });
    const balloons = createBalloons(10, 400, 800);
    expect(balloons).toHaveLength(10);
    vi.unstubAllGlobals();
  });

  it("assigns unique ids", () => {
    vi.stubGlobal("Math", { random: () => 0.5, floor: Math.floor, ceil: Math.ceil, sqrt: Math.sqrt });
    const balloons = createBalloons(5, 400, 800);
    const ids = balloons.map((b) => b.id);
    expect(new Set(ids).size).toBe(5);
    vi.unstubAllGlobals();
  });

  it("places balloons within viewport bounds", () => {
    vi.stubGlobal("Math", { random: () => 0.5, floor: Math.floor, ceil: Math.ceil, sqrt: Math.sqrt });
    const w = 400;
    const h = 800;
    const balloons = createBalloons(10, w, h);
    for (const b of balloons) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(w);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(h);
    }
    vi.unstubAllGlobals();
  });

  it("sets isReveal to false for all", () => {
    vi.stubGlobal("Math", { random: () => 0.5, floor: Math.floor, ceil: Math.ceil, sqrt: Math.sqrt });
    const balloons = createBalloons(5, 400, 800);
    expect(balloons.every((b) => !b.isReveal)).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe("hitTest", () => {
  function makeBalloon(
    id: number,
    x: number,
    y: number,
    radius = 30,
  ): Balloon {
    return {
      id,
      x,
      y,
      vx: 0,
      vy: -1,
      radius,
      color: "#FFD1DC",
      popped: false,
      isReveal: false,
    };
  }

  it("returns the balloon containing the point", () => {
    const b = makeBalloon(1, 100, 100, 50);
    const result = hitTest([b], 120, 110);
    expect(result?.id).toBe(1);
  });

  it("returns null when no balloon contains the point", () => {
    const b = makeBalloon(1, 100, 100, 50);
    const result = hitTest([b], 500, 500);
    expect(result).toBeNull();
  });

  it("returns the topmost (last in array) balloon on overlap", () => {
    const b1 = makeBalloon(1, 100, 100, 50);
    const b2 = makeBalloon(2, 110, 110, 50);
    const result = hitTest([b1, b2], 105, 105);
    expect(result?.id).toBe(2);
  });

  it("skips popped balloons", () => {
    const b = makeBalloon(1, 100, 100, 50);
    b.popped = true;
    const result = hitTest([b], 100, 100);
    expect(result).toBeNull();
  });
});

describe("assignReveal", () => {
  it("tags exactly one non-popped balloon as reveal", () => {
    vi.stubGlobal("Math", { random: () => 0, floor: Math.floor, ceil: Math.ceil, sqrt: Math.sqrt });
    const balloons: Balloon[] = [
      { id: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 50, color: "#fff", popped: false, isReveal: false },
      { id: 2, x: 0, y: 0, vx: 0, vy: 0, radius: 50, color: "#fff", popped: false, isReveal: false },
      { id: 3, x: 0, y: 0, vx: 0, vy: 0, radius: 50, color: "#fff", popped: false, isReveal: false },
    ];
    const result = assignReveal(balloons);
    const tagged = result.filter((b) => b.isReveal);
    expect(tagged).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it("does not tag popped balloons", () => {
    vi.stubGlobal("Math", { random: () => 0, floor: Math.floor, ceil: Math.ceil, sqrt: Math.sqrt });
    const balloons: Balloon[] = [
      { id: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 50, color: "#fff", popped: true, isReveal: false },
      { id: 2, x: 0, y: 0, vx: 0, vy: 0, radius: 50, color: "#fff", popped: false, isReveal: false },
    ];
    const result = assignReveal(balloons);
    expect(result[0].isReveal).toBe(false);
    expect(result[1].isReveal).toBe(true);
    vi.unstubAllGlobals();
  });

  it("returns a new array (does not mutate input)", () => {
    vi.stubGlobal("Math", { random: () => 0, floor: Math.floor, ceil: Math.ceil, sqrt: Math.sqrt });
    const balloons: Balloon[] = [
      { id: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 50, color: "#fff", popped: false, isReveal: false },
    ];
    const result = assignReveal(balloons);
    expect(balloons[0].isReveal).toBe(false);
    expect(result).not.toBe(balloons);
    expect(result[0].isReveal).toBe(true);
    vi.unstubAllGlobals();
  });

  it("handles empty array gracefully", () => {
    const result = assignReveal([]);
    expect(result).toEqual([]);
  });
});
