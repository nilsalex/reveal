"use client";

import Link from "next/link";
import { useState } from "react";
import { adminSetGender, adminClearLeaderboard, adminGetGender } from "@/app/actions";
import type { Gender } from "@/lib/types";

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [currentGender, setCurrentGender] = useState<Gender | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const gender = await adminGetGender();
      setCurrentGender(gender);
      setAuthed(true);
    } catch {
      setError("Fehler beim Laden.");
    }
  }

  async function handleSetGender(gender: Gender) {
    setError(null);
    setMessage(null);
    try {
      await adminSetGender({ pin, gender });
      setCurrentGender(gender);
      setMessage(`Geschlecht auf ${gender === "boy" ? "Junge" : "Mädchen"} gesetzt.`);
    } catch {
      setError("Fehler beim Speichern.");
    }
  }

  async function handleClear() {
    setError(null);
    setMessage(null);
    try {
      await adminClearLeaderboard({ pin });
      setMessage("Rangliste wurde geleert.");
    } catch {
      setError("Fehler beim Leeren.");
    }
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 text-center text-3xl font-extrabold text-pastel-greenDeep">
            Admin
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              maxLength={4}
              autoFocus
              className="w-full rounded-full border-2 border-pastel-gold/50 bg-white px-5 py-3 text-center text-lg tracking-widest shadow-sm focus:border-pastel-gold focus:outline-none"
            />
            <button
              type="submit"
              disabled={pin.length === 0}
              className="w-full rounded-full bg-pastel-gold px-6 py-3 text-lg font-bold text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
            >
              Anmelden
            </button>
            {error && <p className="text-center text-sm text-red-600">{error}</p>}
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start px-4 py-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-3xl font-extrabold text-pastel-greenDeep">
          Admin
        </h1>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Geschlecht setzen</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleSetGender("boy")}
              className={`flex-1 rounded-full border-2 px-4 py-3 text-lg font-semibold transition ${
                currentGender === "boy"
                  ? "border-pastel-blueDeep bg-pastel-blue text-slate-800 shadow-md"
                  : "border-pastel-blue/40 bg-white text-slate-500"
              }`}
            >
              Junge
            </button>
            <button
              type="button"
              onClick={() => handleSetGender("girl")}
              className={`flex-1 rounded-full border-2 px-4 py-3 text-lg font-semibold transition ${
                currentGender === "girl"
                  ? "border-pastel-pinkDeep bg-pastel-pink text-slate-800 shadow-md"
                  : "border-pastel-pink/40 bg-white text-slate-500"
              }`}
            >
              Mädchen
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {currentGender
              ? `Aktuell: ${currentGender === "boy" ? "Junge" : "Mädchen"}`
              : "Noch nicht gesetzt (env var wird verwendet)"}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">Rangliste</h2>
          <button
            type="button"
            onClick={handleClear}
            className="w-full rounded-full bg-red-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-red-600"
          >
            Rangliste leeren
          </button>
        </section>

        {message && <p className="mb-4 text-center text-sm text-green-600">{message}</p>}
        {error && <p className="mb-4 text-center text-sm text-red-600">{error}</p>}

        <Link
          href="/"
          className="block text-center text-sm text-slate-500 underline hover:text-slate-700"
        >
          ← Zurück zum Spiel
        </Link>
      </div>
    </main>
  );
}
