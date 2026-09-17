# 💡 Spazio Idee

Uno spazio privato in cui le tue idee vengono **lette, analizzate e discusse**: carichi business plan,
pitch deck e piani finanziari, l'applicazione li analizza con Claude applicando le best practice di
settore, ti fa le domande giuste, e tu correggi e validi le conclusioni. L'output finale non è un
verdetto del modello: è un dossier costruito **a quattro mani, umano + AI**.

L'accesso è consentito **solo agli indirizzi email che decidi tu**.

---

## Due modi di usarlo

| | **Automatica** | **Manuale (costo zero)** |
|---|---|---|
| Serve | una chiave API Anthropic (credito prepagato, non un abbonamento) | nulla: basta il Claude che già usi, anche nel piano gratuito |
| Analisi di un modulo | un clic, testo in streaming | copi il prompt preparato dall'app, lo incolli su claude.ai, riporti la risposta |
| Ricerca web nei moduli | automatica, con fonti citate | la fa Claude nella conversazione, se abilitata |
| Dialogo | chat integrata nel progetto | conversazione su claude.ai, con il contesto copiato dall'app |
| Punteggi, domande, validazione, dossier | identici | identici |

La modalità manuale non è una versione ridotta: cambia solo *come* il testo arriva al modello.
Documenti, griglie di best practice, contesto accumulato, domande, punteggi e dossier restano gli
stessi. Si attiva da sola quando `ANTHROPIC_API_KEY` non è configurata, e resta comunque
disponibile come alternativa quando la chiave c'è.

---

## Come funziona

```
  documenti          moduli di analisi           dialogo              dossier
 ┌──────────┐      ┌────────────────────┐     ┌──────────┐      ┌──────────────┐
 │ PDF DOCX │─────▶│ 12 griglie di best │────▶│ domande  │─────▶│ versione     │
 │ XLSX CSV │      │ practice + ricerca │     │ risposte │      │ validata     │
 │ TXT MD   │      │ web automatica     │◀────│ contesto │      │ da te        │
 └──────────┘      └────────────────────┘     └──────────┘      └──────────────┘
                            ▲                                          │
                            └──────── le tue risposte rientrano ───────┘
```

1. **Carichi i documenti.** Il testo viene estratto da PDF, DOCX, XLSX/XLS, CSV, TXT e MD. I PDF senza
   testo selezionabile (deck grafici, scansioni) vengono inviati a Claude come documento nativo, così
   le slide restano leggibili.
2. **Avvii un modulo.** Ogni modulo applica una griglia di analisi diversa (mercato, concorrenza,
   unit economics, team, rischi…). Il modello scrive in streaming, marcando ogni affermazione con la
   sua origine: `[EVIDENZA]` dai documenti, `[RISPOSTA]` da quello che hai detto tu, `[ASSUNZIONE]`,
   `[BENCHMARK]`, `[WEB]`. Sui moduli che lo prevedono la **ricerca web è automatica**, con fonti citate.
3. **Rispondi alle domande.** Ogni analisi si chiude con 3-5 domande a cui solo tu puoi rispondere.
   Le risposte entrano nel contesto di tutte le analisi successive e del dialogo: è qui che l'analisi
   diventa davvero dialogica.
4. **Correggi e validi.** Puoi riscrivere qualsiasi parte dell'analisi e marcarla come validata. La
   tua versione ha sempre la precedenza su quella generata, nel dossier e nel contesto dei moduli
   successivi. Le analisi validate pesano di più nel punteggio complessivo.
5. **Esporti il dossier.** Un unico documento con valutazione complessiva, quadro dei moduli, analisi,
   registro delle risposte, domande ancora aperte e fonti. Scaricabile in Markdown o stampabile in PDF.

### I moduli inclusi

| Modulo | Cosa stabilisce |
|---|---|
| 🎯 Problema & Soluzione | Problem-solution fit, job-to-be-done, forza delle evidenze |
| 🌍 Mercato & Dimensionamento | TAM/SAM/SOM top-down e bottom-up, "why now", beachhead *(ricerca web)* |
| ⚔️ Concorrenza & Posizionamento | Mappa competitiva, status quo, difendibilità *(ricerca web)* |
| 🛠️ Prodotto & Tecnologia | Maturità reale, architettura, roadmap, dipendenze critiche |
| 💰 Modello di Business & Pricing | Business Model Canvas, pricing a valore, margini |
| 🚀 Go-To-Market | Coerenza prezzo/motion di vendita, canali, CAC, primi 100 clienti |
| 📈 Trazione & Metriche | KPI reali vs metriche di vanità, coorti, unit economics |
| 👥 Team & Governance | Founder-market fit, buchi di competenza, equity e vesting |
| 🧮 Piano Economico-Finanziario | Coerenza delle proiezioni, runway, uso dei fondi, sensibilità |
| 🛡️ Rischi, Normativa & Compliance | Registro dei rischi, GDPR, AI Act, IP *(ricerca web)* |
| 🌱 Impatto & Sostenibilità | Teoria del cambiamento, KPI di impatto (disattivato di default) |
| 🏁 Investment Readiness | Memo per investitori, due diligence, prossimi 90 giorni |

Ogni progetto attiva solo i moduli che gli servono.

---

## Avvio in locale

Servono Node.js 20+ e una chiave API Anthropic.

```bash
npm install
npm run setup                  # crea .env.local con AUTH_SECRET già generato
# compila ANTHROPIC_API_KEY in .env.local
npm run dev                    # http://localhost:3000
```

Valori minimi da compilare in `.env.local`:

```bash
AUTH_SECRET="..."                      # openssl rand -base64 48
ADMIN_EMAILS="tua.email@dominio.it"    # tu
ANTHROPIC_API_KEY="sk-ant-..."         # console.anthropic.com
```

Senza un servizio email configurato, il link di accesso viene mostrato a video e stampato nei log:
va bene in locale, non in produzione.

---

## Chi può entrare

Non esiste registrazione. Si entra solo con un **link monouso valido 15 minuti**, inviato a un
indirizzo presente in allowlist. Nessuna password da gestire o da farsi rubare.

- `ADMIN_EMAILS` — amministratori: possono gestire gli accessi dall'interfaccia (`/admin`).
- `ALLOWED_EMAILS` — collaboratori autorizzati.
- Dall'interfaccia `/admin` un amministratore aggiunge o revoca altri indirizzi senza toccare il codice.
- Gli indirizzi definiti nelle variabili d'ambiente non sono rimovibili dall'interfaccia: sono il
  tuo lucchetto di sicurezza.
- **La revoca è immediata**: l'allowlist viene ricontrollata a ogni richiesta, anche sulle sessioni
  già aperte.
- Chi richiede l'accesso da un indirizzo non autorizzato riceve sempre la stessa risposta neutra:
  l'applicazione non rivela chi è in elenco.
- `PROJECT_VISIBILITY` decide se i progetti sono condivisi fra tutti gli autorizzati (`shared`,
  default) o visibili solo a chi li crea (`private`).

Ogni accesso, ogni analisi e ogni modifica all'allowlist finiscono nel registro attività in `/admin`.

---

## Messa online

### Vercel + Turso (nessun server da gestire)

Procedura completa, passo per passo: **[DEPLOY.md](DEPLOY.md)** — chiave Claude, database,
invio email, pubblicazione e verifiche. In sintesi:

1. Database su [Turso](https://turso.tech): `DATABASE_URL="libsql://..."` e `DATABASE_AUTH_TOKEN`.
2. Repository importato su Vercel con le variabili di `.env.example`.
3. `APP_URL` uguale all'indirizzo pubblico definitivo, altrimenti i link di accesso non funzionano.
4. `SMTP_URL` o `RESEND_API_KEY` per l'invio reale delle email.

Da riga di comando: `npm run setup` e poi `npm run deploy`.

Due vincoli della piattaforma di cui tenere conto: il corpo di una richiesta non può superare
~4,5 MB (quindi `MAX_UPLOAD_MB="4"`) e il filesystem non è persistente. Il testo estratto vive nel
database; i PDF privi di testo selezionabile vengono conservati anch'essi nel database, così
l'invio nativo a Claude continua a funzionare senza disco.

### Docker / VPS (dati tutti tuoi)

```bash
cp .env.example .env.local     # compila i valori
docker compose up -d --build   # http://localhost:3000
```

Database SQLite e file caricati vivono nel volume `spazioidee-data`. Metti un reverse proxy con
HTTPS davanti (Caddy, nginx) e imposta `APP_URL` di conseguenza.

---

## Estendere lo spazio

**Aggiungere un modulo di analisi**: un oggetto in `src/lib/analysis/modules.ts`.

```ts
{
  id: "proprieta-intellettuale",
  name: "Proprietà Intellettuale",
  icon: "📜",
  short: "Brevetti, marchi, titolarità del codice",
  objective: "Verificare che l'azienda possieda davvero ciò che dice di possedere.",
  framework: `Griglia di riferimento:
- Titolarità del codice: contratti di cessione con collaboratori e agenzie...`,
  probes: ["Chi è titolare del codice scritto prima della costituzione?"],
  weight: 1,
  web: false,        // true per attivare la ricerca web nel modulo
  defaultOn: true,
}
```

Interfaccia, dossier, punteggio e prompt si adattano da soli: non c'è altro da modificare.

**Cambiare il metodo di analisi**: `src/lib/analysis/prompts.ts` contiene il metodo di lavoro
(`SYSTEM_METHOD`), il formato dell'output e lo schema della sintesi strutturata.

**Cambiare modello o profondità**: `ANTHROPIC_MODEL` e `ANTHROPIC_EFFORT` in `.env.local`.

---

## Com'è fatto

```
src/
  app/                    pagine (App Router) e route API
  components/             componenti dell'interfaccia
  lib/
    analysis/             moduli, prompt, contesto, esecuzione, dossier, punteggio
    auth/                 allowlist, link di accesso, sessioni, invio email
    data/                 accesso ai dati (progetti, documenti, analisi, domande)
    documents/            estrazione testo e archiviazione file
    db.ts                 SQLite/libsql con schema applicato all'avvio
  proxy.ts                blocca ogni pagina e ogni API senza sessione valida
```

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · SQLite/libsql · SDK ufficiale Anthropic.

Dettagli tecnici che contano:

- **Streaming** su analisi e dialogo (SSE), con ripresa automatica del turno quando la ricerca web
  lo sospende.
- **Prompt caching** sul contesto del progetto: i documenti non vengono ripagati a ogni modulo.
- **Sintesi strutturata** estratta con uno schema stretto: punteggio, punti di forza, criticità,
  azioni e domande arrivano come dati, non come testo da interpretare.
- **Budget di contesto** esplicito: se i documenti superano la soglia, la riduzione è dichiarata in
  interfaccia invece di avvenire in silenzio.
- **"Cosa riceve Claude"**: nella sezione Documenti puoi ispezionare il contesto esatto inviato al
  modello. Nessuna scatola nera.
- **Pagina di stato** (`/stato`, per amministratori): verifica database, sessioni, indirizzo
  pubblico, modalità di analisi, invio email, archiviazione e allowlist, con l'indicazione di cosa
  sistemare.

---

## Limiti dichiarati

- L'analisi è un supporto alla decisione, non una consulenza legale, fiscale o finanziaria.
- Il modello può sbagliare: per questo ogni conclusione è modificabile e il dossier distingue sempre
  ciò che hai validato da ciò che non hai ancora verificato.
- La ricerca web restituisce quello che trova in rete: le fonti sono citate proprio perché vanno
  controllate.
- In modalità automatica i costi sono a consumo sul tuo account Anthropic (credito prepagato, non
  un abbonamento): tipicamente pochi centesimi per modulo, di più con la ricerca web attiva. In
  modalità manuale non c'è alcun costo aggiuntivo.
