# Baby-Slotmaschine — Gender Reveal Game

**Date:** 2026-07-13
**Status:** Approved (design)

## Overview

A mobile-first web game where family members guess the baby's gender (Junge / Mädchen) by selecting a coin and spinning a pastel baby-shower-themed slot machine. Each spin has a random chance (~15%) to hit the "jackpot," which reveals the real gender with confetti and updates a shared leaderboard. Designed to be shared via a link; players open it on their phones.

## Goals

- Family can play on their phones via a public Vercel URL.
- Real gender stays hidden until a player hits the jackpot — not visible in page source.
- Shared, persistent leaderboard of who guessed correctly.
- German UI throughout. Pastel baby-shower aesthetic.

## Non-Goals

- Auth / accounts.
- Rate limiting (family-only, low traffic).
- Multiple games / rounds per person (one jackpot per name).
- Vegas-style flashy visuals.

## Architecture

- **Platform:** Next.js (App Router, TypeScript) on Vercel.
- **Frontend:** Single page — name entry → slot machine → leaderboard. Mobile-first, responsive.
- **Backend:** Two serverless API routes:
  - `POST /api/spin` — decides spin outcome server-side; returns reels and, on jackpot, the revealed gender. Writes to leaderboard on jackpot.
  - `GET /api/leaderboard` — returns the list of jackpot entries.
- **Secret storage:** Real gender stored in Vercel env var `REVEAL_GENDER=boy|girl`. Never shipped in client bundle.
- **Leaderboard storage:** Vercel KV (Redis), free tier. Single list key `jackpot_entries`.
- **Why server-side spin outcomes:** If the client decided outcomes, the gender could be inferred or read from the bundle. The client only renders what the server returns.

## Game Flow & Mechanics

1. **Entry:** Player lands on page, sees a name prompt ("Wie heißt du?"). Enters name, clicks "Los geht's" to unlock the slot machine.
2. **Guess:** Before each spin, player picks a coin — **Junge** (blue) or **Mädchen** (pink).
3. **Spin:** Client calls `POST /api/spin` with `{ name, guess }`.
   - **Non-jackpot (~85%):** Server returns 3 random reel values. Client animates reels landing on those values. No gender revealed.
   - **Jackpot (~15%, configurable via `JACKPOT_PROBABILITY`):** All 3 reels land on the real gender (from env var). Server returns `revealedGender` and writes a leaderboard entry. Client plays full reveal animation: reels slow, land on real gender, confetti bursts in matching color, message "Es ist ein [Junge/Mädchen]!" with whether the guess matched.
4. **After jackpot:** Game over for that player. Server rejects further spins from the same name (HTTP 409 `already_played`). Player sees final result + their place on the leaderboard.
5. **Leaderboard:** Shown alongside the machine, refreshes after each spin. Shows everyone who hit the jackpot, their guess, whether correct, and order (1st reveal, 2nd, etc.). Players who haven't hit yet aren't shown.

**Edge cases:**
- Same name reused after jackpot → rejected with friendly German message.
- Player who hasn't hit jackpot yet can spin repeatedly with the same name (no entry written until jackpot).

## UI & Visual Design

- **Palette:** Soft pastel pink `#FFD1DC`, baby blue `#BFD7FF`, cream background `#FFF8F0`, warm gold accents `#E6B800`. Confetti in pink + blue + gold.
- **Layout (mobile-first):**
  - **Header:** "Baby-Slotmaschine", subtitle "Rate das Baby-Geschlecht!"
  - **Pre-game:** Centered name input + "Los geht's" button.
  - **Main game:**
    - Slot machine: 3 reels in a gold-trimmed frame, coin slot graphic on top.
    - Below reels: two big coin buttons — blue "Junge" / pink "Mädchen". Player taps one to set guess, then taps "Drehen!".
    - Selected coin glows; the other dims.
  - **Leaderboard:** Below machine, card list: Platz, Name, ✓/✗ for correct guess, Zeitpunkt. Updates after each spin.
  - **Post-jackpot:** Machine dims, full-screen confetti overlay, big "Es ist ein JUNGE!" / "Es ist ein MÄDCHEN!" headline in matching color, sub-line "Du hast auf [Junge/Mädchen] getippt — [richtig! / leider falsch]." "Zur Rangliste" scroll cue.
- **Animations:**
  - Reels: CSS keyframe spin, deceleration to final server-provided values.
  - Confetti: `canvas-confetti` on jackpot.
  - Coin selection: subtle pulse on selected coin.
- **Responsive:** Phone-first; works on desktop. Reels scale to viewport width.
- **Language:** All user-facing strings German. Code identifiers English.

## Data Model & API Contracts

### Vercel KV

- List key: `jackpot_entries`. Each entry:
  ```json
  { "name": "string", "guess": "boy|girl", "correct": "boolean", "timestamp": "ISO8601" }
  ```
- Leaderboard = full list ordered by timestamp ascending (earliest = 1st place).

### `POST /api/spin`

- **Request:** `{ "name": "string", "guess": "boy"|"girl" }`
- **Logic:**
  1. Validate name non-empty, guess is "boy" or "girl" — else HTTP 400 `invalid_input`.
  2. Check KV: if `name` already has a jackpot entry → HTTP 409 `already_played`.
  3. Roll jackpot with probability `JACKPOT_PROBABILITY` (default 0.15).
  4. **Non-jackpot:** generate 3 random reel values, return:
     `{ "jackpot": false, "reels": ["boy"|"girl", "boy"|"girl", "boy"|"girl"] }`
  5. **Jackpot:** read `REVEAL_GENDER`, return:
     `{ "jackpot": true, "reels": ["<gender>","<gender>","<gender>"], "revealedGender": "<gender>", "correct": <guess === gender> }`
     and write entry to KV.
- Gender never returned on non-jackpot spins.

### `GET /api/leaderboard`

- **Response:** `{ "entries": [{ "name","guess","correct","timestamp" }, ...] }` ordered by timestamp ascending.

### Error Handling

- Invalid input → HTTP 400 `{ "error": "invalid_input" }`
- Already played → HTTP 409 `{ "error": "already_played" }`
- KV failure → HTTP 500 `{ "error": "server_error" }` (graceful German message on UI)
- Network/unexpected errors: client shows friendly German retry message.

## Tech Stack & Project Structure

- **Framework:** Next.js (App Router, TypeScript)
- **Storage:** Vercel KV (Redis)
- **Styling:** Tailwind CSS (pastel tokens, responsive)
- **Confetti:** `canvas-confetti`
- No other runtime deps.

```
app/
  layout.tsx              # root layout, fonts, metadata (German)
  page.tsx                # main game UI (name → slot → leaderboard)
  api/
    spin/route.ts         # POST handler (jackpot logic, KV write)
    leaderboard/route.ts  # GET handler (returns entries)
  components/
    NameEntry.tsx
    SlotMachine.tsx       # reels + coin selection + spin button
    Reel.tsx
    Leaderboard.tsx
    JackpotOverlay.tsx
    Confetti.tsx           # canvas-confetti wrapper
  lib/
    kv.ts                  # KV access helpers
    types.ts               # shared types (Guess, SpinResult, etc.)
  styles/
    globals.css            # Tailwind + pastel palette tokens
```

### Environment Variables

Set in local `.env` (gitignored) and Vercel project settings:
- `REVEAL_GENDER=boy|girl` — the secret gender.
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` — provided by Vercel KV integration.
- `JACKPOT_PROBABILITY=0.15` — optional, default 0.15.

### Local Development

- `npm run dev` for the Next.js app.
- `vercel env pull` to fetch KV creds locally.
- Without KV connected, the API routes will error on KV access. For local dev convenience, a fallback in-memory store (module-scoped Map) is used when `KV_REST_API_URL` is unset — this lets the developer spin and see the leaderboard locally, but state resets on reload and isn't shared across instances. The fallback is gated on `NODE_ENV === 'development'` and never active in production.

### Deployment

- `vercel deploy` or git push to main.
- Set `REVEAL_GENDER` in the Vercel dashboard before deploying — this is how the real gender is "set".

## Open Questions

None at design time. Jackpot probability (0.15) is configurable via env var if it feels too rare/common in playtesting.
