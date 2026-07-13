import { GameWrapper } from "./components/GameWrapper";
import { getLeaderboard } from "./actions";
import { COPY } from "@/lib/german";

export const dynamic = "force-dynamic";

export default async function Page() {
  const entries = await getLeaderboard();

  return (
    <main className="flex min-h-screen flex-col items-center justify-start px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold text-green-600">
          {COPY.title}
        </h1>
        <p className="mt-1 text-slate-600">{COPY.subtitle}</p>
      </header>

      <GameWrapper initialEntries={entries} />
    </main>
  );
}
