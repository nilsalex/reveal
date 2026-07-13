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
