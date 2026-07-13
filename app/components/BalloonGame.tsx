"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { revealGender } from "@/app/actions";
import { RevealOverlay } from "./RevealOverlay";
import { Confetti } from "./Confetti";
import { Leaderboard } from "./Leaderboard";
import {
  createBalloons,
  hitTest,
  assignReveal,
  getRevealThreshold,
} from "@/lib/balloon";
import { COPY } from "@/lib/german";
import type { Balloon, Gender, LeaderboardEntry } from "@/lib/types";

const BALLOON_COUNT = 30;

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
  const revealAssignedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const endedRef = useRef(false);

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

      for (const b of balloonsRef.current) {
        if (b.popped) continue;
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

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          b.x - b.radius * 0.3,
          b.y - b.radius * 0.3,
          b.radius * 0.1,
          b.x,
          b.y,
          b.radius,
        );
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.4, b.color);
        grad.addColorStop(1, b.color);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(b.x - 3, b.y + b.radius);
        ctx.lineTo(b.x + 3, b.y + b.radius);
        ctx.lineTo(b.x, b.y + b.radius + 5);
        ctx.closePath();
        ctx.fillStyle = b.color;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.radius + 5);
        ctx.lineTo(b.x, b.y + b.radius + 18);
        ctx.strokeStyle = "rgba(100,100,100,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
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
    revealAssignedRef.current = false;
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

  const handleTap = useCallback(
    async (clientX: number, clientY: number) => {
      if (endedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const balloon = hitTest(balloonsRef.current, x, y);
      if (!balloon) return;

      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now();
        setTimerStarted(true);
      }

      balloon.popped = true;
      spawnParticles(balloon.x, balloon.y, balloon.color);
      popCountRef.current += 1;
      setPopCount(popCountRef.current);

      const threshold = getRevealThreshold(BALLOON_COUNT);
      if (!revealAssignedRef.current && popCountRef.current >= threshold) {
        balloonsRef.current = assignReveal(balloonsRef.current);
        revealAssignedRef.current = true;
      }

      if (balloon.isReveal) {
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

          // Update leaderboard
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

          // Enforce minimum 10-second suspense: 5s blend + 5s full color
          const elapsed = Date.now() - revealStartTime;
          const remaining = Math.max(0, 10000 - elapsed);
          setTimeout(() => {
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

      <div className="w-full max-w-sm mx-auto mb-2 flex items-center justify-between text-sm text-slate-600">
        <button
          type="button"
          onClick={onExit}
          className="text-slate-500 underline hover:text-slate-700"
        >
          ← Zurück
        </button>
        <span>{popCount} / {BALLOON_COUNT}</span>
        {timerStarted && running && (
          <span>{(elapsedMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          handleTap(e.clientX, e.clientY);
        }}
        className="w-full max-w-sm mx-auto rounded-2xl border-2 border-pastel-gold/30 bg-white/50"
        style={{ height: "60vh", touchAction: "none" }}
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
