import LoginForm from "@/components/LoginForm";
import { currentUser } from "@/lib/auth/session";
import { lookupAllowed } from "@/lib/auth/allowlist";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await currentUser();
  // Una sessione valida ma revocata non deve rimbalzare all'infinito sul login.
  if (user && (await lookupAllowed(user.email)).allowed) redirect("/");

  const { error } = await searchParams;
  // Se non c'è un canale email, si entra con il link personale: va detto prima,
  // non dopo un tentativo fallito.
  const emailAttiva = Boolean(env.resendApiKey || env.smtpUrl);

  return (
    <div className="mx-auto max-w-md pt-10">
      <div className="panel p-7">
        <h1 className="text-2xl font-bold tracking-tight">💡 {env.appName}</h1>
        <p className="muted mt-2 mb-6 text-sm">
          Lo spazio in cui i tuoi progetti vengono letti, analizzati e discussi: documenti, best
          practice di settore e un confronto guidato con Claude.
        </p>
        {emailAttiva ? null : (
          <div
            className="mb-5 rounded-xl p-3 text-sm"
            style={{ background: "var(--panel-2)" }}
          >
            <p className="font-semibold">Si entra con un link personale</p>
            <p className="muted mt-1">
              Su questo spazio l&apos;invio di email non è attivo: ogni persona autorizzata riceve un
              proprio link di accesso, valido finché non viene revocato. Se non ce l&apos;hai, chiedilo
              a chi amministra lo spazio. Il campo qui sotto serve solo quando l&apos;invio via email è
              configurato.
            </p>
          </div>
        )}

        <LoginForm initialError={error} />
      </div>
    </div>
  );
}
