"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import type { Gender } from "@/lib/types";

const COLORS: Record<Gender, string[]> = {
  boy: ["#BFD7FF", "#8FB8FF", "#E6B800"],
  girl: ["#FFD1DC", "#FF9CB6", "#E6B800"],
};

export function Confetti({ gender }: { gender: Gender }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const colors = COLORS[gender];
    const end = Date.now() + 2500;
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [gender]);

  return null;
}
