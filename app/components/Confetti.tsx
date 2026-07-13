"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import type { Gender } from "@/lib/types";

const NEUTRAL_COLORS = ["#E6B800", "#FFF8F0", "#DDDDDD"];
const GENDER_COLORS: Record<Gender, string[]> = {
  boy: ["#BFD7FF", "#8FB8FF"],
  girl: ["#FFD1DC", "#FF9CB6"],
};

const TOTAL_DURATION = 10000;
const BLEND_START = 500;
const BLEND_END = 5000;

/**
 * Fires confetti for 10 seconds. Starts neutral gold, gradually blends
 * in the gender color from 0.5s to 5s, then full gender color for the
 * remaining 5s. The `gender` prop can arrive at any point — it's stored
 * in a ref and picked up by the animation loop.
 */
export function Confetti({ gender }: { gender?: Gender }) {
  const rafRef = useRef<number | null>(null);
  const genderRef = useRef<Gender | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();
    const end = startRef.current + TOTAL_DURATION;

    function frame() {
      const now = Date.now();
      const elapsed = now - startRef.current;
      const colors = currentColors(elapsed, genderRef.current);

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
        particleCount: 4,
        angle: 90,
        spread: 100,
        origin: { y: 0.5 },
        colors,
      });

      if (now < end) {
        rafRef.current = requestAnimationFrame(frame);
      }
    }

    frame();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (gender) {
      genderRef.current = gender;
    }
  }, [gender]);

  return null;
}

function currentColors(elapsedMs: number, gender: Gender | null): string[] {
  if (!gender || elapsedMs < BLEND_START) {
    return NEUTRAL_COLORS;
  }
  if (elapsedMs >= BLEND_END) {
    // Full gender color — no more neutral
    return [...GENDER_COLORS[gender], ...GENDER_COLORS[gender]];
  }
  // Blend: gradually replace neutral with gender colors
  const progress = (elapsedMs - BLEND_START) / (BLEND_END - BLEND_START);
  const total = 5;
  const genderCount = Math.round(progress * total);
  const picked: string[] = [];
  for (let i = 0; i < total; i++) {
    if (i < genderCount) {
      picked.push(GENDER_COLORS[gender][i % GENDER_COLORS[gender].length]);
    } else {
      picked.push(NEUTRAL_COLORS[i % NEUTRAL_COLORS.length]);
    }
  }
  return picked;
}
