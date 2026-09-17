/**
 * Registro dei moduli di analisi.
 *
 * Aggiungere un modulo = aggiungere un oggetto a questa lista: la UI, il
 * dossier, lo scoring e i prompt si adattano da soli. Niente altro da toccare.
 */

export type ModuleId = string;

export type AnalysisModule = {
  id: ModuleId;
  name: string;
  icon: string;
  /** Una riga, mostrata nelle card. */
  short: string;
  /** Cosa deve stabilire il modulo: finisce nel prompt. */
  objective: string;
  /** Best practice e framework di settore usati come griglia di analisi. */
  framework: string;
  /** Domande che l'analista umano si porrebbe: guidano il dialogo. */
  probes: string[];
  /** Peso nello scoring complessivo. */
  weight: number;
  /** Abilita la ricerca web (dati di mercato, competitor, normativa). */
  web: boolean;
  /** Attivo di default sui nuovi progetti. */
  defaultOn: boolean;
};

export const MODULES: AnalysisModule[] = [
  {
    id: "problema-soluzione",
    name: "Problema & Soluzione",
    icon: "🎯",
    short: "Problem-solution fit, job-to-be-done, evidenze del bisogno",
    objective:
      "Stabilire se esiste un problema reale, urgente e frequente, per un cliente identificabile, e se la soluzione proposta lo risolve in modo sostanzialmente migliore delle alternative attuali.",
    framework: `Griglia di riferimento:
- Job-To-Be-Done (Christensen): job funzionale, emotivo, sociale; circostanza scatenante; forze del progresso (push/pull vs abitudine/ansia).
- Problem-Solution Fit prima del Product-Market Fit (Blank, Customer Development): il problema va validato fuori dall'ufficio, con interviste, non con opinioni.
- Test del problema: chi ha il problema (segmento preciso, non "le PMI"), quanto spesso, quanto costa oggi (tempo/denaro/rischio), cosa fa oggi per rimediare (status quo, workaround Excel, concorrente, nulla).
- The Mom Test (Fitzpatrick): distinguere evidenze comportamentali (cosa hanno fatto/pagato) da compliments e ipotesi.
- Soluzione: 10x o 10%? Se il miglioramento è incrementale, il costo di switch lo annulla.
- Rischio "soluzione in cerca di problema": tecnologia interessante senza cliente che soffre.
- Segnali di validazione in ordine di forza: pagamenti > LOI/pre-ordini > pilota gratuito richiesto dal cliente > waiting list > interviste > survey.`,
    probes: [
      "Chi è esattamente il cliente che soffre di questo problema, e chi paga?",
      "Quali evidenze dirette (interviste, pilot, pagamenti) esistono, e quante?",
      "Cosa fa oggi il cliente in assenza della soluzione, e quanto gli costa?",
      "Perché la soluzione è 10 volte migliore e non solo diversa?",
    ],
    weight: 1.2,
    web: false,
    defaultOn: true,
  },
  {
    id: "mercato",
    name: "Mercato & Dimensionamento",
    icon: "🌍",
    short: "TAM/SAM/SOM, trend, timing, ricerca di mercato automatizzata",
    objective:
      "Dimensionare il mercato con metodo verificabile, valutare trend e timing ('why now'), e verificare se le stime presenti nella documentazione reggono.",
    framework: `Griglia di riferimento:
- TAM/SAM/SOM calcolati due volte: top-down (report di settore, fonti citate) e bottom-up (n. clienti raggiungibili x prezzo medio x frequenza). Se i due numeri divergono di oltre un ordine di grandezza, il dimensionamento non è affidabile.
- Regola pratica venture: un SOM credibile a 3-5 anni deve poter reggere una traiettoria da 10-100M€ di ricavi per giustificare capitale di rischio; per percorsi bootstrap/PMI valgono soglie diverse, da dichiarare.
- "Why now": cosa è cambiato negli ultimi 24 mesi (tecnologia, normativa, costi, comportamenti, capitale) che rende possibile oggi ciò che prima non lo era.
- Segmentazione: beachhead market (Moore, Crossing the Chasm; Aulet, Disciplined Entrepreneurship) — un segmento iniziale piccolo e dominabile batte un mercato enorme e generico.
- Dinamica: mercato in crescita, maturo o in contrazione; CAGR con fonte e anno; stagionalità; concentrazione della domanda.
- Errori tipici da segnalare: percentuale arbitraria di un mercato enorme ("basta l'1% di..."), TAM globale per un prodotto vendibile solo in Italia, fonti non citate o obsolete, confusione fra volume di mercato e spesa indirizzabile.
- Quando usi la ricerca web: cerca dati recenti con fonte, anno e metodo; riporta il range, non un numero unico; distingui fonti primarie (ISTAT, Eurostat, report di settore, bilanci) da rassegne stampa.`,
    probes: [
      "Da dove viene il numero di TAM/SAM/SOM e chi lo ha prodotto?",
      "Qual è il beachhead market iniziale e perché è dominabile?",
      "Cosa è cambiato adesso che rende possibile questo progetto?",
    ],
    weight: 1.2,
    web: true,
    defaultOn: true,
  },
  {
    id: "concorrenza",
    name: "Concorrenza & Posizionamento",
    icon: "⚔️",
    short: "Mappa competitiva, alternative, vantaggio difendibile",
    objective:
      "Mappare concorrenti diretti, indiretti e status quo, e stabilire se esiste un vantaggio difendibile nel tempo o solo un vantaggio temporaneo.",
    framework: `Griglia di riferimento:
- Matrice competitiva su due assi che contano per il cliente (non due assi scelti per finire in alto a destra).
- Tre livelli di concorrenza: diretta (stessa soluzione), indiretta (stesso job risolto altrimenti), status quo (Excel, processo manuale, "non facciamo nulla") — il terzo è quasi sempre il concorrente più forte.
- Cinque forze di Porter: rivalità, nuovi entranti, sostituti, potere dei fornitori, potere dei clienti.
- Difendibilità (Hamilton Helmer, 7 Powers): economie di scala, effetti di rete, costi di switch, brand, risorse esclusive (IP, dati proprietari, licenze), processi superiori, controllo di un collo di bottiglia.
- "Perché non lo fa già l'incumbent domani?" è la domanda che ogni investitore pone: serve una risposta strutturale, non ottimistica.
- Attenzione al falso moat: "siamo i primi", "il nostro team è più bravo", "usiamo l'AI" non sono vantaggi difendibili.
- Quando usi la ricerca web: identifica competitor reali con nome, sito, finanziamenti noti, posizionamento e prezzi pubblici; segnala competitor rilevanti assenti dalla documentazione.`,
    probes: [
      "Chi sono i 3 competitor più pericolosi e perché il cliente dovrebbe scegliere voi?",
      "Cosa impedisce a un incumbent di replicare la soluzione in 12 mesi?",
      "Quanto costa al cliente cambiare fornitore, in denaro e in attrito?",
    ],
    weight: 1.1,
    web: true,
    defaultOn: true,
  },
  {
    id: "prodotto",
    name: "Prodotto & Tecnologia",
    icon: "🛠️",
    short: "Maturità, architettura, roadmap, debito e dipendenze",
    objective:
      "Valutare maturità reale del prodotto, solidità e scalabilità delle scelte tecniche, realismo della roadmap e dipendenze critiche.",
    framework: `Griglia di riferimento:
- Livello di maturità dichiarato vs dimostrato: idea, mockup, prototipo, MVP in uso, prodotto in produzione con clienti paganti. Chiedere sempre evidenze (link, demo, screenshot, log d'uso).
- TRL (Technology Readiness Level 1-9) per progetti deep-tech e bandi pubblici.
- Architettura: scelte tecnologiche coerenti con il team e con il carico previsto; build vs buy; costo unitario dell'infrastruttura; scalabilità dei costi variabili (rilevante se c'è AI generativa: costo per richiesta, latenza, dipendenza da un unico fornitore di modelli).
- Roadmap: milestone con esiti verificabili, non elenchi di funzionalità; ogni milestone dovrebbe ridurre un rischio specifico.
- Dipendenze critiche: fornitori unici, API di terzi, dati in licenza, hardware, partner industriali.
- Qualità e sicurezza: gestione dei dati, backup, continuità operativa, sicurezza applicativa; per prodotti AI: valutazione, guardrail, tracciabilità.
- Debito tecnico e rischio di riscrittura: prototipi no-code che non reggeranno la scala vanno dichiarati, non nascosti.`,
    probes: [
      "Cosa è realmente in produzione oggi e chi lo sta usando?",
      "Quali sono le tre dipendenze tecniche che, se saltassero, fermerebbero il prodotto?",
      "Come cambia il costo unitario quando i volumi si moltiplicano per 100?",
    ],
    weight: 1,
    web: false,
    defaultOn: true,
  },
  {
    id: "business-model",
    name: "Modello di Business & Pricing",
    icon: "💰",
    short: "Business Model Canvas, ricavi, pricing, margini",
    objective:
      "Verificare la coerenza del modello di business e la sostenibilità economica del pricing rispetto al valore generato per il cliente.",
    framework: `Griglia di riferimento:
- Business Model Canvas (Osterwalder): segmenti, proposta di valore, canali, relazioni, flussi di ricavo, risorse chiave, attività chiave, partner, struttura dei costi. Segnalare i blocchi mancanti o in contraddizione.
- Flussi di ricavo: abbonamento, transazionale, licenza, marketplace/take rate, servizi, hardware+consumabili, pubblicità, freemium. Ricavi ricorrenti vs una tantum: peso relativo e prevedibilità.
- Pricing basato sul valore, non sui costi: quantificare il valore per il cliente (risparmio, ricavo aggiuntivo, rischio evitato) e catturarne una frazione difendibile (tipicamente 10-30%).
- Metrica di valore e scalabilità del prezzo (per utente, per transazione, per volume): il prezzo deve crescere con il valore ricevuto.
- Margine lordo: sotto il 40% il modello è più simile a un servizio che a un prodotto scalabile; per SaaS il riferimento è 70-85%. Dichiarare i costi diretti inclusi (infrastruttura, API di terzi, supporto, licenze).
- Chi decide, chi paga, chi usa: se sono soggetti diversi, il ciclo di vendita e il messaggio cambiano.
- Rischi: concentrazione dei ricavi su pochi clienti, dipendenza da un unico canale, sconti strutturali, ricavi da consulenza mascherati da prodotto.`,
    probes: [
      "Quanto vale la soluzione per il cliente in euro all'anno, e quanto ne catturate?",
      "Qual è il margine lordo reale, al netto di infrastruttura e supporto?",
      "Il prezzo è stato testato con clienti veri o è un'ipotesi?",
    ],
    weight: 1.1,
    web: false,
    defaultOn: true,
  },
  {
    id: "go-to-market",
    name: "Go-To-Market",
    icon: "🚀",
    short: "Canali, motion di vendita, CAC, primi 100 clienti",
    objective:
      "Valutare se esiste un percorso concreto e ripetibile per acquisire clienti a un costo sostenibile, coerente con il prezzo e il ciclo di vendita.",
    framework: `Griglia di riferimento:
- Coerenza prezzo/motion: self-service e PLG sotto i ~1.000€/anno; inside sales fino a ~25.000€; field sales sopra; enterprise con ciclo 6-18 mesi richiede cassa per sostenerlo.
- Canali: outbound, inbound/contenuti, partnership e canale indiretto, marketplace, community, eventi, PR, referral. Concentrarsi su 1-2 canali dimostrati batte una lista di dieci.
- Bullseye framework (Weinberg & Mares) per la selezione dei canali; test con budget e metriche di esito prima dello scale-up.
- Primi 100 clienti: nome e cognome dei primi 10, poi meccanismo ripetibile. "Faremo marketing digitale" non è un go-to-market.
- Funnel AARRR (Acquisition, Activation, Retention, Referral, Revenue) con tassi di conversione per stadio, anche stimati ma dichiarati come tali.
- Economia dell'acquisizione: CAC per canale, ciclo di vendita, tasso di conversione, valore medio del contratto; CAC payback sotto i 12-18 mesi è il riferimento SaaS, oltre serve più capitale.
- Attriti: integrazione, migrazione dati, formazione, procurement, compliance del cliente; in B2B regolato il tempo di acquisto è il primo nemico.
- Espansione: land & expand, upsell, cross-sell, net dollar retention.`,
    probes: [
      "Chi sono i primi 10 clienti per nome e come li raggiungete?",
      "Qual è il canale che avete già testato, con quali numeri?",
      "Quanto dura il ciclo di vendita e chi firma?",
    ],
    weight: 1.1,
    web: false,
    defaultOn: true,
  },
  {
    id: "traction",
    name: "Trazione & Metriche",
    icon: "📈",
    short: "KPI, unit economics, coorti, qualità dei dati",
    objective:
      "Verificare quali numeri esistono davvero, come sono calcolati, e cosa dicono sul product-market fit e sull'economia unitaria.",
    framework: `Griglia di riferimento:
- Distinguere metriche di vanità (download, iscritti, visite, LOI non vincolanti) da metriche di sostanza (clienti paganti, ricavi ricorrenti, uso ripetuto, retention per coorte).
- KPI per modello: SaaS (MRR/ARR, churn logico e lordo, NDR, CAC, LTV, CAC payback, magic number, burn multiple), marketplace (GMV, take rate, liquidità, ripetizione lato domanda e offerta, concentrazione), e-commerce (AOV, margine di contribuzione, tasso di ritorno, frequenza), hardware (unità, margine per unità, lead time), servizi (utilizzo, tariffa, marginalità per progetto).
- Benchmark indicativi da usare con prudenza e sempre contestualizzati: churn mensile B2B SaaS 1-2% (PMI) e <1% (enterprise); NDR >100% buono, >120% ottimo; LTV/CAC ≥3; Rule of 40 (crescita % + margine EBITDA %) per fasi avanzate; burn multiple <2 buono in early stage.
- Analisi per coorte: la retention è l'unico vero test del product-market fit; una curva che si appiattisce sopra lo zero vale più di qualsiasi crescita di iscritti.
- Qualità del dato: periodo, definizione, fonte, strumento di misura. Numeri senza definizione vanno marcati come non verificabili.
- Fase pre-ricavi: individuare gli indicatori anticipatori validi (lettere d'intenti firmate, pilot pagati, lista d'attesa attiva, uso settimanale del prototipo).`,
    probes: [
      "Quali numeri sono misurati e con quale strumento?",
      "Come si comporta la retention per coorte nei primi 6 mesi?",
      "Quanti clienti pagano oggi e quanto, al netto di sconti e pilot gratuiti?",
    ],
    weight: 1.2,
    web: false,
    defaultOn: true,
  },
  {
    id: "team",
    name: "Team & Governance",
    icon: "👥",
    short: "Founder-market fit, competenze mancanti, equity, governance",
    objective:
      "Valutare la capacità del team di eseguire questo piano specifico, individuare i buchi di competenza e i rischi societari.",
    framework: `Griglia di riferimento:
- Founder-market fit: perché proprio queste persone, per questo problema; esperienza diretta nel dominio, accesso ai clienti, credibilità tecnica.
- Copertura dei ruoli critici rispetto alla fase: prodotto, tecnologia, vendita, operazioni. In early stage il buco più frequente e più costoso è la vendita.
- Impegno: full-time vs part-time; founder part-time su progetti che richiedono vendita quotidiana è un rischio da dichiarare.
- Equity e vesting: distribuzione tra i soci, vesting (4 anni con cliff 1 anno è lo standard), soci inattivi con quote rilevanti (dead equity) — segnale d'allarme per gli investitori.
- Governance: forma societaria, patti parasociali, deleghe, consiglio, advisor con ruolo reale vs decorativo.
- Cap table: pulizia, spazio per aumenti futuri, presenza di investitori che bloccano round successivi, eventuale pool per i dipendenti.
- Piano di assunzioni collegato alle milestone e al costo: ogni assunzione deve corrispondere a un collo di bottiglia identificato.`,
    probes: [
      "Chi fa cosa a tempo pieno, e da quanto?",
      "Qual è la competenza che oggi manca di più e come pensate di colmarla?",
      "Come sono distribuite le quote e c'è vesting?",
    ],
    weight: 1.2,
    web: false,
    defaultOn: true,
  },
  {
    id: "finanza",
    name: "Piano Economico-Finanziario",
    icon: "🧮",
    short: "Proiezioni, cassa, runway, fabbisogno e uso dei fondi",
    objective:
      "Verificare la coerenza interna delle proiezioni, la sostenibilità di cassa e la ragionevolezza del fabbisogno finanziario richiesto.",
    framework: `Griglia di riferimento:
- Coerenza interna: i ricavi derivano da driver espliciti (clienti x prezzo x frequenza) e non da una percentuale di crescita imposta; i costi seguono il piano operativo (persone, marketing, infrastruttura); il piano assunzioni è coerente con i ricavi.
- Tre prospetti minimi: conto economico, flusso di cassa, stato patrimoniale semplificato. In early stage la cassa conta più dell'utile.
- Runway = cassa disponibile / burn netto mensile. Sotto i 6 mesi è emergenza, 12-18 mesi è la norma per un round, 24 mesi è comfort.
- Uso dei fondi: allocazione per voce (prodotto, vendita, team, capitale circolante) collegata a milestone verificabili; il round deve portare a un punto di valore misurabile, non "a sopravvivere".
- Ipotesi chiave da isolare e testare: tasso di conversione, prezzo medio, churn, tempi di incasso, costo di acquisizione, costi del personale con oneri reali (in Italia il costo azienda è circa 1,4-1,6x la RAL).
- Sensibilità: cosa succede se i ricavi sono la metà e i costi il 20% in più; il piano regge o serve un nuovo round anticipato?
- Segnali d'allarme: curva a bastone da hockey senza driver, margini che migliorano da soli, costi di vendita che non crescono con i ricavi, assenza di IVA/fiscalità/capitale circolante, ricavi contabilizzati prima dell'incasso senza gestione dei tempi di pagamento.
- Fonti di finanziamento non diluitive in Italia/UE da considerare quando pertinenti: credito d'imposta R&S e innovazione, SMART&START Invitalia, bandi regionali, Fondo di Garanzia PMI, EIC Accelerator e strumenti Horizon per progetti deep-tech.`,
    probes: [
      "Quali sono le 3 ipotesi da cui dipende tutto il piano?",
      "Qual è il runway attuale e la data in cui finisce la cassa?",
      "A cosa servono esattamente i fondi richiesti e quale milestone sbloccano?",
    ],
    weight: 1.2,
    web: false,
    defaultOn: true,
  },
  {
    id: "rischi",
    name: "Rischi, Normativa & Compliance",
    icon: "🛡️",
    short: "Registro dei rischi, vincoli regolatori, dati e AI Act",
    objective:
      "Costruire un registro dei rischi con probabilità, impatto e mitigazione, e verificare i vincoli normativi applicabili.",
    framework: `Griglia di riferimento:
- Categorie: mercato, tecnologia, esecuzione, finanza, persone, normativa, reputazione, dipendenza da terzi, concentrazione clienti.
- Per ogni rischio: descrizione, probabilità (bassa/media/alta), impatto (basso/medio/alto), segnale anticipatore, mitigazione concreta e responsabile.
- Normativa frequente da verificare in base al settore: GDPR e trattamento dati personali (base giuridica, informative, DPA con i fornitori, trasferimenti extra-UE, DPIA quando richiesta), Regolamento UE sull'intelligenza artificiale per sistemi AI (classificazione del rischio, obblighi di trasparenza, tempistiche di applicazione), NIS2 per soggetti in perimetro, normativa di settore (sanitario e dispositivi medici, fintech e autorizzazioni, food, energia, edilizia, istruzione), tutela dei consumatori per il B2C, accessibilità digitale.
- Proprietà intellettuale: titolarità del codice e dei contenuti (attenzione a collaboratori e agenzie senza cessione scritta), marchi registrati, brevetti, segreti industriali, licenze open source e loro compatibilità con un prodotto commerciale.
- Dati: origine dei dati di addestramento, diritti d'uso, dati dei clienti come asset e come responsabilità.
- Continuità: fornitori critici, lock-in tecnologico, piano di uscita.
- Quando usi la ricerca web: verifica lo stato aggiornato degli obblighi normativi rilevanti e cita la fonte; segnala esplicitamente che non è consulenza legale.`,
    probes: [
      "Qual è il rischio che, se si materializzasse domani, fermerebbe il progetto?",
      "Chi è titolare del codice e della proprietà intellettuale?",
      "Quali dati personali trattate e con quale base giuridica?",
    ],
    weight: 1,
    web: true,
    defaultOn: true,
  },
  {
    id: "impatto",
    name: "Impatto & Sostenibilità",
    icon: "🌱",
    short: "Teoria del cambiamento, KPI di impatto, ESG",
    objective:
      "Valutare l'impatto dichiarato con misure verificabili e distinguerlo dalle affermazioni di facciata.",
    framework: `Griglia di riferimento:
- Teoria del cambiamento: risorse -> attività -> output -> outcome -> impatto, con indicatori per ogni livello.
- Misurabilità: indicatori quantitativi con baseline, metodo di rilevazione e periodicità; senza baseline non c'è impatto dimostrabile.
- Riferimenti: obiettivi di sviluppo sostenibile (SDG) pertinenti e non decorativi, tassonomia UE se rilevante per la finanza, principi ESG proporzionati alla dimensione.
- Additività: l'impatto sarebbe avvenuto comunque senza il progetto?
- Rischio greenwashing/impact-washing: affermazioni generiche, metriche scelte perché convenienti, assenza di dati negativi.
- Rilevanza economica: l'impatto apre accesso a bandi, clienti pubblici, finanza a impatto, o è neutro rispetto al modello?`,
    probes: [
      "Qual è l'indicatore di impatto principale e come lo misurate?",
      "Qual è la baseline di partenza?",
      "L'impatto genera vantaggio economico o è un costo?",
    ],
    weight: 0.6,
    web: false,
    defaultOn: false,
  },
  {
    id: "investment-readiness",
    name: "Investment Readiness",
    icon: "🏁",
    short: "Sintesi trasversale, memo per investitori, prossimi passi",
    objective:
      "Sintetizzare l'intera analisi nella prospettiva di chi deve decidere se investire, e definire cosa va dimostrato nei prossimi 90 giorni.",
    framework: `Griglia di riferimento:
- Struttura del memo d'investimento: azienda in una riga, problema, soluzione, mercato, prodotto, trazione, team, modello, concorrenza, richiesta e uso dei fondi, rischi principali, motivi per cui si potrebbe dire di no.
- Criteri ricorrenti degli investitori early stage: team, dimensione del mercato, evidenza di trazione, difendibilità, timing, chiarezza della richiesta.
- Preparazione alla due diligence: documenti societari, cap table, contratti clienti e fornitori, IP, privacy, contabilità, metriche riproducibili. La mancanza di ordine documentale rallenta o fa saltare i round.
- Coerenza della narrazione: il pitch, il piano finanziario e i dati devono raccontare la stessa storia; le incoerenze sono il primo elemento che un investitore nota.
- Allineamento fase/strumento: pre-seed (idea + team + primi segnali), seed (product-market fit iniziale), serie A (crescita ripetibile e prevedibile); valutare se l'ammontare richiesto è coerente con la fase e con le milestone.
- Alternative al venture capital: autofinanziamento, clienti come finanziatori, debito agevolato, contributi pubblici, business angel, venture debt.
- Chiudere sempre con i 3-5 passi dei prossimi 90 giorni che spostano di più la probabilità di successo, con esito atteso misurabile.`,
    probes: [
      "Qual è la tesi d'investimento in tre righe?",
      "Qual è il motivo più forte per dire di no, e come lo neutralizzate?",
      "Cosa dimostrerete nei prossimi 90 giorni?",
    ],
    weight: 1,
    web: false,
    defaultOn: true,
  },
];

export const MODULE_MAP: Record<string, AnalysisModule> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
);

export function getModule(id: string): AnalysisModule | undefined {
  return MODULE_MAP[id];
}

export function defaultModuleIds(): string[] {
  return MODULES.filter((m) => m.defaultOn).map((m) => m.id);
}

export function modulesFor(enabled: string[]): AnalysisModule[] {
  const set = new Set(enabled);
  return MODULES.filter((m) => set.has(m.id));
}
