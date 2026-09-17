import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Spazio Idee",
  description:
    "Analisi guidata di business plan e progetti d'impresa: documenti, best practice di settore e dialogo con Claude.",
  icons: { icon: "/icon.svg" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="it">
      <body className="min-h-screen">
        {user ? (
          <header className="no-print border-b" style={{ background: "var(--panel)" }}>
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
              <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
                <span aria-hidden>💡</span>
                <span>{env.appName}</span>
              </Link>
              <nav className="flex items-center gap-3 text-sm">
                <Link href="/" className="muted hover:underline">
                  Progetti
                </Link>
                {user.role === "admin" ? (
                  <Link href="/admin" className="muted hover:underline">
                    Accessi
                  </Link>
                ) : null}
                <span className="badge" title={user.email}>
                  {user.email}
                </span>
                <form action="/api/auth/logout" method="post">
                  <button className="btn" type="submit">
                    Esci
                  </button>
                </form>
              </nav>
            </div>
          </header>
        ) : null}
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
