"use client";

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
