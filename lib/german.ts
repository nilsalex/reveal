import type { Gender } from "./types";

export const COPY = {
  title: "Mädchen oder Junge?",
  subtitle: "Finde es heraus!",
  nameLabel: "Wie heißt du?",
  namePlaceholder: "Dein Name",
  startButton: "Los geht's",
  leaderboardTitle: "Rangliste",
  leaderboardEmpty: "Noch niemand hat aufgedeckt. Viel Glück!",
  serverError: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  toLeaderboard: "Zur Rangliste",
  revealHeadline: (g: Gender) =>
    g === "boy" ? "Es ist ein Junge!" : "Es ist ein Mädchen!",
  revealSubline: (durationMs: number) => {
    const seconds = (durationMs / 1000).toFixed(1);
    return `Deine Zeit: ${seconds}s`;
  },
} as const;
