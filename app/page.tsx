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
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (active && res.ok) {
          const data = await res.json();
          setEntries(data.entries ?? []);
        }
      } catch {
        // Silently ignore; leaderboard is non-critical.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
