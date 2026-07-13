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
