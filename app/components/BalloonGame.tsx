"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { revealGender } from "@/app/actions";
import { RevealOverlay } from "./RevealOverlay";
import { Confetti } from "./Confetti";
import { Leaderboard } from "./Leaderboard";
import {
  createBalloons,
  hitTest,
} from "@/lib/balloon";
import { COPY } from "@/lib/german";
import type { Balloon, Gender, LeaderboardEntry } from "@/lib/types";

const BALLOON_COUNT = 100;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

interface BalloonGameProps {
  name: string;
  initialEntries: LeaderboardEntry[];
  onExit: () => void;
}

export function BalloonGame({ name, initialEntries, onExit }: BalloonGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const balloonsRef = useRef<Balloon[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const popCountRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const endedRef = useRef(false);
  const dragRef = useRef<{
    id: number;
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  const [popCount, setPopCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(true);
  const [timerStarted, setTimerStarted] = useState(false);
  const [reveal, setReveal] = useState<{ gender: Gender; durationMs: number } | null>(null);
  const [confettiGender, setConfettiGender] = useState<Gender | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.onselectstart = () => false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener("resize", resize);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    balloonsRef.current = createBalloons(BALLOON_COUNT, w, h);

    let lastFrame = performance.now();

    function loop(now: number) {
      if (!canvas || !ctx) return;
      const dt = now - lastFrame;
      lastFrame = now;

      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;

      ctx.clearRect(0, 0, cw, ch);

      const dragId = dragRef.current?.moved ? dragRef.current.id : -1;

      function drawBalloon(b: Balloon, glow: boolean) {
        if (!ctx) return;
        const r = glow ? b.radius * 1.08 : b.radius;
        if (glow) {
          ctx.save();
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 20;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          b.x - r * 0.3,
          b.y - r * 0.3,
          r * 0.1,
          b.x,
          b.y,
          r,
        );
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.4, b.color);
        grad.addColorStop(1, b.color);
        ctx.fillStyle = grad;
        ctx.fill();
        if (glow) ctx.restore();

        ctx.beginPath();
        ctx.moveTo(b.x - 3, b.y + r);
        ctx.lineTo(b.x + 3, b.y + r);
        ctx.lineTo(b.x, b.y + r + 5);
        ctx.closePath();
        ctx.fillStyle = b.color;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(b.x, b.y + r + 5);
        ctx.lineTo(b.x, b.y + r + 18);
        ctx.strokeStyle = "rgba(100,100,100,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (const b of balloonsRef.current) {
        if (b.popped) continue;
        if (b.id === dragId) continue; // draw dragged balloon last
        b.x += b.vx * dt * 0.06;
        b.y += b.vy * dt * 0.06;
        // Reflect off all boundaries
        if (b.x - b.radius < 0) {
          b.x = b.radius;
          b.vx *= -1;
        } else if (b.x + b.radius > cw) {
          b.x = cw - b.radius;
          b.vx *= -1;
        }
        if (b.y - b.radius < 0) {
          b.y = b.radius;
          b.vy *= -1;
        } else if (b.y + b.radius > ch) {
          b.y = ch - b.radius;
          b.vy *= -1;
        }

        drawBalloon(b, false);
      }

      // Draw dragged balloon on top with glow
      if (dragId >= 0) {
        const dragged = balloonsRef.current.find((b) => b.id === dragId);
        if (dragged && !dragged.popped) {
          // Clamp to canvas while dragging
          dragged.x = Math.max(dragged.radius, Math.min(cw - dragged.radius, dragged.x));
          dragged.y = Math.max(dragged.radius, Math.min(ch - dragged.radius, dragged.y));
          drawBalloon(dragged, true);
        }
      }

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.vy += 0.05 * dt * 0.06;
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life / 500);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (startTimeRef.current !== null && !endedRef.current) {
        setElapsedMs(performance.now() - startTimeRef.current);
      }

      animationRef.current = requestAnimationFrame(loop);
    }

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string) => {
    const count = 6 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 500,
      });
    }
  }, []);

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    balloonsRef.current = createBalloons(BALLOON_COUNT, canvas.clientWidth, canvas.clientHeight);
    particlesRef.current = [];
    popCountRef.current = 0;
    startTimeRef.current = null;
    endedRef.current = false;
    setPopCount(0);
    setElapsedMs(0);
    setRunning(true);
    setTimerStarted(false);
    setReveal(null);
    setLoading(false);
    setConfettiGender(undefined);
  }, []);

  const popBalloon = useCallback(
    async (balloon: Balloon) => {
      if (endedRef.current) return;

      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now();
        setTimerStarted(true);
      }

      balloon.popped = true;
      spawnParticles(balloon.x, balloon.y, balloon.color);
      popCountRef.current += 1;
      setPopCount(popCountRef.current);

      if (popCountRef.current >= BALLOON_COUNT) {
        endedRef.current = true;
        const durationMs = startTimeRef.current
          ? performance.now() - startTimeRef.current
          : 0;

        for (const b of balloonsRef.current) {
          if (!b.popped) {
            b.popped = true;
            spawnParticles(b.x, b.y, b.color);
          }
        }

        setRunning(false);
        setLoading(true);

        // Start confetti immediately with neutral colors
        const revealStartTime = Date.now();

        try {
          const result = await revealGender({ name, durationMs });
          // Blend confetti to gender color (Confetti component picks this up)
          setConfettiGender(result.revealedGender);

          // Enforce minimum suspense before showing text
          const elapsed = Date.now() - revealStartTime;
          const remaining = Math.max(0, 8000 - elapsed);
          setTimeout(() => {
            // Update leaderboard only when the reveal text is shown
            setEntries((prev) => {
              const newEntry: LeaderboardEntry = {
                name: name.trim(),
                durationMs,
                timestamp: new Date().toISOString(),
              };
              const filtered = prev.filter(
                (e) => e.name.trim().toLowerCase() !== name.trim().toLowerCase(),
              );
              return [...filtered, newEntry].sort((a, b) => a.durationMs - b.durationMs);
            });
            setReveal({ gender: result.revealedGender, durationMs });
            setLoading(false);
          }, remaining);
        } catch {
          setError(COPY.serverError);
          setLoading(false);
        }
      }
    },
    [name, spawnParticles],
  );

  const handlePointerDown = useCallback(
    (clientX: number, clientY: number, pointerId: number) => {
      if (endedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const balloon = hitTest(balloonsRef.current, x, y);
      if (!balloon) return;

      dragRef.current = {
        id: balloon.id,
        pointerId,
        startX: x,
        startY: y,
        offsetX: x - balloon.x,
        offsetY: y - balloon.y,
        moved: false,
      };
    },
    [],
  );

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const dx = x - drag.startX;
    const dy = y - drag.startY;
    if (!drag.moved && dx * dx + dy * dy > 25) {
      drag.moved = true;
    }
    if (drag.moved) {
      const balloon = balloonsRef.current.find((b) => b.id === drag.id);
      if (balloon && !balloon.popped) {
        balloon.x = x - drag.offsetX;
        balloon.y = y - drag.offsetY;
        balloon.vx = 0;
        balloon.vy = 0;
      }
    }
  }, []);

  const handlePointerUp = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (!drag.moved) {
        // Treat as tap: pop the balloon under the pointer (or the original)
        const balloon =
          hitTest(balloonsRef.current, x, y) ??
          balloonsRef.current.find((b) => b.id === drag.id);
        if (balloon && !balloon.popped) {
          void popBalloon(balloon);
        }
      } else {
        // Released after drag: give it a gentle nudge
        const balloon = balloonsRef.current.find((b) => b.id === drag.id);
        if (balloon && !balloon.popped) {
          balloon.vx = (Math.random() - 0.5) * 0.5;
          balloon.vy = (Math.random() - 0.5) * 0.5;
        }
      }
    },
    [popBalloon],
  );

  return (
    <div className="flex flex-col items-center w-full">
      {(loading || reveal) && (
        <Confetti gender={confettiGender} />
      )}

      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pastel-cream/95 p-6 text-center">
          <div>
            <p className="text-lg text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="mt-4 rounded-full bg-pastel-gold px-6 py-2 font-semibold text-white shadow-md"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm mx-auto mb-2 grid grid-cols-3 items-center text-sm text-slate-600">
        <button
          type="button"
          onClick={onExit}
          className="justify-self-start text-slate-500 underline hover:text-slate-700"
        >
          ← Zurück
        </button>
        <span className="justify-self-center tabular-nums">{popCount} / {BALLOON_COUNT}</span>
        <span className="justify-self-end tabular-nums">
          {timerStarted && running ? `${(elapsedMs / 1000).toFixed(1)}s` : "\u00A0"}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointerDown(e.clientX, e.clientY, e.pointerId);
        }}
        onPointerMove={(e) => {
          handlePointerMove(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          handlePointerUp(e.clientX, e.clientY);
        }}
        onPointerCancel={(e) => {
          handlePointerUp(e.clientX, e.clientY);
        }}
        className="w-full max-w-sm mx-auto rounded-2xl border-2 border-pastel-gold/30 bg-white/50 h-[60vh] touch-none select-none"
      />

      <Leaderboard entries={entries} />

      {reveal && (
        <RevealOverlay
          gender={reveal.gender}
          durationMs={reveal.durationMs}
          onClose={resetGame}
        />
      )}

      {!running && !reveal && (
        <button
          type="button"
          onClick={resetGame}
          className="mt-4 rounded-full bg-pastel-gold px-6 py-3 font-semibold text-white shadow-md transition hover:brightness-105"
        >
          Nochmal spielen
        </button>
      )}
    </div>
  );
}
