import type { Balloon } from "./types";

const PASTEL_COLORS = ["#C8E6C9", "#A5D6A7", "#DCEDC8", "#E6B800", "#FFD54F"];

export function createBalloons(
  count: number,
  width: number,
  height: number,
): Balloon[] {
  const balloons: Balloon[] = [];
  for (let i = 0; i < count; i++) {
    const radius = 25 + Math.random() * 10;
    balloons.push({
      id: i,
      x: radius + Math.random() * (width - 2 * radius),
      y: radius + Math.random() * (height - 2 * radius),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius,
      color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
      popped: false,
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
