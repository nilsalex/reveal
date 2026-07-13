# Baby-Ballons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the slot machine game with a balloon-pop gender reveal game where players tap floating pastel balloons, and after popping 25%, one remaining balloon is secretly tagged as the reveal balloon that triggers the gender reveal.

**Architecture:** Next.js App Router with Server Actions (no API routes). Canvas-based balloon game in a client component. `REVEAL_GENDER` env var stays server-side, returned only via the `revealGender` Server Action. Leaderboard in Upstash Redis sorted by fastest reveal time.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, `@vercel/kv`, `canvas-confetti`, Vitest.

---

## File Structure

```
app/
  layout.tsx                # unchanged
  page.tsx                  # Server Component: fetches leaderboard, renders BalloonGame
  globals.css               # unchanged
  actions.ts                # NEW — "use server" functions
  components/
    NameEntry.tsx           # reused as-is
    BalloonGame.tsx         # NEW — client component, canvas + game loop + state
    Leaderboard.tsx         # modified: rank, name, time (no guess/correct)
    RevealOverlay.tsx       # NEW — replaces JackpotOverlay
    Confetti.tsx            # reused as-is
lib/
  types.ts                  # simplified
  kv.ts                     # modified: rename key, sort by durationMs
  german.ts                 # updated copy for balloon game
  balloon.ts                # NEW — pure game logic
  __tests__/
    balloon.test.ts          # NEW
    kv.test.ts               # updated
```

**Deleted:**
- `app/api/spin/route.ts`, `app/api/leaderboard/route.ts` (entire `app/api/` dir)
- `app/components/SlotMachine.tsx`, `app/components/Reel.tsx`, `app/components/JackpotOverlay.tsx`
- `lib/spin.ts`, `app/__tests__/spin.test.ts`

---

### Task 1: Delete old slot machine code

**Files:**
- Delete: `app/api/spin/route.ts`, `app/api/leaderboard/route.ts`, `app/components/SlotMachine.tsx`, `app/components/Reel.tsx`, `app/components/JackpotOverlay.tsx`, `lib/spin.ts`, `app/__tests__/spin.test.ts`

- [ ] **Step 1: Delete old files**

```bash
rm -rf app/api
rm app/components/SlotMachine.tsx app/components/Reel.tsx app/components/JackpotOverlay.tsx
rm lib/spin.ts app/__tests__/spin.test.ts
```

- [ ] **Step 2: Verify typecheck still passes (will fail on app/page.tsx referencing deleted components — that's expected, we'll fix it in Task 8)**

Run: `npm run typecheck`
Expected: errors about missing imports in `app/page.tsx` — that's fine, we'll replace that file.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove slot machine game code"
```

---

### Task 2: Simplify shared types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Rewrite `lib/types.ts`**

```ts
export type Gender = "boy" | "girl";

export interface LeaderboardEntry {
  name: string;
  durationMs: number;
  timestamp: string; // ISO 8601
}

export type RevealResult =
  | { revealedGender: Gender }
  | { error: "already_played" };

export interface Balloon {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  popped: boolean;
  isReveal: boolean;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: errors only in `app/page.tsx` and `lib/kv.ts` (both reference old types). That's expected — we fix them in later tasks.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "refactor: simplify types for balloon game"
```

---

### Task 3: Update KV helpers for new entry shape

**Files:**
- Modify: `lib/kv.ts`
- Modify: `app/__tests__/kv.test.ts` (move to `lib/__tests__/kv.test.ts`)

- [ ] **Step 1: Create `lib/__tests__/` directory and move the test file**

```bash
mkdir -p lib/__tests__
mv app/__tests__/kv.test.ts lib/__tests__/kv.test.ts
rmdir app/__tests__ 2>/dev/null || true
```

- [ ] **Step 2: Rewrite `lib/__tests__/kv.test.ts`**

```ts
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
```

- [ ] **Step 3: Rewrite `lib/kv.ts`**

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS, 5 tests green

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: update KV helpers for balloon game entry shape"
```

---

### Task 4: Update German copy

**Files:**
- Modify: `lib/german.ts`

- [ ] **Step 1: Rewrite `lib/german.ts`**

```ts
import type { Gender } from "./types";

export const COPY = {
  title: "Baby-Ballons",
  subtitle: "Ploppe die Ballons, um das Baby-Geschlecht zu enthüllen!",
  nameLabel: "Wie heißt du?",
  namePlaceholder: "Dein Name",
  startButton: "Los geht's",
  leaderboardTitle: "Rangliste",
  leaderboardEmpty: "Noch niemand hat aufgedeckt. Viel Glück!",
  alreadyPlayed: "Du hast bereits aufgedeckt — weiter geht's nicht!",
  serverError: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  toLeaderboard: "Zur Rangliste",
  revealHeadline: (g: Gender) =>
    g === "boy" ? "Es ist ein Junge!" : "Es ist ein Mädchen!",
  revealSubline: (durationMs: number) => {
    const seconds = (durationMs / 1000).toFixed(1);
    return `Deine Zeit: ${seconds}s`;
  },
} as const;
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: errors only in `app/page.tsx` (expected, fixed in Task 8)

- [ ] **Step 3: Commit**

```bash
git add lib/german.ts
git commit -m "refactor: update German copy for balloon game"
```

---

### Task 5: Pure balloon game logic (TDD)

**Files:**
- Create: `lib/balloon.ts`
- Create: `lib/__tests__/balloon.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/balloon.test.ts`:
```ts
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
    vi.stubGlobal("Math", { random: () => 0.5 });
    const balloons = createBalloons(10, 400, 800);
    expect(balloons).toHaveLength(10);
    vi.unstubAllGlobals();
  });

  it("assigns unique ids", () => {
    vi.stubGlobal("Math", { random: () => 0.5 });
    const balloons = createBalloons(5, 400, 800);
    const ids = balloons.map((b) => b.id);
    expect(new Set(ids).size).toBe(5);
    vi.unstubAllGlobals();
  });

  it("places balloons within viewport bounds", () => {
    vi.stubGlobal("Math", { random: () => 0.5 });
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
    vi.stubGlobal("Math", { random: () => 0.5 });
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
    radius = 50,
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
    vi.stubGlobal("Math", { random: () => 0 });
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
    vi.stubGlobal("Math", { random: () => 0 });
    const balloons: Balloon[] = [
      { id: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 50, color: "#fff", popped: true, isReveal: false },
      { id: 2, x: 0, y: 0, vx: 0, vy: 0, radius: 50, color: "#fff", popped: false, isReveal: false },
    ];
    const result = assignReveal(balloons);
    expect(result[0].isReveal).toBe(false); // id 1 is popped, must not be tagged
    expect(result[1].isReveal).toBe(true);
    vi.unstubAllGlobals();
  });

  it("returns a new array (does not mutate input)", () => {
    vi.stubGlobal("Math", { random: () => 0 });
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/balloon.ts` doesn't exist

- [ ] **Step 3: Write `lib/balloon.ts`**

```ts
import type { Balloon } from "./types";

const PASTEL_COLORS = ["#FFD1DC", "#BFD7FF", "#FFF8F0", "#E6B800"];

export function getRevealThreshold(total: number): number {
  return Math.ceil(total * 0.25);
}

export function createBalloons(
  count: number,
  width: number,
  height: number,
): Balloon[] {
  const balloons: Balloon[] = [];
  for (let i = 0; i < count; i++) {
    const radius = 50 + Math.random() * 20; // 50-70px
    balloons.push({
      id: i,
      x: radius + Math.random() * (width - 2 * radius),
      y: radius + Math.random() * (height - 2 * radius),
      vx: (Math.random() - 0.5) * 0.5, // gentle horizontal sway
      vy: -0.3 - Math.random() * 0.4,  // drift upward
      radius,
      color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
      popped: false,
      isReveal: false,
    });
  }
  return balloons;
}

export function hitTest(
  balloons: Balloon[],
  x: number,
  y: number,
): Balloon | null {
  // Iterate topmost (last) first for correct overlap behavior
  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    if (b.popped) continue;
    const dx = x - b.x;
    const dy = y - b.y;
    if (dx * dx + dy * dy <= b.radius * b.radius) {
      return b;
    }
  }
  return null;
}

export function assignReveal(balloons: Balloon[]): Balloon[] {
  const candidates = balloons.filter((b) => !b.popped);
  if (candidates.length === 0) return [...balloons];
  const winner = candidates[Math.floor(Math.random() * candidates.length)];
  return balloons.map((b) =>
    b.id === winner.id ? { ...b, isReveal: true } : b,
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests green

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: errors only in `app/page.tsx` (expected)

- [ ] **Step 6: Commit**

```bash
git add lib/balloon.ts lib/__tests__/balloon.test.ts
git commit -m "feat: pure balloon game logic with tests"
```

---

### Task 6: Server Actions

**Files:**
- Create: `app/actions.ts`

- [ ] **Step 1: Write `app/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { hasPlayed, addEntry, getEntries } from "@/lib/kv";
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

  if (await hasPlayed(name)) {
    return { error: "already_played" };
  }

  await addEntry({
    name: name.trim(),
    durationMs,
    timestamp: new Date().toISOString(),
  });

  revalidatePath("/");

  return { revealedGender: revealGender as Gender };
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return getEntries();
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: errors only in `app/page.tsx` (expected)

- [ ] **Step 3: Commit**

```bash
git add app/actions.ts
git commit -m "feat: server actions for reveal and leaderboard"
```

---

### Task 7: Update `Leaderboard` component

**Files:**
- Modify: `app/components/Leaderboard.tsx`

- [ ] **Step 1: Rewrite `app/components/Leaderboard.tsx`**

```tsx
import { COPY } from "@/lib/german";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <section className="w-full max-w-sm mx-auto mt-6">
      <h2 className="mb-2 text-center text-xl font-bold text-pastel-pinkDeep">
        {COPY.leaderboardTitle}
      </h2>
      {entries.length === 0 ? (
        <p className="text-center text-sm text-slate-500">
          {COPY.leaderboardEmpty}
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e, i) => (
            <li
              key={`${e.name}-${e.timestamp}`}
              className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-2 shadow-sm"
            >
              <span className="w-6 text-center font-bold text-pastel-gold">
                {i + 1}
              </span>
              <span className="flex-1 truncate font-medium text-slate-700">
                {e.name}
              </span>
              <span className="ml-2 text-sm font-semibold text-slate-600">
                {formatDuration(e.durationMs)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

Note: this is now a Server Component (no `"use client"`). It receives entries as props.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: errors only in `app/page.tsx` (expected)

- [ ] **Step 3: Commit**

```bash
git add app/components/Leaderboard.tsx
git commit -m "refactor: update Leaderboard for time-based entries"
```

---

### Task 8: `RevealOverlay` component

**Files:**
- Create: `app/components/RevealOverlay.tsx`

- [ ] **Step 1: Write `app/components/RevealOverlay.tsx`**

```tsx
"use client";

import { Confetti } from "./Confetti";
import { COPY } from "@/lib/german";
import type { Gender } from "@/lib/types";

interface RevealOverlayProps {
  gender: Gender;
  durationMs: number;
  onClose: () => void;
}

export function RevealOverlay({ gender, durationMs, onClose }: RevealOverlayProps) {
  const accent = gender === "boy" ? "text-pastel-blueDeep" : "text-pastel-pinkDeep";
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-pastel-cream/95 p-6 text-center">
      <Confetti gender={gender} />
      <h1 className={`text-4xl sm:text-5xl font-extrabold ${accent}`}>
        {COPY.revealHeadline(gender)}
      </h1>
      <p className="mt-3 text-lg text-slate-700">
        {COPY.revealSubline(durationMs)}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-8 rounded-full bg-pastel-gold px-6 py-3 font-semibold text-white shadow-md transition hover:brightness-105"
      >
        {COPY.toLeaderboard}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: errors only in `app/page.tsx` (expected)

- [ ] **Step 3: Commit**

```bash
git add app/components/RevealOverlay.tsx
git commit -m "feat: RevealOverlay component"
```

---

### Task 9: `BalloonGame` component (the canvas game)

**Files:**
- Create: `app/components/BalloonGame.tsx`

- [ ] **Step 1: Write `app/components/BalloonGame.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { revealGender } from "@/app/actions";
import { RevealOverlay } from "./RevealOverlay";
import { Leaderboard } from "./Leaderboard";
import {
  createBalloons,
  hitTest,
  assignReveal,
  getRevealThreshold,
} from "@/lib/balloon";
import { COPY } from "@/lib/german";
import type { Balloon, Gender, LeaderboardEntry } from "@/lib/types";

const BALLOON_COUNT = 30;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

interface BalloonGameProps {
  name: string;
  initialEntries: LeaderboardEntry[];
}

export function BalloonGame({ name, initialEntries }: BalloonGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const balloonsRef = useRef<Balloon[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const popCountRef = useRef(0);
  const revealAssignedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  const [popCount, setPopCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(true);
  const [reveal, setReveal] = useState<{ gender: Gender; durationMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener("resize", resize);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    balloonsRef.current = createBalloons(BALLOON_COUNT, w, h);

    let lastFrame = performance.now();

    function loop(now: number) {
      if (!canvas || !ctx) return;
      const dt = now - lastFrame;
      lastFrame = now;

      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;

      ctx.clearRect(0, 0, cw, ch);

      // Update + draw balloons
      for (const b of balloonsRef.current) {
        if (b.popped) continue;
        b.x += b.vx * dt * 0.06;
        b.y += b.vy * dt * 0.06;
        // Wrap: balloons going off top re-enter at bottom
        if (b.y + b.radius < 0) {
          b.y = ch + b.radius;
          b.x = b.radius + Math.random() * (cw - 2 * b.radius);
        }
        // Bounce off side walls
        if (b.x - b.radius < 0 || b.x + b.radius > cw) {
          b.vx *= -1;
        }

        // Draw balloon body
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          b.x - b.radius * 0.3,
          b.y - b.radius * 0.3,
          b.radius * 0.1,
          b.x,
          b.y,
          b.radius,
        );
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.3, b.color);
        grad.addColorStop(1, b.color);
        ctx.fillStyle = grad;
        ctx.fill();

        // Knot
        ctx.beginPath();
        ctx.moveTo(b.x - 5, b.y + b.radius);
        ctx.lineTo(b.x + 5, b.y + b.radius);
        ctx.lineTo(b.x, b.y + b.radius + 8);
        ctx.closePath();
        ctx.fillStyle = b.color;
        ctx.fill();

        // String
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.radius + 8);
        ctx.lineTo(b.x, b.y + b.radius + 30);
        ctx.strokeStyle = "rgba(100,100,100,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Update + draw particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.vy += 0.05 * dt * 0.06; // gravity
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life / 500);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Update timer display
      if (startTimeRef.current !== null && !endedRef.current) {
        setElapsedMs(performance.now() - startTimeRef.current);
      }

      animationRef.current = requestAnimationFrame(loop);
    }

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string) => {
    const count = 6 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 500,
      });
    }
  }, []);

  const handleTap = useCallback(
    async (clientX: number, clientY: number) => {
      if (endedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const balloon = hitTest(balloonsRef.current, x, y);
      if (!balloon) return;

      // Start timer on first pop
      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now();
      }

      // Pop the balloon
      balloon.popped = true;
      spawnParticles(balloon.x, balloon.y, balloon.color);
      popCountRef.current += 1;
      setPopCount(popCountRef.current);

      // Assign reveal balloon at 25% threshold
      const threshold = getRevealThreshold(BALLOON_COUNT);
      if (!revealAssignedRef.current && popCountRef.current >= threshold) {
        balloonsRef.current = assignReveal(balloonsRef.current);
        revealAssignedRef.current = true;
      }

      // If this was the reveal balloon, trigger reveal
      if (balloon.isReveal) {
        endedRef.current = true;
        const durationMs = startTimeRef.current
          ? performance.now() - startTimeRef.current
          : 0;

        // Pop all remaining balloons
        for (const b of balloonsRef.current) {
          if (!b.popped) {
            b.popped = true;
            spawnParticles(b.x, b.y, b.color);
          }
        }

        setRunning(false);

        try {
          const result = await revealGender({ name, durationMs });
          if ("error" in result) {
            setError(COPY.alreadyPlayed);
            return;
          }
          setReveal({ gender: result.revealedGender, durationMs });
          // Refresh leaderboard
          const res = await fetch("/api/leaderboard").catch(() => null);
          // Actually, we use server actions — re-fetch via getLeaderboard
          // But getLeaderboard is a server action; we can't call it from client directly
          // after revalidatePath already happened. The page will re-render.
          // For immediate update, we'll just prepend the new entry locally.
          setEntries((prev) => {
            const newEntry: LeaderboardEntry = {
              name: name.trim(),
              durationMs,
              timestamp: new Date().toISOString(),
            };
            return [...prev, newEntry].sort((a, b) => a.durationMs - b.durationMs);
          });
        } catch {
          setError(COPY.serverError);
        }
      }
    },
    [name, spawnParticles],
  );

  return (
    <div className="flex flex-col items-center w-full">
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pastel-cream/95 p-6 text-center">
          <div>
            <p className="text-lg text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="mt-4 rounded-full bg-pastel-gold px-6 py-2 font-semibold text-white shadow-md"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm mx-auto mb-2 flex items-center justify-between text-sm text-slate-600">
        <span>{popCount} / {BALLOON_COUNT}</span>
        {startTimeRef.current !== null && running && (
          <span>{(elapsedMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          handleTap(e.clientX, e.clientY);
        }}
        className="w-full max-w-sm mx-auto rounded-2xl border-2 border-pastel-gold/30 bg-white/50"
        style={{ height: "60vh", touchAction: "none" }}
      />

      <Leaderboard entries={entries} />

      {reveal && (
        <RevealOverlay
          gender={reveal.gender}
          durationMs={reveal.durationMs}
          onClose={() => setReveal(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Clean up the stray fetch call**

In the `handleTap` callback, remove the dead `fetch("/api/leaderboard")` line and its comment — the leaderboard is updated locally via `setEntries`. Replace the block:

```tsx
          // Refresh leaderboard
          const res = await fetch("/api/leaderboard").catch(() => null);
          // Actually, we use server actions — re-fetch via getLeaderboard
          // But getLeaderboard is a server action; we can't call it from client directly
          // after revalidatePath already happened. The page will re-render.
          // For immediate update, we'll just prepend the new entry locally.
          setEntries((prev) => {
```

with:

```tsx
          // Update leaderboard locally (revalidatePath refreshes server-side)
          setEntries((prev) => {
```

The final `handleTap` reveal block should be:

```tsx
        try {
          const result = await revealGender({ name, durationMs });
          if ("error" in result) {
            setError(COPY.alreadyPlayed);
            return;
          }
          setReveal({ gender: result.revealedGender, durationMs });
          // Update leaderboard locally (revalidatePath refreshes server-side)
          setEntries((prev) => {
            const newEntry: LeaderboardEntry = {
              name: name.trim(),
              durationMs,
              timestamp: new Date().toISOString(),
            };
            return [...prev, newEntry].sort((a, b) => a.durationMs - b.durationMs);
          });
        } catch {
          setError(COPY.serverError);
        }
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (all types resolve now)

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/BalloonGame.tsx
git commit -m "feat: BalloonGame canvas component"
```

---

### Task 10: Main page (Server Component)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Rewrite `app/page.tsx`**

```tsx
import { NameEntry } from "./components/NameEntry";
import { BalloonGame } from "./components/BalloonGame";
import { Leaderboard } from "./components/Leaderboard";
import { getLeaderboard } from "./actions";
import { COPY } from "@/lib/german";

export default async function Page() {
  const entries = await getLeaderboard();

  return (
    <main className="flex min-h-screen flex-col items-center justify-start px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold text-pastel-pinkDeep">
          {COPY.title}
        </h1>
        <p className="mt-1 text-slate-600">{COPY.subtitle}</p>
      </header>

      <NameEntryClient />

      <div id="leaderboard" className="w-full">
        <Leaderboard entries={entries} />
      </div>
    </main>
  );
}
```

Wait — `NameEntry` is a client component (it uses `useState`). It needs to be rendered as a client component boundary. Since `NameEntry` already has `"use client"` at the top, it can be imported into a Server Component and Next.js handles the boundary automatically. But `NameEntry` calls `onStart` which needs to swap to the game view — that's client-side state. So we need a wrapper client component that manages the name → game transition.

Let me restructure: create a client wrapper that holds the name state and renders either `NameEntry` or `BalloonGame`.

- [ ] **Step 2: Create `app/components/GameWrapper.tsx`**

```tsx
"use client";

import { useState } from "react";
import { NameEntry } from "./NameEntry";
import { BalloonGame } from "./BalloonGame";
import type { LeaderboardEntry } from "@/lib/types";

interface GameWrapperProps {
  initialEntries: LeaderboardEntry[];
}

export function GameWrapper({ initialEntries }: GameWrapperProps) {
  const [name, setName] = useState<string | null>(null);

  return (
    <>
      {name ? (
        <BalloonGame name={name} initialEntries={initialEntries} />
      ) : (
        <NameEntry onStart={setName} />
      )}
    </>
  );
}
```

- [ ] **Step 3: Write final `app/page.tsx`**

```tsx
import { NameEntry } from "./components/NameEntry";
import { GameWrapper } from "./components/GameWrapper";
import { Leaderboard } from "./components/Leaderboard";
import { getLeaderboard } from "./actions";
import { COPY } from "@/lib/german";

export default async function Page() {
  const entries = await getLeaderboard();

  return (
    <main className="flex min-h-screen flex-col items-center justify-start px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold text-pastel-pinkDeep">
          {COPY.title}
        </h1>
        <p className="mt-1 text-slate-600">{COPY.subtitle}</p>
      </header>

      <GameWrapper initialEntries={entries} />

      <div id="leaderboard" className="w-full">
        <Leaderboard entries={entries} />
      </div>
    </main>
  );
}
```

Wait — this renders `Leaderboard` twice (once inside `BalloonGame` via `GameWrapper`, once at the bottom). Let me fix: the bottom `Leaderboard` is for the pre-game view (when no name entered yet). The `BalloonGame` has its own leaderboard inside it for the post-game view. That's actually fine — the bottom one shows the current leaderboard to people who haven't entered a name yet, and the one inside `BalloonGame` updates after the reveal. But it would show twice during gameplay. Let me simplify: remove the leaderboard from inside `BalloonGame` and always render it at the page level. After a reveal, `revalidatePath` refreshes the server-rendered leaderboard.

But then the immediate local update won't show until page refresh. For a better UX, let's keep the leaderboard inside `BalloonGame` and remove it from the page bottom (pre-game players don't need to see it — or we can show it in both places; the pre-game one is read-only and server-rendered, the in-game one updates locally).

Simplest approach: remove the bottom leaderboard. `GameWrapper` handles both states. Pre-game shows just the name entry. Post-name-entry shows the game + leaderboard.

- [ ] **Step 4: Write final `app/page.tsx` (cleaned up)**

```tsx
import { GameWrapper } from "./components/GameWrapper";
import { getLeaderboard } from "./actions";
import { COPY } from "@/lib/german";

export default async function Page() {
  const entries = await getLeaderboard();

  return (
    <main className="flex min-h-screen flex-col items-center justify-start px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold text-pastel-pinkDeep">
          {COPY.title}
        </h1>
        <p className="mt-1 text-slate-600">{COPY.subtitle}</p>
      </header>

      <GameWrapper initialEntries={entries} />
    </main>
  );
}
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/components/GameWrapper.tsx
git commit -m "feat: main page as Server Component with GameWrapper"
```

---

### Task 11: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run all tests + typecheck + lint**

```bash
npm test && npm run typecheck && npm run lint
```
Expected: all PASS

- [ ] **Step 2: Start dev server**

```bash
cp .env.example .env.local
# Edit .env.local: set REVEAL_GENDER=girl
npm run dev
```

- [ ] **Step 3: Play through in browser**

Open http://localhost:3000:
- Page loads with header "Baby-Ballons" and subtitle.
- Enter "Testspieler" → "Los geht's" → balloon canvas appears.
- Tap balloons — they pop with particle burst, pop count increments.
- After ~8 pops (25% of 30), a reveal balloon is silently assigned.
- Continue popping until the reveal balloon is hit.
- All remaining balloons pop, confetti bursts, overlay "Es ist ein Mädchen!" with time.
- "Zur Rangliste" dismisses overlay, leaderboard shows entry with time.
- Refresh page → name entry again. Enter "Testspieler" again → start → pop a balloon → error "Du hast bereits aufgedeckt!"

- [ ] **Step 4: Test with `REVEAL_GENDER=boy`**

Stop server, change `.env.local` to `REVEAL_GENDER=boy`, restart. Play with a new name — confirm overlay says "Es ist ein Junge!".

- [ ] **Step 5: Verify no gender leak in page source**

View page source (Ctrl+U) — confirm `boy` or `girl` does not appear in the HTML or JS bundles before the reveal balloon is popped.

- [ ] **Step 6: Commit if any fixes were needed**

(Only commit if changes were made during verification.)

---

### Task 12: Deploy to Vercel

**Files:** none (deployment only)

- [ ] **Step 1: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 2: Verify on phone**

Open the production URL on a phone:
- Play a full round, confirm balloon pop + reveal + confetti.
- Confirm leaderboard persists across page reloads.
- Confirm German copy throughout.
- Confirm `REVEAL_GENDER` env var is still set in Vercel (unchanged from slot machine).

- [ ] **Step 3: Share the link**

Share the production URL with family.

---

## Self-Review Notes

- **Spec coverage:**
  - Architecture (Server Actions, no API routes) → Task 6 ✓
  - Game flow (name → balloons → pop → 25% → reveal) → Task 9 ✓
  - German UI → Task 4 + all components ✓
  - Hidden gender (server-side, via Server Action) → Task 6 ✓
  - Leaderboard persistence + sorting by durationMs → Task 3, 6, 7 ✓
  - Pastel visual design → existing Tailwind tokens + canvas ✓
  - Confetti on reveal → Task 8 (reuses existing Confetti component) ✓
  - `already_played` guard → Task 3, 6 ✓
  - Dev KV fallback → Task 3 ✓
  - Canvas balloon game → Task 9 ✓
  - Pure game logic (TDD) → Task 5 ✓
  - Timer (first pop to reveal) → Task 9 ✓
  - 25% threshold reveal assignment → Task 5, 9 ✓
  - Delete old code → Task 1 ✓

- **No placeholders:** All code blocks complete. Self-revisions in Task 9 (dead fetch call removed) and Task 10 (Leaderboard duplication resolved) done inline.

- **Type consistency:** `Balloon`, `Gender`, `LeaderboardEntry`, `RevealResult` defined in Task 2 and used consistently. `revealGender` and `getLeaderboard` defined in Task 6, used in Task 9 and Task 10. `createBalloons`, `hitTest`, `assignReveal`, `getRevealThreshold` defined in Task 5, used in Task 9.
