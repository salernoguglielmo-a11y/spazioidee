# Mettere online Spazio Idee (Vercel + Turso)

Tempo richiesto: circa 30 minuti, quasi tutti di attesa. Serve solo il browser.
Alla fine avrai un indirizzo tipo `https://spazioidee.vercel.app` accessibile solo dai tuoi
due indirizzi email.

Ordine consigliato: **chiave Claude → database → email → pubblicazione**.

---

## 1. La chiave API di Claude

È il punto che conta di più: senza questa chiave l'applicazione funziona ma non analizza nulla.

> Attenzione a una cosa che confonde quasi tutti: **l'abbonamento a Claude.ai (Pro/Max) non
> comprende l'uso delle API.** Sono due prodotti con due portafogli separati. Serve un piccolo
> credito sulla Anthropic Console, che si consuma a consumo reale.

1. Vai su **[console.anthropic.com](https://console.anthropic.com)** e accedi con
   `salernoguglielmo@gmail.com` (il pulsante "Continue with Google" è la via più rapida).
2. Al primo accesso ti chiede di creare un'organizzazione: un nome qualsiasi va bene
   (es. "Skill Donor" o "Spazio Idee").
3. Vai su **Settings → Billing** (oppure "Plans & Billing") e aggiungi un metodo di pagamento,
   poi **Buy credits**: il minimo, 5 $, è più che sufficiente per iniziare.
   Attiva pure l'**auto-reload** solo se vuoi evitare interruzioni; non è necessario.
4. Vai su **Settings → API keys → Create Key**. Dai un nome ("spazioidee") e copia la chiave:
   inizia con `sk-ant-api03-…`.
   **La chiave è visibile una volta sola**: incollala subito da qualche parte (poi finirà nelle
   variabili di Vercel al passo 4).
5. Facoltativo ma consigliato: su **Settings → Limits** imposta un tetto di spesa mensile, così
   non ci sono sorprese.

**Quanto costa davvero.** Il modello usato è Claude Opus 5 (5 $ per milione di token in ingresso,
25 $ in uscita). Un business plan di 30 pagine occupa circa 20.000 token: l'analisi di un modulo
costa tipicamente **10-20 centesimi**, meno nei moduli successivi perché il contesto viene messo
in cache. Un dossier completo su 11 moduli sta intorno a **1-2 €**, qualcosa in più dove si attiva
la ricerca web. Con 5 $ analizzi tranquillamente i primi progetti.

Se preferisci spendere meno per le prime prove: in Vercel imposta `ANTHROPIC_MODEL` a
`claude-sonnet-5` (2,5 volte più economico) oppure `ANTHROPIC_EFFORT` a `medium`.

---

## 2. Il database (Turso)

Vercel non ha un disco permanente: i dati vivono qui. Il piano gratuito basta e avanza.

1. Vai su **[turso.tech](https://turso.tech)** → **Sign up**, accedi con GitHub.
2. **Create Database**. Nome: `spazioidee`. Regione: scegline una europea (Francoforte o Parigi:
   i dati restano in UE, utile visto che tratterai documenti riservati).
3. Nella pagina del database copia i due valori:
   - **Database URL** → inizia con `libsql://spazioidee-…turso.io`
   - **Token** (pulsante *Create Token* / *Generate Token*) → una stringa lunga.

Le tabelle vengono create dall'applicazione al primo avvio: non devi eseguire nessuno script.

---

## 3. L'invio delle email di accesso

Si entra con un link monouso: serve un modo per recapitarlo. Due strade.

### Strada rapida: Gmail (5 minuti, funziona con entrambi gli indirizzi)

1. Sul tuo account Google attiva la **verifica in due passaggi**, se non è già attiva
   (myaccount.google.com → Sicurezza).
2. Vai su **[myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)**,
   crea una password per l'app (nome: "spazioidee") e copia le 16 lettere.
3. La variabile da impostare in Vercel sarà:
   ```
   SMTP_URL = smtps://salernoguglielmo%40gmail.com:LE16LETTERE@smtp.gmail.com:465
   MAIL_FROM = Spazio Idee <salernoguglielmo@gmail.com>
   ```
   (la `@` dell'indirizzo va scritta come `%40`, la password senza spazi)

### Strada pulita: Resend + dominio skilldonor.org

1. **[resend.com](https://resend.com)** → Sign up → **API Keys** → Create.
2. **Domains → Add Domain** → `skilldonor.org`, poi inserisci i record DNS che ti mostra
   (SPF/DKIM) nel pannello del dominio. Serve accesso al DNS di skilldonor.org.
3. Variabili: `RESEND_API_KEY` e `MAIL_FROM = Spazio Idee <no-reply@skilldonor.org>`.

> Con il mittente di prova `onboarding@resend.dev` Resend consegna **solo** all'indirizzo con cui
> ti sei registrato: andrebbe bene per te, non per `g.salerno@skilldonor.org`. Per questo, finché
> il dominio non è verificato, la strada Gmail è preferibile.

Se non configuri nulla, l'accesso funziona ugualmente ma il link viene mostrato a schermo: comodo
per provare, da non lasciare in produzione.

---

## 4. La pubblicazione su Vercel

1. Vai su **[vercel.com](https://vercel.com)** → **Sign up** con GitHub (lo stesso account del
   repository).
2. **Add New… → Project** → scegli il repository **spazioidee** → Import.
   Il ramo di produzione è già quello giusto (`claude/brave-clarke-ilwv3d`, che è il ramo
   predefinito del repository).
3. Lascia tutte le impostazioni di build come sono (Vercel riconosce Next.js da solo) e apri
   **Environment Variables**. Incolla queste, una per riga, nell'ambiente **Production**:

   | Nome | Valore |
   |---|---|
   | `AUTH_SECRET` | *una stringa casuale lunga (te ne genero una io, oppure `openssl rand -base64 48`)* |
   | `ADMIN_EMAILS` | `salernoguglielmo@gmail.com,g.salerno@skilldonor.org` |
   | `ANTHROPIC_API_KEY` | la chiave `sk-ant-api03-…` del passo 1 |
   | `DATABASE_URL` | `libsql://…turso.io` del passo 2 |
   | `DATABASE_AUTH_TOKEN` | il token del passo 2 |
   | `SMTP_URL` *(o `RESEND_API_KEY`)* | quello del passo 3 |
   | `MAIL_FROM` | `Spazio Idee <salernoguglielmo@gmail.com>` |
   | `APP_URL` | `https://spazioidee.vercel.app` *(vedi passo 5)* |
   | `MAX_UPLOAD_MB` | `4` |
   | `NATIVE_PDF` | `true` |

4. **Deploy**. Il primo build richiede 2-3 minuti.

## 5. Ultimo giro: l'indirizzo definitivo

`APP_URL` deve coincidere con l'indirizzo reale, altrimenti i link di accesso puntano nel vuoto.

1. A deploy finito Vercel ti mostra il dominio assegnato (es. `spazioidee.vercel.app`).
2. **Settings → Environment Variables** → correggi `APP_URL` con quel valore esatto,
   senza barra finale.
3. **Deployments → … → Redeploy**.

Se hai un dominio tuo (es. `idee.skilldonor.org`): **Settings → Domains → Add**, segui le
istruzioni DNS, e poi rimetti `APP_URL` su quel dominio.

---

## 6. Verifica che tutto funzioni

1. Apri l'indirizzo: devi vedere la schermata di accesso.
2. Inserisci `salernoguglielmo@gmail.com` → arriva l'email → clic sul link → sei dentro.
3. Prova con un indirizzo qualsiasi non autorizzato: la risposta è la stessa frase neutra, ma
   nessuna email parte e nessuno entra.
4. Crea un progetto, carica un documento, avvia il modulo **Mercato**: se vedi il testo comparire
   in streaming, la chiave Claude è a posto.
5. In `/admin` trovi il registro accessi e puoi autorizzare altri indirizzi.

### Se qualcosa non va

| Sintomo | Causa quasi certa |
|---|---|
| "Configurazione incompleta" in home | manca una variabile: la schermata dice quale |
| Il link di accesso porta a `localhost` | `APP_URL` non aggiornato dopo il deploy (passo 5) |
| L'analisi si ferma subito con un errore | chiave Claude assente, errata o senza credito |
| L'analisi si interrompe a metà | durata massima della funzione: attiva **Fluid Compute** in Settings → Functions |
| Il caricamento di un PDF grande fallisce | limite di Vercel (~4,5 MB per invio): comprimi il PDF o carica un file per volta |
| Nessuna email ricevuta | credenziali SMTP errate, oppure Resend con mittente di prova verso un indirizzo diverso dal tuo |

---

## In alternativa: pubblicare da riga di comando

Se preferisci il terminale, dalla cartella del progetto:

```bash
npm run setup      # crea .env.local con AUTH_SECRET già generato
# compila ANTHROPIC_API_KEY, DATABASE_URL, DATABASE_AUTH_TOKEN, SMTP_URL in .env.local
npm run deploy     # login, collegamento, invio variabili e pubblicazione su Vercel
```
