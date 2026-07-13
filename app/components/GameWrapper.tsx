"use client";

import { useState } from "react";
import { NameEntry } from "./NameEntry";
import { BalloonGame } from "./BalloonGame";
import type { LeaderboardEntry } from "@/lib/types";

interface GameWrapperProps {
  initialEntries: LeaderboardEntry[];
}

export function GameWrapper({ initialEntries }: GameWrapperProps) {
  const [name, setName] = useState<string | null>(null);

  return (
    <>
      {name ? (
        <BalloonGame name={name} initialEntries={initialEntries} onExit={() => setName(null)} />
      ) : (
        <NameEntry onStart={setName} />
      )}
    </>
  );
}
