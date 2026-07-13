"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import type { Gender } from "@/lib/types";

const GOLD = "#E6B800";
const BOY_COLORS = ["#BFD7FF", "#8FB8FF"];
const GIRL_COLORS = ["#FFD1DC", "#FF9CB6"];
const BOTH_COLORS = [...BOY_COLORS, ...GIRL_COLORS];

const TOTAL_DURATION = 10000;
const OSCILLATION_END = 5000;

/**
 * Fires confetti for 10 seconds. During the first 5 seconds, pink and blue
 * are both mixed in randomly — the ratio oscillates, creating suspense.
 * Over time it settles toward the actual gender color. After 5s, only the
 * gender color remains. The `gender` prop can arrive at any point.
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
  if (elapsedMs >= OSCILLATION_END) {
    // Settled: full gender color only
    if (!gender) return [GOLD];
    const gc = gender === "boy" ? BOY_COLORS : GIRL_COLORS;
    return [...gc, ...gc, GOLD];
  }

  const progress = elapsedMs / OSCILLATION_END; // 0 → 1

  // Random oscillation factor — how much the "wrong" color bleeds in
  // Starts high (lots of both colors), dampens toward 0
  const oscillation = (Math.sin(elapsedMs * 0.008) + Math.sin(elapsedMs * 0.013)) * 0.5;
  const wrongWeight = Math.max(0, (1 - progress) * (0.5 + 0.5 * oscillation));
  const rightWeight = progress + (1 - progress) * 0.5;

  const rightColors = gender ? (gender === "boy" ? BOY_COLORS : GIRL_COLORS) : [];
  const wrongColors = gender ? (gender === "boy" ? GIRL_COLORS : BOY_COLORS) : [];

  const picked: string[] = [GOLD];

  if (!gender) {
    // Gender not known yet — mix both equally with gold
    picked.push(...BOTH_COLORS);
    return picked;
  }

  // Add right colors proportional to rightWeight
  const rightCount = Math.max(1, Math.round(rightWeight * 3));
  for (let i = 0; i < rightCount; i++) {
    picked.push(rightColors[i % rightColors.length]);
  }

  // Add wrong colors proportional to wrongWeight (dampens over time)
  const wrongCount = Math.round(wrongWeight * 3);
  for (let i = 0; i < wrongCount; i++) {
    picked.push(wrongColors[i % wrongColors.length]);
  }

  return picked;
}
