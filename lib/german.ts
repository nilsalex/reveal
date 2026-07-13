import type { Gender } from "./types";

export const COPY = {
  title: "Baby-Slotmaschine",
  subtitle: "Rate das Baby-Geschlecht!",
  nameLabel: "Wie heißt du?",
  namePlaceholder: "Dein Name",
  startButton: "Los geht's",
  boyLabel: "Junge",
  girlLabel: "Mädchen",
  spinButton: "Drehen!",
  spinningButton: "Dreht...",
  chooseCoin: "Wähle deine Münze:",
  leaderboardTitle: "Rangliste",
  leaderboardEmpty: "Noch keine Gewinner. Viel Glück!",
  retryButton: "Nochmal drehen",
  alreadyPlayed: "Du hast bereits gewonnen — weiter geht's nicht!",
  invalidInput: "Bitte gib deinen Namen ein und wähle eine Münze.",
  serverError: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  rankHeader: "Platz",
  nameHeader: "Name",
  guessHeader: "Tipp",
  resultHeader: "Ergebnis",
  timeHeader: "Zeitpunkt",
  revealHeadline: (g: Gender) =>
    g === "boy" ? "Es ist ein Junge!" : "Es ist ein Mädchen!",
  revealSubline: (guess: Gender, correct: boolean) => {
    const guessed = guess === "boy" ? "Junge" : "Mädchen";
    return `Du hast auf ${guessed} getippt — ${correct ? "richtig!" : "leider falsch."}`;
  },
  toLeaderboard: "Zur Rangliste",
  winnerSuffix: " Gewinner",
} as const;
