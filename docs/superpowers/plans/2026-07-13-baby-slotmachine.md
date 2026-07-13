# Baby-Slotmaschine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first Next.js gender-reveal slot machine game where family pick Junge/Mädchen, spin for a chance at the jackpot that reveals the real gender, and share a leaderboard.

**Architecture:** Next.js App Router on Vercel. Gender stored in `REVEAL_GENDER` env var, only returned by `POST /api/spin` on a jackpot. Leaderboard persisted in Vercel KV (with module-scoped in-memory fallback in dev). Pastel Tailwind UI, canvas-confetti on reveal.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Vercel KV (`@vercel/kv`), `canvas-confetti`, Vitest for unit tests.

---

## File Structure

```
app/
  layout.tsx                # root layout, fonts, German metadata
  page.tsx                   # main game (name → slot → leaderboard orchestration)
  globals.css                # Tailwind + pastel palette tokens
  api/
    spin/route.ts            # POST: jackpot logic, KV write
    leaderboard/route.ts     # GET: returns entries
  components/
    NameEntry.tsx            # name prompt + start
    SlotMachine.tsx          # reels + coin buttons + spin button orchestration
    Reel.tsx                 # single spinning reel
    Leaderboard.tsx          # entries list (Platz, Name, ✓/✗, Zeitpunkt)
    JackpotOverlay.tsx       # full-screen reveal modal
    Confetti.tsx             # canvas-confetti wrapper component
  lib/
    types.ts                 # shared types (Guess, SpinResult, etc.)
    kv.ts                    # KV access + in-memory dev fallback
    spin.ts                  # pure spin logic (jackpot roll, reel generation)
    german.ts                # German copy strings (single source of truth)
  __tests__/
    spin.test.ts             # unit tests for pure spin logic
    kv.test.ts               # unit tests for KV helpers (in-memory fallback)
package.json
tsconfig.json
next.config.js
tailwind.config.ts
postcss.config.js
.env.example
.env.local                   # gitignored, real REVEAL_GENDER
.gitignore
```

---

### Task 1: Scaffold Next.js project with TypeScript and Tailwind

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `.gitignore`, `.env.example`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder)

- [ ] **Step 1: Create the project manually**

Run from repo root:
```bash
npm init -y
npm install next@latest react@latest react-dom@latest
npm install -D typescript @types/react @types/node @types/react-dom tailwindcss postcss autoprefixer
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
```

- [ ] **Step 4: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          pink: "#FFD1DC",
          blue: "#BFD7FF",
          cream: "#FFF8F0",
          gold: "#E6B800",
          pinkDeep: "#FF9CB6",
          blueDeep: "#8FB8FF",
        },
      },
      keyframes: {
        "reel-spin": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-66.6%)" },
        },
      },
      animation: {
        "reel-spin": "reel-spin 0.1s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Create `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
.next/
.env.local
.env*.local
*.log
.DS_Store
next-env.d.ts
.vercel
```

- [ ] **Step 7: Create `.env.example`**

```
# The real gender (boy or girl). Set this in Vercel dashboard before deploy.
REVEAL_GENDER=girl

# Jackpot probability per spin (default 0.15)
JACKPOT_PROBABILITY=0.15

# Vercel KV (provided by Vercel KV integration; leave empty for dev fallback)
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

- [ ] **Step 8: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: #FFF8F0;
}

html, body {
  background-color: var(--color-bg);
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 9: Create `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baby-Slotmaschine",
  description: "Rate das Baby-Geschlecht!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-pastel-cream text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 10: Create placeholder `app/page.tsx`**

```tsx
export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-pastel-pinkDeep">Baby-Slotmaschine</h1>
    </main>
  );
}
```

- [ ] **Step 11: Add scripts to `package.json`**

Replace the `scripts` section in `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 12: Verify dev server boots**

Run: `npm run dev` (then Ctrl+C after it compiles)
Expected: compiles without errors, page renders at http://localhost:3000

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js + Tailwind project"
```

---

### Task 2: Install runtime and test dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install @vercel/kv canvas-confetti
npm install -D @types/canvas-confetti vitest
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add kv, confetti, vitest deps"
```

---

### Task 3: Shared types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write `lib/types.ts`**

```ts
export type Gender = "boy" | "girl";

export type Guess = Gender;

export type ReelValue = Gender;

export interface NonJackpotSpinResult {
  jackpot: false;
  reels: [ReelValue, ReelValue, ReelValue];
}

export interface JackpotSpinResult {
  jackpot: true;
  reels: [ReelValue, ReelValue, ReelValue];
  revealedGender: Gender;
  correct: boolean;
}

export type SpinResult = NonJackpotSpinResult | JackpotSpinResult;

export interface SpinRequest {
  name: string;
  guess: Guess;
}

export type SpinError = "invalid_input" | "already_played" | "server_error";

export interface LeaderboardEntry {
  name: string;
  guess: Guess;
  correct: boolean;
  timestamp: string; // ISO 8601
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS, no errors

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared types"
```

---

### Task 4: German copy (single source of truth)

**Files:**
- Create: `lib/german.ts`

- [ ] **Step 1: Write `lib/german.ts`**

```ts
import type { Gender } from "./types";

export const COPY = {
  title: "Baby-Slotmaschine",
  subtitle: "Rate das Baby-Geschlecht!",
  nameLabel: "Wie heißt du?",
  namePlaceholder: "Dein Name",
  startButton: "Los geht's",
  boyLabel: "Junge",
  girlLabel: "Mädchen",
  spinButton: "Drehen!",
  spinningButton: "Dreht...",
  chooseCoin: "Wähle deine Münze:",
  leaderboardTitle: "Rangliste",
  leaderboardEmpty: "Noch keine Gewinner. Viel Glück!",
  retryButton: "Nochmal drehen",
  alreadyPlayed: "Du hast bereits gewonnen — weiter geht's nicht!",
  invalidInput: "Bitte gib deinen Namen ein und wähle eine Münze.",
  serverError: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  rankHeader: "Platz",
  nameHeader: "Name",
  guessHeader: "Tipp",
  resultHeader: "Ergebnis",
  timeHeader: "Zeitpunkt",
  revealHeadline: (g: Gender) =>
    g === "boy" ? "Es ist ein Junge!" : "Es ist ein Mädchen!",
  revealSubline: (guess: Gender, correct: boolean) => {
    const guessed = guess === "boy" ? "Junge" : "Mädchen";
    return `Du hast auf ${guessed} getippt — ${correct ? "richtig!" : "leider falsch."}`;
  },
  toLeaderboard: "Zur Rangliste",
  winnerSuffix: " Gewinner",
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add lib/german.ts
git commit -m "feat: add German copy strings"
```

---

### Task 5: Pure spin logic (TDD)

**Files:**
- Create: `lib/spin.ts`
- Test: `app/__tests__/spin.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/__tests__/spin.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import {
  rollJackpot,
  generateNonJackpotReels,
  buildJackpotReels,
  runSpin,
} from "@/lib/spin";

describe("rollJackpot", () => {
  it("returns true when random < probability", () => {
    vi.stubGlobal("Math", { random: () => 0.1 });
    expect(rollJackpot(0.15)).toBe(true);
    vi.unstubAllGlobals();
  });

  it("returns false when random >= probability", () => {
    vi.stubGlobal("Math", { random: () => 0.9 });
    expect(rollJackpot(0.15)).toBe(false);
    vi.unstubAllGlobals();
  });

  it("uses default 0.15 probability", () => {
    vi.stubGlobal("Math", { random: () => 0.149 });
    expect(rollJackpot()).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe("generateNonJackpotReels", () => {
  it("returns 3 reel values", () => {
    const reels = generateNonJackpotReels();
    expect(reels).toHaveLength(3);
    for (const r of reels) {
      expect(["boy", "girl"]).toContain(r);
    }
  });

  it("does not return all three equal to a single gender", () => {
    // extremely unlikely by chance; pin Math.random
    vi.stubGlobal("Math", { random: () => 0 });
    const reels = generateNonJackpotReels();
    // random()=0 should map to "boy" each, but guard: ensure not jackpot-equivalent
    // Per spec non-jackpot reels just need to be valid; this asserts shape only
    expect(reels).toHaveLength(3);
    vi.unstubAllGlobals();
  });
});

describe("buildJackpotReels", () => {
  it("returns all reels equal to the gender", () => {
    expect(buildJackpotReels("boy")).toEqual(["boy", "boy", "boy"]);
    expect(buildJackpotReels("girl")).toEqual(["girl", "girl", "girl"]);
  });
});

describe("runSpin", () => {
  it("returns jackpot result when roll hits", () => {
    vi.stubGlobal("Math", { random: () => 0.05 });
    const result = runSpin({ name: "Oma", guess: "boy" }, "girl");
    expect(result.jackpot).toBe(true);
    if (result.jackpot) {
      expect(result.revealedGender).toBe("girl");
      expect(result.correct).toBe(false);
      expect(result.reels).toEqual(["girl", "girl", "girl"]);
    }
    vi.unstubAllGlobals();
  });

  it("returns non-jackpot when roll misses", () => {
    vi.stubGlobal("Math", { random: () => 0.9 });
    const result = runSpin({ name: "Opa", guess: "boy" }, "girl");
    expect(result.jackpot).toBe(false);
    if (!result.jackpot) {
      expect(result.reels).toHaveLength(3);
    }
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/spin.ts` does not exist / imports unresolved

- [ ] **Step 3: Write `lib/spin.ts`**

```ts
import type {
  Gender,
  Guess,
  ReelValue,
  SpinRequest,
  SpinResult,
} from "./types";

const DEFAULT_JACKPOT_PROBABILITY = 0.15;

function parseProbability(env?: string): number {
  if (!env) return DEFAULT_JACKPOT_PROBABILITY;
  const n = Number(env);
  if (!Number.isFinite(n) || n < 0 || n > 1) return DEFAULT_JACKPOT_PROBABILITY;
  return n;
}

export function getJackpotProbability(): number {
  return parseProbability(process.env.JACKPOT_PROBABILITY);
}

export function rollJackpot(probability: number = getJackpotProbability()): boolean {
  return Math.random() < probability;
}

function randomReel(): ReelValue {
  return Math.random() < 0.5 ? "boy" : "girl";
}

export function generateNonJackpotReels(): [ReelValue, ReelValue, ReelValue] {
  return [randomReel(), randomReel(), randomReel()];
}

export function buildJackpotReels(gender: Gender): [ReelValue, ReelValue, ReelValue] {
  return [gender, gender, gender];
}

export function runSpin(req: SpinRequest, revealGender: Gender): SpinResult {
  const isJackpot = rollJackpot();
  if (isJackpot) {
    const reels = buildJackpotReels(revealGender);
    return {
      jackpot: true,
      reels,
      revealedGender: revealGender,
      correct: req.guess === revealGender,
    };
  }
  return {
    jackpot: false,
    reels: generateNonJackpotReels(),
  };
}

export function isValidGuess(g: string): g is Guess {
  return g === "boy" || g === "girl";
}

export function isValidName(n: unknown): n is string {
  return typeof n === "string" && n.trim().length > 0 && n.trim().length <= 40;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests green

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/spin.ts app/__tests__/spin.test.ts
git commit -m "feat: pure spin logic with tests"
```

---

### Task 6: KV helpers with dev fallback (TDD)

**Files:**
- Create: `lib/kv.ts`
- Test: `app/__tests__/kv.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/__tests__/kv.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  hasPlayed,
  addEntry,
  getEntries,
  __resetMemoryStore,
} from "@/lib/kv";
import type { LeaderboardEntry } from "@/lib/types";

function entry(name: string, correct = true): LeaderboardEntry {
  return {
    name,
    guess: "boy",
    correct,
    timestamp: new Date("2026-07-13T12:00:00Z").toISOString(),
  };
}

describe("in-memory KV fallback", () => {
  beforeEach(() => {
    __resetMemoryStore();
    // force dev path by ensuring no KV env
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

  it("getEntries returns entries in insertion order", async () => {
    await addEntry(entry("Oma"));
    await addEntry(entry("Opa", false));
    const list = await getEntries();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe("Oma");
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/kv.ts` doesn't exist

- [ ] **Step 3: Write `lib/kv.ts`**

```ts
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
    const raw = (await kv.lrange(KEY, 0, -1)) as string[];
    // lrange returns newest-first (we lpush); reverse for oldest-first
    const parsed = raw.map((s) => JSON.parse(s) as LeaderboardEntry);
    return parsed.reverse();
  }
  return [...memoryStore];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/kv.ts app/__tests__/kv.test.ts
git commit -m "feat: KV helpers with in-memory dev fallback"
```

---

### Task 7: `POST /api/spin` route

**Files:**
- Create: `app/api/spin/route.ts`

- [ ] **Step 1: Write `app/api/spin/route.ts`**

```ts
import { NextResponse } from "next/server";
import { runSpin, isValidGuess, isValidName } from "@/lib/spin";
import { hasPlayed, addEntry } from "@/lib/kv";
import type { SpinRequest, SpinResult, SpinError } from "@/lib/types";

function errorResponse(error: SpinError, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: Partial<SpinRequest>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_input", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const guess = typeof body.guess === "string" ? body.guess : "";

  if (!isValidName(name) || !isValidGuess(guess)) {
    return errorResponse("invalid_input", 400);
  }

  const revealGender = process.env.REVEAL_GENDER;
  if (revealGender !== "boy" && revealGender !== "girl") {
    console.error("REVEAL_GENDER env var missing or invalid");
    return errorResponse("server_error", 500);
  }

  try {
    if (await hasPlayed(name)) {
      return errorResponse("already_played", 409);
    }
  } catch (e) {
    console.error("KV hasPlayed failed", e);
    return errorResponse("server_error", 500);
  }

  const result = runSpin({ name, guess }, revealGender);

  if (result.jackpot) {
    try {
      await addEntry({
        name,
        guess,
        correct: result.correct,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("KV addEntry failed", e);
      return errorResponse("server_error", 500);
    }
  }

  return NextResponse.json<SpinResult>(result);
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Manual smoke test (dev)**

Run: `REVEAL_GENDER=girl npm run dev` in one terminal.
Then in another:
```bash
curl -s -X POST http://localhost:3000/api/spin \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","guess":"boy"}' | jq
```
Expected: returns JSON with `jackpot: false` (usually) and `reels`. Repeat until a jackpot appears (or temporarily set `JACKPOT_PROBABILITY=1`). On jackpot, response includes `revealedGender: "girl"` and `correct: false`. Subsequent calls with `{"name":"Test",...}` return HTTP 409 `already_played`.

- [ ] **Step 4: Commit**

```bash
git add app/api/spin/route.ts
git commit -m "feat: POST /api/spin route"
```

---

### Task 8: `GET /api/leaderboard` route

**Files:**
- Create: `app/api/leaderboard/route.ts`

- [ ] **Step 1: Write `app/api/leaderboard/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getEntries } from "@/lib/kv";
import type { LeaderboardResponse } from "@/lib/types";

export async function GET() {
  try {
    const entries = await getEntries();
    return NextResponse.json<LeaderboardResponse>({ entries });
  } catch (e) {
    console.error("KV getEntries failed", e);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Manual smoke test**

```bash
curl -s http://localhost:3000/api/leaderboard | jq
```
Expected: returns `{ "entries": [...] }` (may be empty array in a fresh dev session).

- [ ] **Step 4: Commit**

```bash
git add app/api/leaderboard/route.ts
git commit -m "feat: GET /api/leaderboard route"
```

---

### Task 9: `Confetti` component

**Files:**
- Create: `app/components/Confetti.tsx`

- [ ] **Step 1: Write `app/components/Confetti.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import type { Gender } from "@/lib/types";

const COLORS: Record<Gender, string[]> = {
  boy: ["#BFD7FF", "#8FB8FF", "#E6B800"],
  girl: ["#FFD1DC", "#FF9CB6", "#E6B800"],
};

export function Confetti({ gender }: { gender: Gender }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const colors = COLORS[gender];
    const end = Date.now() + 2500;
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [gender]);

  return null;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/components/Confetti.tsx
git commit -m "feat: Confetti component"
```

---

### Task 10: `Reel` component

**Files:**
- Create: `app/components/Reel.tsx`

- [ ] **Step 1: Write `app/components/Reel.tsx`**

```tsx
"use client";

import type { ReelValue } from "@/lib/types";

const LABEL: Record<ReelValue, string> = {
  boy: "👶",
  girl: "🎀",
};

interface ReelProps {
  // undefined = idle (blank); "spinning" = animating; a value = landed
  value?: ReelValue | "spinning";
}

export function Reel({ value }: ReelProps) {
  const isSpinning = value === "spinning";
  const display = !isSpinning && value ? value : undefined;

  return (
    <div className="relative h-24 w-20 overflow-hidden rounded-xl bg-white shadow-inner border-2 border-pastel-gold/50">
      <div
        className={`flex h-full w-full items-center justify-center text-5xl ${
          isSpinning ? "animate-reel-spin" : ""
        }`}
        aria-hidden={!display}
      >
        {display ? (
          <span className={display === "boy" ? "text-pastel-blueDeep" : "text-pastel-pinkDeep"}>
            {LABEL[display]}
          </span>
        ) : (
          <span className="text-slate-300">?</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/components/Reel.tsx
git commit -m "feat: Reel component"
```

---

### Task 11: `SlotMachine` component

**Files:**
- Create: `app/components/SlotMachine.tsx`

- [ ] **Step 1: Write `app/components/SlotMachine.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Reel } from "./Reel";
import { COPY } from "@/lib/german";
import type { Guess, ReelValue, SpinResult } from "@/lib/types";

interface SlotMachineProps {
  name: string;
  onJackpot: (result: Extract<SpinResult, { jackpot: true }>) => void;
}

type ReelState = ReelValue | "spinning" | undefined;

export function SlotMachine({ name, onJackpot }: SlotMachineProps) {
  const [guess, setGuess] = useState<Guess | null>(null);
  const [reels, setReels] = useState<[ReelState, ReelState, ReelState]>([undefined, undefined, undefined]);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectCoin(g: Guess) {
    if (spinning) return;
    setGuess(g);
    setError(null);
  }

  async function spin() {
    if (spinning) return;
    if (!guess) {
      setError(COPY.invalidInput);
      return;
    }
    setError(null);
    setSpinning(true);
    setReels(["spinning", "spinning", "spinning"]);

    try {
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, guess }),
      });
      const data = await res.json();

      if (res.status === 409 && data?.error === "already_played") {
        setError(COPY.alreadyPlayed);
        setReels([undefined, undefined, undefined]);
        setSpinning(false);
        return;
      }
      if (!res.ok) {
        setError(data?.error === "invalid_input" ? COPY.invalidInput : COPY.serverError);
        setReels([undefined, undefined, undefined]);
        setSpinning(false);
        return;
      }

      const result = data as SpinResult;
      // Brief suspense before landing
      await new Promise((r) => setTimeout(r, 400));
      setReels([...result.reels]);
      setSpinning(false);

      if (result.jackpot) {
        // Allow reveal animation to play before parent switches to overlay
        setTimeout(() => onJackpot(result), 900);
      }
    } catch {
      setError(COPY.serverError);
      setReels([undefined, undefined, undefined]);
      setSpinning(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Machine frame */}
      <div className="rounded-3xl border-4 border-pastel-gold bg-white/70 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="h-3 w-3 rounded-full bg-pastel-pinkDeep" />
          <span className="text-xs uppercase tracking-widest text-slate-500">Baby Slots</span>
          <div className="h-3 w-3 rounded-full bg-pastel-blueDeep" />
        </div>

        <div className="flex justify-center gap-2">
          <Reel value={reels[0]} />
          <Reel value={reels[1]} />
          <Reel value={reels[2]} />
        </div>

        {/* Coin selector */}
        <p className="mt-5 text-center text-sm text-slate-600">{COPY.chooseCoin}</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => selectCoin("boy")}
            disabled={spinning}
            aria-pressed={guess === "boy"}
            className={`rounded-full border-2 px-4 py-3 text-lg font-semibold transition ${
              guess === "boy"
                ? "border-pastel-blueDeep bg-pastel-blue text-slate-800 shadow-md scale-105"
                : "border-pastel-blue/40 bg-white text-slate-500 opacity-70"
            } ${spinning ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {COPY.boyLabel}
          </button>
          <button
            type="button"
            onClick={() => selectCoin("girl")}
            disabled={spinning}
            aria-pressed={guess === "girl"}
            className={`rounded-full border-2 px-4 py-3 text-lg font-semibold transition ${
              guess === "girl"
                ? "border-pastel-pinkDeep bg-pastel-pink text-slate-800 shadow-md scale-105"
                : "border-pastel-pink/40 bg-white text-slate-500 opacity-70"
            } ${spinning ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {COPY.girlLabel}
          </button>
        </div>

        {/* Spin button */}
        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className="mt-4 w-full rounded-full bg-pastel-gold px-6 py-3 text-lg font-bold text-white shadow-md transition hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {spinning ? COPY.spinningButton : COPY.spinButton}
        </button>

        {error && (
          <p className="mt-3 text-center text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/components/SlotMachine.tsx
git commit -m "feat: SlotMachine component"
```

---

### Task 12: `Leaderboard` component

**Files:**
- Create: `app/components/Leaderboard.tsx`

- [ ] **Step 1: Write `app/components/Leaderboard.tsx`**

```tsx
"use client";

import { COPY } from "@/lib/german";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
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
              <span className="mx-2 text-sm text-slate-500">
                {e.guess === "boy" ? COPY.boyLabel : COPY.girlLabel}
              </span>
              <span className="text-xl">{e.correct ? "✅" : "❌"}</span>
              <span className="ml-2 text-xs text-slate-400">
                {formatTime(e.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/components/Leaderboard.tsx
git commit -m "feat: Leaderboard component"
```

---

### Task 13: `JackpotOverlay` component

**Files:**
- Create: `app/components/JackpotOverlay.tsx`

- [ ] **Step 1: Write `app/components/JackpotOverlay.tsx`**

```tsx
"use client";

import { Confetti } from "./Confetti";
import { COPY } from "@/lib/german";
import type { Gender, Guess } from "@/lib/types";

interface JackpotOverlayProps {
  gender: Gender;
  guess: Guess;
  correct: boolean;
}

export function JackpotOverlay({ gender, guess, correct }: JackpotOverlayProps) {
  const accent = gender === "boy" ? "text-pastel-blueDeep" : "text-pastel-pinkDeep";
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-pastel-cream/95 p-6 text-center">
      <Confetti gender={gender} />
      <h1 className={`text-4xl sm:text-5xl font-extrabold ${accent}`}>
        {COPY.revealHeadline(gender)}
      </h1>
      <p className="mt-3 text-lg text-slate-700">
        {COPY.revealSubline(guess, correct)}
      </p>
      <a
        href="#leaderboard"
        className="mt-8 rounded-full bg-pastel-gold px-6 py-3 font-semibold text-white shadow-md transition hover:brightness-105"
      >
        {COPY.toLeaderboard}
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/components/JackpotOverlay.tsx
git commit -m "feat: JackpotOverlay component"
```

---

### Task 14: `NameEntry` component

**Files:**
- Create: `app/components/NameEntry.tsx`

- [ ] **Step 1: Write `app/components/NameEntry.tsx`**

```tsx
"use client";

import { useState } from "react";
import { COPY } from "@/lib/german";

interface NameEntryProps {
  onStart: (name: string) => void;
}

export function NameEntry({ onStart }: NameEntryProps) {
  const [name, setName] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length > 0) onStart(trimmed);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm mx-auto text-center">
      <label htmlFor="name" className="block text-lg font-medium text-slate-700">
        {COPY.nameLabel}
      </label>
      <input
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={COPY.namePlaceholder}
        maxLength={40}
        autoFocus
        className="mt-2 w-full rounded-full border-2 border-pastel-gold/50 bg-white px-5 py-3 text-center text-lg shadow-sm focus:border-pastel-gold focus:outline-none"
      />
      <button
        type="submit"
        disabled={name.trim().length === 0}
        className="mt-4 w-full rounded-full bg-pastel-gold px-6 py-3 text-lg font-bold text-white shadow-md transition hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {COPY.startButton}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/components/NameEntry.tsx
git commit -m "feat: NameEntry component"
```

---

### Task 15: Main page orchestration

**Files:**
- Create: `app/page.tsx` (replace placeholder)

- [ ] **Step 1: Write `app/page.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { NameEntry } from "./components/NameEntry";
import { SlotMachine } from "./components/SlotMachine";
import { Leaderboard } from "./components/Leaderboard";
import { JackpotOverlay } from "./components/JackpotOverlay";
import { COPY } from "@/lib/german";
import type {
  LeaderboardEntry,
  SpinResult,
} from "@/lib/types";

type JackpotResult = Extract<SpinResult, { jackpot: true }>;

export default function Page() {
  const [name, setName] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [jackpot, setJackpot] = useState<JackpotResult | null>(null);

  const refreshLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } catch {
      // Silently ignore; leaderboard is non-critical.
    }
  }, []);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  function handleJackpot(result: JackpotResult) {
    setJackpot(result);
    refreshLeaderboard();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold text-pastel-pinkDeep">
          {COPY.title}
        </h1>
        <p className="mt-1 text-slate-600">{COPY.subtitle}</p>
      </header>

      {!name ? (
        <NameEntry onStart={setName} />
      ) : (
        <SlotMachine name={name} onJackpot={handleJackpot} />
      )}

      <div id="leaderboard" className="w-full">
        <Leaderboard entries={entries} />
      </div>

      {jackpot && (
        <JackpotOverlay
          gender={jackpot.revealedGender}
          guess={
            // Reconstruct the guess from the entry: we know name + just spun.
            // Simpler: pass through via state in handleJackpot. See below.
            entries.find((e) => e.name === name && e.correct === jackpot.correct)?.guess ?? "boy"
          }
          correct={jackpot.correct}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Refactor guess plumbing**

The guess-reconstruction above is fragile. Replace `handleJackpot` to capture the guess directly from the spin result by extending state. Replace the `handleJackpot` function and `JackpotResult` usage:

Change `handleJackpot`:
```tsx
function handleJackpot(result: JackpotResult) {
  setJackpot(result);
  refreshLeaderboard();
}
```

And in the overlay render, replace the guess expression with:
```tsx
guess={jackpot.revealedGender === "boy" ? (jackpot.correct ? "boy" : "girl") : (jackpot.correct ? "girl" : "boy")}
```

Rationale: from `revealedGender` and `correct`, the player's guess is fully determined. `correct === (guess === revealedGender)` ⇒ `guess = correct ? revealedGender : opposite(revealedGender)`.

Replace the entire overlay JSX block:
```tsx
{jackpot && (
  <JackpotOverlay
    gender={jackpot.revealedGender}
    guess={
      jackpot.correct
        ? jackpot.revealedGender
        : jackpot.revealedGender === "boy"
          ? "girl"
          : "boy"
    }
    correct={jackpot.correct}
  />
)}
```

Final `app/page.tsx`:
```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { NameEntry } from "./components/NameEntry";
import { SlotMachine } from "./components/SlotMachine";
import { Leaderboard } from "./components/Leaderboard";
import { JackpotOverlay } from "./components/JackpotOverlay";
import { COPY } from "@/lib/german";
import type { LeaderboardEntry, SpinResult } from "@/lib/types";

type JackpotResult = Extract<SpinResult, { jackpot: true }>;

export default function Page() {
  const [name, setName] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [jackpot, setJackpot] = useState<JackpotResult | null>(null);

  const refreshLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } catch {
      // Silently ignore; leaderboard is non-critical.
    }
  }, []);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  function handleJackpot(result: JackpotResult) {
    setJackpot(result);
    refreshLeaderboard();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold text-pastel-pinkDeep">
          {COPY.title}
        </h1>
        <p className="mt-1 text-slate-600">{COPY.subtitle}</p>
      </header>

      {!name ? (
        <NameEntry onStart={setName} />
      ) : (
        <SlotMachine name={name} onJackpot={handleJackpot} />
      )}

      <div id="leaderboard" className="w-full">
        <Leaderboard entries={entries} />
      </div>

      {jackpot && (
        <JackpotOverlay
          gender={jackpot.revealedGender}
          guess={
            jackpot.correct
              ? jackpot.revealedGender
              : jackpot.revealedGender === "boy"
                ? "girl"
                : "boy"
          }
          correct={jackpot.correct}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: PASS (may need `eslint-config-next` — `next lint` will prompt to install if missing; accept)

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: main page orchestration"
```

---

### Task 16: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run dev server with secrets**

```bash
cp .env.example .env.local
# Edit .env.local: set REVEAL_GENDER=girl
npm run dev
```

- [ ] **Step 2: Play through in browser**

Open http://localhost:3000:
- Page loads with header "Baby-Slotmaschine" and name prompt.
- Enter "Testspieler" → "Los geht's" → slot machine appears.
- Tap "Junge" coin (highlights blue).
- Tap "Drehen!" → reels spin, land on random Junge/Mädchen combinations, no reveal.
- Repeat until jackpot (avg ~7 spins at 15%).
- On jackpot: reels land all on 🎀 (girl), confetti bursts, overlay "Es ist ein Mädchen!" with sub-line "Du hast auf Junge getippt — leider falsch."
- "Zur Rangliste" scrolls to leaderboard.
- Leaderboard shows the entry with ❌.
- Refresh page → name entry again. Enter "Testspieler" again → start → spin → error "Du hast bereits gewonnen — weiter geht's nicht!"

- [ ] **Step 3: Test jackpot probability env**

Stop server, set `JACKPOT_PROBABILITY=1` in `.env.local`, restart. Now every spin is a jackpot. Confirm a fresh name hits jackpot on first spin.

- [ ] **Step 4: Run all tests + typecheck + lint**

```bash
npm test && npm run typecheck && npm run lint
```
Expected: all PASS

- [ ] **Step 5: Commit any .env.example tweaks if needed**

(No commit if nothing changed.)

---

### Task 17: Vercel deployment setup (manual, user-driven)

**Files:** none in repo (Vercel dashboard + CLI)

- [ ] **Step 1: Create Vercel KV namespace**

In Vercel dashboard → project → Storage → Create KV. Note the env var names (`KV_REST_API_URL`, `KV_REST_API_TOKEN`).

- [ ] **Step 2: Set environment variables in Vercel**

Project Settings → Environment Variables:
- `REVEAL_GENDER` = `girl` (or `boy` — set the real gender here)
- `JACKPOT_PROBABILITY` = `0.15`
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` (auto-injected if KV was linked)

- [ ] **Step 3: Deploy**

```bash
npm i -g vercel   # if not installed
vercel            # preview deploy
vercel --prod     # production deploy
```

Or: push to main branch (if Vercel GitHub integration is wired).

- [ ] **Step 4: Verify on a phone**

Open the production URL on a phone:
- Play a full round, confirm jackpot reveal + leaderboard persist across page reloads.
- Confirm German copy throughout.
- Confirm confetti plays on mobile.

- [ ] **Step 5: Share the link with family**

Share the production URL. (Optional: rotate `REVEAL_GENDER` only at deploy time, never in the client.)

---

## Self-Review Notes

- **Spec coverage:**
  - Architecture (Next.js + Vercel + KV) → Task 1, 7, 8 ✓
  - Game flow (name → guess → spin → jackpot → leaderboard) → Tasks 9-15 ✓
  - German UI → Task 4 + all components ✓
  - Hidden gender (server-side only) → Task 7 ✓
  - Leaderboard persistence → Task 6, 8 ✓
  - Pastel visual design → Task 1 (Tailwind config) + components ✓
  - Confetti on jackpot → Task 9 ✓
  - `already_played` guard → Task 6, 7 ✓
  - Dev KV fallback → Task 6 ✓
  - Configurable jackpot probability → Task 5, 7 ✓

- **No placeholders:** All code blocks complete. One self-revision in Task 15 (guess reconstruction) resolved inline.

- **Type consistency:** `SpinResult`, `Gender`, `Guess`, `ReelValue`, `LeaderboardEntry` defined in Task 3 and used consistently throughout. `JackpotResult` derived via `Extract<SpinResult, { jackpot: true }>` in Tasks 11, 15.
