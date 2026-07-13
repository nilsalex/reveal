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
