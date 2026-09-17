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
      "Se l'indirizzo è autorizzato riceverai un link di accesso valido 15 minuti. Controlla anche la posta indesiderata.",
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
            "L'invio delle email non è configurato su questo server, quindi non posso recapitare il link di accesso. Imposta SMTP_URL o RESEND_API_KEY e rilancia il deploy.",
        },
        { status: 503 },
      );
    }

    genericResponse.devUrl = delivery.devUrl;
    genericResponse.message =
      "Nessun servizio email è configurato: usa il link qui sotto per entrare. Configura RESEND_API_KEY o SMTP_URL per l'uso reale.";
  } else if (!delivery.delivered) {
    return NextResponse.json(
      {
        error: `Invio email non riuscito (${delivery.channel}). Controlla la configurazione: ${delivery.error ?? ""}`.trim(),
      },
      { status: 500 },
    );
  }

  if (env.appUrl.includes("localhost") && delivery.delivered) {
    genericResponse.note = "APP_URL punta a localhost: verifica che il link ricevuto sia corretto.";
  }

  return NextResponse.json(genericResponse);
}
