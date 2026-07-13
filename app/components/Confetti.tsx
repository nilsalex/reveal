"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import type { Gender } from "@/lib/types";

const NEUTRAL_COLORS = ["#E6B800", "#FFF8F0", "#DDDDDD"];
const GENDER_COLORS: Record<Gender, string[]> = {
  boy: ["#BFD7FF", "#8FB8FF"],
  girl: ["#FFD1DC", "#FF9CB6"],
};

const TOTAL_DURATION = 5000;
const BLEND_START = 1500;
const BLEND_END = 4500;

/**
 * Fires confetti for 5 seconds. Starts neutral gold, then gradually
 * blends in the gender color between 1.5s and 4.5s. The `gender` prop
 * can arrive at any point during the animation — it's stored in a ref
 * and picked up by the animation loop.
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
    // Full gender color with gold accent
    return [...GENDER_COLORS[gender], "#E6B800"];
  }
  // Blend: interpolate ratio of neutral vs gender colors
  const progress = (elapsedMs - BLEND_START) / (BLEND_END - BLEND_START);
  const genderCount = Math.round(progress * GENDER_COLORS[gender].length);
  const neutralCount = GENDER_COLORS[gender].length - genderCount;
  const picked: string[] = [];
  for (let i = 0; i < neutralCount; i++) {
    picked.push(NEUTRAL_COLORS[i % NEUTRAL_COLORS.length]);
  }
  for (let i = 0; i < genderCount; i++) {
    picked.push(GENDER_COLORS[gender][i % GENDER_COLORS[gender].length]);
  }
  picked.push("#E6B800");
  return picked;
}
