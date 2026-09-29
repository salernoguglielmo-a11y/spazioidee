import { NextResponse } from "next/server";
import { isValidEmail, lookupAllowed, normalizeEmail, audit } from "@/lib/auth/allowlist";
import { issueMagicLink } from "@/lib/auth/magic-link";
import { sendMagicLinkEmail } from "@/lib/auth/mailer";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email ?? ""));

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Indirizzo email non valido." }, { status: 400 });
  }

  const { allowed } = await lookupAllowed(email);

  // Risposta identica in ogni caso: non si rivela chi è in allowlist.
  const genericResponse: Record<string, unknown> = {
    ok: true,
    message:
      "Se l'indirizzo è autorizzato e l'invio è attivo per te, riceverai un link valido 15 minuti — controlla anche la posta indesiderata. Se non arriva nulla, su questo spazio puoi entrare con un link personale: chiedilo a chi lo amministra.",
  };

  if (!allowed) {
    await audit(email, "auth.denied", email, "indirizzo non in allowlist");
    return NextResponse.json(genericResponse);
  }

  const link = await issueMagicLink(email);
  if ("error" in link) {
    return NextResponse.json({ error: link.error }, { status: 429 });
  }

  const delivery = await sendMagicLinkEmail(email, link.url);
  await audit(email, "auth.link_sent", email, delivery.channel);

  if (!delivery.delivered && delivery.devUrl) {
    // Il link a schermo è accettabile solo in locale: in rete sarebbe un accesso
    // libero per chiunque conosca un indirizzo autorizzato.
    const local =
      process.env.NODE_ENV !== "production" ||
      env.appUrl.includes("localhost") ||
      env.appUrl.includes("127.0.0.1");

    if (!local) {
      console.error("Invio email non configurato: accesso bloccato in produzione.");
      return NextResponse.json(
        {
          error:
            "Su questo spazio l'accesso non avviene via email, ma con un link personale. Se non ne hai uno, chiedilo a chi amministra lo spazio: può generarlo in un istante.",
        },
        { status: 503 },
      );
    }

    genericResponse.devUrl = delivery.devUrl;
    genericResponse.message =
      "Nessun servizio email è configurato: usa il link qui sotto per entrare. Configura RESEND_API_KEY o SMTP_URL per l'uso reale.";
  } else if (!delivery.delivered) {
    // Un errore di consegna non deve rivelare chi è in allowlist: la risposta
    // resta identica a quella di un indirizzo sconosciuto, e il motivo vero
    // finisce nei log del server, dove serve a chi amministra.
    const motivo = (delivery.error ?? "motivo non riportato").replace(/\s+/g, " ").slice(0, 300);
    console.error(`Consegna non riuscita a ${email} via ${delivery.channel}: ${motivo}`);
    // Finisce nel registro attività: chi amministra lo vede in /admin e può
    // intervenire (verificare il dominio, o mandare un link personale).
    await audit(email, "auth.consegna_fallita", email, `${delivery.channel}: ${motivo}`);
    return NextResponse.json(genericResponse);
  }

  if (env.appUrl.includes("localhost") && delivery.delivered) {
    genericResponse.note = "APP_URL punta a localhost: verifica che il link ricevuto sia corretto.";
  }

  return NextResponse.json(genericResponse);
}
