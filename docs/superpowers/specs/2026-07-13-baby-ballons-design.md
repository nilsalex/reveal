# Baby-Ballons — Gender Reveal Balloon Pop Game

**Date:** 2026-07-13
**Status:** Approved (design)

## Overview

A mobile-first web game where family members pop pastel balloons floating on screen. After 25% of balloons are popped, one remaining balloon is randomly tagged as the "reveal" balloon — popping it triggers the gender reveal with confetti. A shared leaderboard tracks who found the reveal balloon fastest (duration from first pop to reveal pop). Replaces the previous slot machine game.

## Goals

- Family can play on their phones via the existing Vercel URL.
- Real gender stays hidden until the reveal balloon is popped — not visible in page source or client bundle.
- Shared, persistent leaderboard sorted by fastest reveal time.
- German UI throughout. Pastel baby-shower aesthetic.

## Non-Goals

- Auth / accounts.
- Rate limiting (family-only, low traffic).
- Multiple games per person (one reveal per name).
- Guess mechanic (no boy/girl prediction — just find and pop the reveal balloon).
- Waves or timed phases — balloons just float continuously.

## Architecture

- **Platform:** Next.js (App Router, TypeScript) on Vercel. Reuses existing Upstash Redis + `@vercel/kv` setup.
- **Server Actions (not API routes):** Next.js Server Actions handle all server-side logic. No `/api/*` routes, no manual `fetch` calls in client code. The page is a Server Component that fetches the leaderboard at render; after a reveal, `revalidatePath("/")` refreshes the data.
  - `revealGender({ name, durationMs })` — reads `REVEAL_GENDER` env var, writes leaderboard entry, returns the gender.
  - `getLeaderboard()` — reads entries from KV, sorted by `durationMs` ascending.
- **Frontend:** Single page — name entry → balloon canvas game → leaderboard. The page is a Server Component that renders a client `<BalloonGame>` component, passing the initial leaderboard as props.
- **Game engine:** HTML5 `<canvas>` fullscreen. Balloons are objects `{ x, y, vx, vy, radius, color, popped, isReveal }`. `requestAnimationFrame` loop drives movement and rendering. Tap/click hit-tests against balloon list (topmost first).
- **Secret storage:** `REVEAL_GENDER` env var. Only returned by the `revealGender` Server Action when the reveal balloon is popped. Never in client bundle.
- **Leaderboard storage:** Upstash Redis (via `@vercel/kv`). Key `reveal_entries`.

## Game Flow & Mechanics

1. **Name entry:** Player lands on page, sees "Wie heißt du?" prompt. Enters name, clicks "Los geht's" to unlock the game.
2. **Balloon field:** ~30 pastel balloons (pink, blue, cream, gold hues) drift upward slowly with gentle horizontal sway. Balloons that float off the top re-enter at the bottom (wrapping).
3. **Popping:** Tap a balloon → it pops (burst animation: 6–8 small particles in the balloon's color, fade and fall with gravity, ~500ms). Pop count increments. The balloon is removed from the field.
4. **Reveal assignment:** When popped count reaches 25% of initial total (e.g. 8 of 30), one random remaining balloon is tagged `isReveal = true`. It looks identical to all others — no visual difference.
5. **Reveal pop:** When the tagged balloon is popped:
   - Timer stops.
   - Client calls `revealGender({ name, durationMs })` Server Action.
   - Server returns `{ revealedGender }`.
   - All remaining balloons pop simultaneously in a wave.
   - Full-screen confetti in the revealed gender's color (pink or blue + gold).
   - Overlay: "Es ist ein Junge!" / "Es ist ein Mädchen!" with the player's time.
   - Leaderboard refreshes via `revalidatePath`, sorted fastest-first.
6. **Timer:** Starts on first pop (not on page load — lets people read the screen first). Stops on reveal pop. Displayed as seconds (e.g. "12.3s"). `durationMs` sent to server.
7. **After reveal:** Game is over for that player. Same name can't reveal again (server returns `already_played`). Client shows "Du hast bereits aufgedeckt!" and skips to leaderboard view.

**Edge cases:**
- Same name reused after reveal → rejected with friendly German message.
- Player pops all balloons without hitting 25% threshold — impossible, since assignment happens at 25%, so the reveal balloon always exists before all are popped.
- Last balloon popped happens to be the reveal one → reveal still triggers normally.

## UI & Visual Design

- **Palette:** Same pastel tokens — pink `#FFD1DC`, blue `#BFD7FF`, cream `#FFF8F0`, gold `#E6B800`, deep variants (`pinkDeep #FF9CB6`, `blueDeep #8FB8FF`) for accents and text.
- **Balloons:** Canvas circles with a small triangle knot at the bottom and a thin string line. Filled with pastel gradients (each balloon picks randomly from pink/blue/cream/gold hues). Soft highlight dot for glossy look. Sized ~50–70px radius.
- **Pop animation:** 6–8 small particles burst outward in the balloon's color, fade and fall with gravity, ~500ms. Rendered on the same canvas.
- **Layout (mobile-first):**
  - **Header:** "Baby-Ballons", subtitle "Ploppe die Ballons, um das Baby-Geschlecht zu enthüllen!"
  - **Pre-game:** Centered name input + "Los geht's" button.
  - **Game:** Full-screen canvas. Small HUD overlay top-center: pop count (e.g. "5 / 30") and timer (e.g. "3.2s") once the timer starts.
  - **Leaderboard:** Below the canvas area. Card list: rank, name, time (seconds). "Rangliste" heading.
  - **Post-reveal overlay:** Full-screen confetti, "Es ist ein Junge!" / "Es ist ein Mädchen!" in matching color, sub-line "Deine Zeit: 12.3s", "Zur Rangliste" button to dismiss.
- **Confetti:** `canvas-confetti` library on reveal, in pink + gold (girl) or blue + gold (boy).
- **Responsive:** Canvas fills the viewport. On desktop, balloons are larger and more spread out. Touch-first interaction.
- **Language:** All user-facing strings German. Code identifiers English.

## Data Model & Types

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
```

**KV storage:**
- Key: `reveal_entries`.
- Each entry: `{ name, durationMs, timestamp }`.
- `getEntries()` returns all, sorted by `durationMs` ascending (fastest first).

**Server Action `revealGender({ name, durationMs })`:**
1. Validate name (non-empty, ≤40 chars) and `durationMs` (positive number).
2. Check `hasPlayed(name)` → if true, return `{ error: "already_played" }`.
3. Read `REVEAL_GENDER` env var. If missing/invalid, throw (caught by Next.js error boundary).
4. Write entry to KV: `{ name, durationMs, timestamp: new Date().toISOString() }`.
5. `revalidatePath("/")`.
6. Return `{ revealedGender }`.

**Server Action `getLeaderboard()`:**
1. Read entries from KV.
2. Sort by `durationMs` ascending.
3. Return array.

**Error handling:**
- Invalid input → thrown error (caught by Next.js error boundary), client shows friendly German message.
- Already played → `{ error: "already_played" }`, client shows "Du hast bereits aufgedeckt!"
- KV failure → thrown error, caught by Next.js error boundary.

## Tech Stack & Project Structure

- **Framework:** Next.js (App Router, TypeScript)
- **Storage:** Upstash Redis via `@vercel/kv`
- **Styling:** Tailwind CSS (existing pastel tokens)
- **Confetti:** `canvas-confetti`
- **Testing:** Vitest
- No new runtime deps.

```
app/
  layout.tsx                # unchanged
  page.tsx                  # Server Component: fetches leaderboard, renders BalloonGame
  globals.css               # unchanged
  actions.ts                # NEW — "use server" functions (revealGender, getLeaderboard)
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
  balloon.ts                # NEW — pure game logic (balloon creation, hit-testing, reveal assignment)
  __tests__/
    balloon.test.ts          # NEW — tests for pure logic
    kv.test.ts               # updated tests
```

**Deleted:**
- `app/api/spin/route.ts`
- `app/api/leaderboard/route.ts`
- `app/components/SlotMachine.tsx`
- `app/components/Reel.tsx`
- `app/components/JackpotOverlay.tsx`
- `lib/spin.ts`
- `app/__tests__/spin.test.ts`

**Pure logic in `lib/balloon.ts` (unit-testable, no canvas dependency):**
- `createBalloons(count, width, height): Balloon[]` — random positions, velocities, colors.
- `hitTest(balloons, x, y): Balloon | null` — topmost balloon at point.
- `assignReveal(balloons): Balloon[]` — picks a random non-popped balloon, tags `isReveal = true`.
- `getRevealThreshold(total): number` — `Math.ceil(total * 0.25)`.

### Environment Variables

Unchanged:
- `REVEAL_GENDER=boy|girl` — the secret gender.
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` — Upstash Redis REST credentials.

### Local Development

- `npm run dev` for the Next.js app.
- Without KV env vars, the KV helpers use the in-memory dev fallback (module-scoped Map).
- Set `REVEAL_GENDER` in `.env.local` for local testing.

### Deployment

- `vercel --prod` or git push to main.
- `REVEAL_GENDER` already set in Vercel project settings.
- Upstash Redis already linked.
