"use client";

import { useState } from "react";
import { COPY } from "@/lib/german";

interface NameEntryProps {
  onStart: (name: string) => void;
}

export function NameEntry({ onStart }: NameEntryProps) {
  const [name, setName] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length > 0) onStart(trimmed);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm mx-auto text-center">
      <label htmlFor="name" className="block text-lg font-medium text-slate-700">
        {COPY.nameLabel}
      </label>
      <input
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={COPY.namePlaceholder}
        maxLength={40}
        autoFocus
        className="mt-2 w-full rounded-full border-2 border-pastel-gold/50 bg-white px-5 py-3 text-center text-lg shadow-sm focus:border-pastel-gold focus:outline-none"
      />
      <button
        type="submit"
        disabled={name.trim().length === 0}
        className="mt-4 w-full rounded-full bg-pastel-gold px-6 py-3 text-lg font-bold text-white shadow-md transition hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {COPY.startButton}
      </button>
    </form>
  );
}
