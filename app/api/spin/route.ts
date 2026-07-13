import { NextResponse } from "next/server";
import { runSpin, isValidGuess, isValidName } from "@/lib/spin";
import { hasPlayed, addEntry } from "@/lib/kv";
import type { SpinRequest, SpinResult, SpinError } from "@/lib/types";

function errorResponse(error: SpinError, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: Partial<SpinRequest>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_input", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const guess = typeof body.guess === "string" ? body.guess : "";

  if (!isValidName(name) || !isValidGuess(guess)) {
    return errorResponse("invalid_input", 400);
  }

  const revealGender = process.env.REVEAL_GENDER;
  if (revealGender !== "boy" && revealGender !== "girl") {
    console.error("REVEAL_GENDER env var missing or invalid");
    return errorResponse("server_error", 500);
  }

  try {
    if (await hasPlayed(name)) {
      return errorResponse("already_played", 409);
    }
  } catch (e) {
    console.error("KV hasPlayed failed", e);
    return errorResponse("server_error", 500);
  }

  const result = runSpin({ name, guess }, revealGender);

  if (result.jackpot) {
    try {
      await addEntry({
        name,
        guess,
        correct: result.correct,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("KV addEntry failed", e);
      return errorResponse("server_error", 500);
    }
  }

  return NextResponse.json<SpinResult>(result);
}
