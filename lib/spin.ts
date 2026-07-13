import type {
  Gender,
  Guess,
  ReelValue,
  SpinRequest,
  SpinResult,
} from "./types";

const DEFAULT_JACKPOT_PROBABILITY = 0.15;

function parseProbability(env?: string): number {
  if (!env) return DEFAULT_JACKPOT_PROBABILITY;
  const n = Number(env);
  if (!Number.isFinite(n) || n < 0 || n > 1) return DEFAULT_JACKPOT_PROBABILITY;
  return n;
}

export function getJackpotProbability(): number {
  return parseProbability(process.env.JACKPOT_PROBABILITY);
}

export function rollJackpot(
  probability: number = getJackpotProbability(),
): boolean {
  return Math.random() < probability;
}

function randomReel(): ReelValue {
  return Math.random() < 0.5 ? "boy" : "girl";
}

export function generateNonJackpotReels(): [
  ReelValue,
  ReelValue,
  ReelValue,
] {
  return [randomReel(), randomReel(), randomReel()];
}

export function buildJackpotReels(
  gender: Gender,
): [ReelValue, ReelValue, ReelValue] {
  return [gender, gender, gender];
}

export function runSpin(
  req: SpinRequest,
  revealGender: Gender,
): SpinResult {
  const isJackpot = rollJackpot();
  if (isJackpot) {
    const reels = buildJackpotReels(revealGender);
    return {
      jackpot: true,
      reels,
      revealedGender: revealGender,
      correct: req.guess === revealGender,
    };
  }
  return {
    jackpot: false,
    reels: generateNonJackpotReels(),
  };
}

export function isValidGuess(g: string): g is Guess {
  return g === "boy" || g === "girl";
}

export function isValidName(n: unknown): n is string {
  return (
    typeof n === "string" &&
    n.trim().length > 0 &&
    n.trim().length <= 40
  );
}
