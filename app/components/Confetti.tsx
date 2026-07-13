"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import type { Gender } from "@/lib/types";

const NEUTRAL_COLORS = ["#E6B800", "#FFF8F0", "#DDD"];
const GENDER_COLORS: Record<Gender, string[]> = {
  boy: ["#BFD7FF", "#8FB8FF", "#E6B800"],
  girl: ["#FFD1DC", "#FF9CB6", "#E6B800"],
};

/**
 * Fires confetti immediately with neutral colors, then blends to the
 * gender color when `gender` is provided. This masks server latency —
 * the user sees confetti right away, and it transitions to pink/blue
 * once the gender is known.
 */
export function Confetti({ gender }: { gender?: Gender }) {
  const intervalRef = useRef<number | null>(null);
  const genderRef = useRef<Gender | null>(null);

  useEffect(() => {
    const end = Date.now() + 3500;

    function frame() {
      const colors =
        genderRef.current !== null
          ? blendColors(NEUTRAL_COLORS, GENDER_COLORS[genderRef.current])
          : NEUTRAL_COLORS;
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 90,
        spread: 100,
        origin: { y: 0.5 },
        colors,
      });
      if (Date.now() < end) {
        intervalRef.current = requestAnimationFrame(frame);
      }
    }

    frame();

    return () => {
      if (intervalRef.current) cancelAnimationFrame(intervalRef.current);
    };
  }, []);

  // When gender arrives, switch colors
  useEffect(() => {
    if (gender) {
      genderRef.current = gender;
    }
  }, [gender]);

  return null;
}

function blendColors(
  neutral: string[],
  target: string[],
): string[] {
  // Once gender is set, return target colors mixed with some gold
  // for a smooth visual transition
  return [...target, "#E6B800"];
}
