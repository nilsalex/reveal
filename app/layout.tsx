import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mädchen oder Junge?",
  description: "Finde es heraus!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-pastel-cream text-slate-800 antialiased">
        {children}
        <footer className="py-4 text-center text-xs text-slate-400">
          {process.env.NEXT_PUBLIC_COMMIT_HASH} ·{" "}
          {new Date(process.env.NEXT_PUBLIC_BUILD_TIME ?? "").toLocaleString("de-DE")}
        </footer>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
