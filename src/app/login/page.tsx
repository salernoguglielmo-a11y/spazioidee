import LoginForm from "@/components/LoginForm";
import { currentUser } from "@/lib/auth/session";
import { lookupAllowed } from "@/lib/auth/allowlist";
import { redirect } from "next/navigation";
import { env, missingConfig } from "@/lib/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await currentUser();
  // Una sessione valida ma revocata non deve rimbalzare all'infinito sul login.
  if (user && (await lookupAllowed(user.email)).allowed) redirect("/");

  const { error } = await searchParams;
  const missing = missingConfig();

  return (
    <div className="mx-auto max-w-md pt-10">
      <div className="panel p-7">
        <h1 className="text-2xl font-bold tracking-tight">💡 {env.appName}</h1>
        <p className="muted mt-2 mb-6 text-sm">
          Lo spazio in cui i tuoi progetti vengono letti, analizzati e discussi: documenti, best
          practice di settore e un confronto guidato con Claude.
        </p>
        <LoginForm initialError={error} />
      </div>

      {missing.length ? (
        <div className="panel mt-4 p-4 text-xs" style={{ borderColor: "var(--warn)" }}>
          <p className="font-semibold" style={{ color: "var(--warn)" }}>
            Configurazione incompleta
          </p>
          <p className="muted mt-1">
            Variabili mancanti: {missing.join(", ")}. Vedi <code>.env.example</code> e il README.
          </p>
        </div>
      ) : null}
    </div>
  );
}
