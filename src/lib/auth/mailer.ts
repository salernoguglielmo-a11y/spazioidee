import { env } from "../env";

export type MailResult = { delivered: boolean; channel: string; devUrl?: string; error?: string };

/**
 * Tre canali, in ordine di precedenza: Resend (HTTP), SMTP, console.
 * In assenza di provider il link viene mostrato a video: utile in sviluppo,
 * mai in produzione (la UI lo segnala esplicitamente).
 */
export async function sendMagicLinkEmail(to: string, url: string): Promise<MailResult> {
  const subject = `Accesso a ${env.appName}`;
  const text = [
    `Ciao,`,
    ``,
    `hai richiesto l'accesso a ${env.appName}.`,
    `Apri questo link per entrare (valido 15 minuti, monouso):`,
    ``,
    url,
    ``,
    `Se non hai richiesto tu l'accesso, ignora questa email.`,
  ].join("\n");

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
      <h1 style="font-size:20px;margin:0 0 8px">${env.appName}</h1>
      <p style="color:#475569;margin:0 0 24px">Hai richiesto l'accesso allo spazio di analisi delle idee.</p>
      <a href="${url}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">Entra in ${env.appName}</a>
      <p style="color:#64748b;font-size:13px;margin:24px 0 0">Il link è valido 15 minuti e può essere usato una sola volta.<br/>Se non hai richiesto tu l'accesso, ignora questa email.</p>
    </div>`;

  if (env.resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: env.mailFrom, to: [to], subject, text, html }),
      });
      if (!res.ok) {
        return { delivered: false, channel: "resend", error: await res.text() };
      }
      return { delivered: true, channel: "resend" };
    } catch (error) {
      return { delivered: false, channel: "resend", error: String(error) };
    }
  }

  if (env.smtpUrl) {
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport(env.smtpUrl);
      await transport.sendMail({ from: env.mailFrom, to, subject, text, html });
      return { delivered: true, channel: "smtp" };
    } catch (error) {
      return { delivered: false, channel: "smtp", error: String(error) };
    }
  }

  console.info(`[${env.appName}] magic link per ${to}: ${url}`);
  return { delivered: false, channel: "console", devUrl: url };
}
