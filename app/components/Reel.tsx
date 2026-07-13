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
