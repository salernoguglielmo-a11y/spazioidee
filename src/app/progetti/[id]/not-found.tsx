import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <div className="panel mx-auto max-w-lg p-8 text-center">
      <p className="text-3xl" aria-hidden>
        🔒
      </p>
      <h1 className="mt-3 text-lg font-semibold">Progetto non disponibile</h1>
      <p className="muted mt-2 text-sm">
        O non esiste, o non fai parte dei suoi membri. Nell&apos;elenco dei progetti quelli a cui non
        hai accesso sono segnati con un lucchetto e indicano chi li segue: chiedi a quella persona di
        aggiungerti.
      </p>
      <Link href="/" className="btn btn-primary mt-5">
        Torna ai progetti
      </Link>
    </div>
  );
}
