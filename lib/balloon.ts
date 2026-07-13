import type { Balloon } from "./types";

const PASTEL_COLORS = ["#FFD1DC", "#BFD7FF", "#FFF8F0", "#E6B800"];

export function getRevealThreshold(total: number): number {
  return Math.ceil(total * 0.25);
}

export function createBalloons(
  count: number,
  width: number,
  height: number,
): Balloon[] {
  const balloons: Balloon[] = [];
  for (let i = 0; i < count; i++) {
    const radius = 50 + Math.random() * 20;
    balloons.push({
      id: i,
      x: radius + Math.random() * (width - 2 * radius),
      y: radius + Math.random() * (height - 2 * radius),
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.3 - Math.random() * 0.4,
      radius,
      color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
      popped: false,
      isReveal: false,
    });
  }
  return balloons;
}

export function hitTest(
  balloons: Balloon[],
  x: number,
  y: number,
): Balloon | null {
  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    if (b.popped) continue;
    const dx = x - b.x;
    const dy = y - b.y;
    if (dx * dx + dy * dy <= b.radius * b.radius) {
      return b;
    }
  }
  return null;
}

export function assignReveal(balloons: Balloon[]): Balloon[] {
  const candidates = balloons.filter((b) => !b.popped);
  if (candidates.length === 0) return [...balloons];
  const winner = candidates[Math.floor(Math.random() * candidates.length)];
  return balloons.map((b) =>
    b.id === winner.id ? { ...b, isReveal: true } : b,
  );
}
