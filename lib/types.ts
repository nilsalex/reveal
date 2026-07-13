export type Gender = "boy" | "girl";

export interface LeaderboardEntry {
  name: string;
  durationMs: number;
  timestamp: string; // ISO 8601
}

export type RevealResult =
  | { revealedGender: Gender }
  | { error: "already_played" };

export interface Balloon {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  popped: boolean;
  isReveal: boolean;
}
