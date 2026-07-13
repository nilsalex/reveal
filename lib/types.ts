export type Gender = "boy" | "girl";

export type Guess = Gender;

export type ReelValue = Gender;

export interface NonJackpotSpinResult {
  jackpot: false;
  reels: [ReelValue, ReelValue, ReelValue];
}

export interface JackpotSpinResult {
  jackpot: true;
  reels: [ReelValue, ReelValue, ReelValue];
  revealedGender: Gender;
  correct: boolean;
}

export type SpinResult = NonJackpotSpinResult | JackpotSpinResult;

export interface SpinRequest {
  name: string;
  guess: Guess;
}

export type SpinError = "invalid_input" | "already_played" | "server_error";

export interface LeaderboardEntry {
  name: string;
  guess: Guess;
  correct: boolean;
  timestamp: string; // ISO 8601
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}
