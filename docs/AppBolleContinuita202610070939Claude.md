# App Bolle — Documento unico di continuità per il runbook magazzino

> **Rev. 9 del 06/10/2026.** Allineato all'app **0.38.0** per tutto quello che riguarda il lato app: il giro dell'operatore (§1), il contratto (campo `fase`, operatore da elenco chiuso), cosa arriva certo e cosa no (§2), «Rimanda» (§2 e §5). **Non aggiornati**, perché non verificabili dal repository: lo stato degli interventi su SharePoint e sul flow (§3) e del lavoro a valle (§4), che restano come al 10/09. Lo stato corrente di raccolta e runbook è nelle letture di Cowork, e dove diverge fa fede quello.
>
> **Rev. 8 del 10/09/2026 ore 17:50.** Da caricare in Cowork (progetto AutomazioneMagazzinoCantiere) come unico allegato per riprendere il lavoro sul tratto a valle: è autosufficiente, non richiede altri file del repo dell'app. Non contiene segreti — token e URL firmato vivono solo nel flow e nelle impostazioni dei dispositivi.

---

Sto lavorando al runbook serale del magazzino di cantiere. La sorgente delle bolle è cambiata: prima le foto arrivavano via WhatsApp e finivano a mano in `Bolle\` su `L:`, ora arrivano da un'app dedicata e atterrano in SharePoint. L'app e il flow di ricezione sono costruiti e collaudati; il tratto che va **dalla raccolta SharePoint in poi** è quello da irrobustire, ed è il motivo di questa sessione.

## 1. La catena, dall'inizio

**App "LL Italia" — PWA installata sui telefoni.** Repo pubblico `francescolando9-hue/LL-Italia`, pubblicata su GitHub Pages. Vanilla JS, nessun framework, nessun account M365 richiesto agli operai. È un contenitore a moduli: **Bolle** e, dal 10/09/2026, **Foto cantiere**, che ha flow e raccolta propri e una catena separata — questo documento riguarda solo le bolle. Il modulo Bolle è **capture-only**: raccoglie e invia foto, non legge nulla del contenuto.

L'operatore fa **quattro tocchi**: fotografa la bolla, apre il menù del cantiere, sceglie il cantiere, preme Invia. **Cantiere e fase si scelgono a ogni invio** e niente si ricorda sul telefono: dopo Invia il cantiere torna a «— scegli il cantiere —» (dalla 0.38.0) e la fase a «— nessuna fase —» (dalla 0.37.9); senza cantiere Invia resta spento. La fase è facoltativa, e **una scelta vale per un invio**: se l'invio porta più bolle insieme (scelta multipla dalla galleria, o una serie di scatti), tutte prendono la stessa fase. Se la bolla è su più fogli, dopo la prima foto tocca «Aggiungi pagina a questa bolla» e scatta il foglio successivo: le pagine partono numerate nell'ordine di scatto. La foto viene compressa (JPEG, lato lungo 2500 px, qualità 0,85 — la leggibilità per l'OCR prevale sul peso) e messa in coda su IndexedDB **prima** di qualunque tentativo di rete: se il telefono è senza campo o l'app viene chiusa, la foto non si perde e riparte da sola quando torna la connessione, con retry a backoff da 5 secondi fino a 5 minuti. Una foto esce dalla coda **solo** alla conferma del server.

Tre identificatori accompagnano ogni bolla lungo tutta la catena, e nessuno cambia tra un tentativo di invio e l'altro:

- **`idClient`** — GUID generato dal telefono per quella bolla. È la sua identità stabile, molto più affidabile del nome del file.
- **`idDispositivo`** — GUID generato alla prima apertura dell'app e mai più cambiato: identifica **l'installazione**, non la persona. Non si muove se l'operatore corregge il proprio nome; riparte solo con una reinstallazione.
- **`progressivo`** — intero che quel telefono incrementa di 1 a ogni bolla **messa in coda**, dal n. 1 della prima installazione in avanti. Assegnato all'accodamento e non allo scatto: una foto scartata dalle anteprime prima di inviare non consuma un numero.

Gli ultimi due vanno letti insieme: sono il controllo di continuità descritto al punto 2.

**Invio.** POST JSON all'endpoint del flow, **un file per richiesta**, `Content-Type: application/json`, `api-version=2024-10-01` obbligatoria nell'URL.

| Campo | Contenuto |
|---|---|
| `token` | token statico condiviso col flow |
| `commessa` | **solo il codice**: `BRU` \| `MAR` \| `MNG` \| `MRS` \| `SNU` \| `SNZ2.1` \| `SNZ2.2` — sette dal 16/09/2026, erano tre (a video l'operatore vede l'etichetta estesa) |
| `fase` | codice della fase di lavoro senza spazi (`FinituraAlloggi`), dall'elenco chiuso di gruppo; per le urbanizzazioni `SNU` e `BRU` è il **lotto** (`Lotto2`). Dalla 0.31.0. **Sempre presente, vuoto** se nessuno l'ha scelta: è il valore di partenza di ogni invio |
| `operatore` | nome e cognome. ~~Campo libero~~ — **dal 14/09/2026 elenco chiuso**: il nome si sceglie, non si scrive |
| `idClient` | GUID della bolla |
| `idDispositivo` | GUID dell'installazione: il titolare della sequenza |
| `progressivo` | intero, sequenza di quel dispositivo |
| `idBolla` | GUID della **bolla**: uguale per tutte le sue pagine |
| `pagina` / `pagine` | numero della pagina e quante pagine compongono la bolla |
| `dataInvio` | ISO 8601 con fuso, **ora reale del telefono** (`2026-09-03T09:17:25+02:00`): l'istante in cui la foto **entra nell'app** — lo scatto, con la fotocamera interna; l'aggiunta, per una foto presa dalla galleria. Non è l'ora dell'invio |
| `versioneApp` | versione dell'app in uso su quel telefono (es. `0.15.0`) |
| `nomeFile` | **ignorato dal backend**: il nome lo compone il flow |
| `contenutoBase64` | il JPEG in base64 |

**Flow di ricezione** (`BolleInArrivoRicevitore`, Power Automate). Struttura:

```
manual (trigger HTTP)
├─ Condition token
│    ramo True (token errato) → Response 401 → Terminate Failed
├─ CercaDuplicati
├─ Condition duplicato
│    ramo True (già arrivata)  → Response 200 → Terminate Succeeded
├─ Create file
├─ Update file properties
└─ Response 200                ← l'unica raggiunta a file scritto
```

Le tre azioni *Response* portano l'header `Access-Control-Allow-Origin: *`, obbligatorio perché l'app gira in un browser e ogni POST JSON è preceduto da un preflight `OPTIONS`.

**Cosa significa «Inviata» nell'app, e perché conta.** Senza *Response* esplicite Power Automate risponde `202 Accepted` **all'arrivo della richiesta**, prima di eseguire il flow: l'app segnava «Inviata» anche per una foto poi scartata. Con le tre Response il verde dell'app significa **salvata**. Verificato dal vivo il 03/09/2026: con token errato l'app riceve `401` e la foto **non** risulta inviata, resta in coda e ritenta.

**Raccolta SharePoint `BolleInArrivo`** (sito Cantieri LL).

- Cartelle `AAAA/AAAAMM`, calcolate sulla **data di scatto** (`dataInvio`), non sull'orologio del flow: per le foto accodate offline e inviate ore dopo la differenza è reale.
- Nome file: `Bolla[Commessa][AAAAMMGGHHMM][Operatore][4 cifre di idClient].jpg` — es. `BollaMAR202609030917FrancescoLandod5e1.jpg`. Niente secondi (nomenclatura di gruppo); le 4 cifre dell'`idClient` evitano che due bolle inviate nello stesso minuto si sovrascrivano.
- Colonne: `Commessa`, `Fase` (esiste, verificata via REST il 18/09/2026), `Operatore`, `DataScatto`, `IdClient`, `IdDispositivo`, `Progressivo`, `IdBolla`, `Pagina`, `Pagine`, più `VersioneApp` se la si crea (facoltativa: la versione dell'app che ha mandato la bolla, utile a capire se un campo manca perché il telefono è indietro con l'aggiornamento).
- **Attenzione:** la colonna della data si chiama `DataScatto`, il campo nel payload si chiama `dataInvio`. Sono la stessa cosa — l'istante dello scatto sul telefono — e il flow mappa `triggerBody()?['dataInvio']` su `DataScatto`. Fa fede il nome della colonna.

## 2. Cosa cambia per il runbook, rispetto a prima

- **La commessa non va più indovinata.** Prima si deduceva da chi mandava la foto o da dove finiva; ora la colonna `Commessa` arriva certa dalla fonte, scelta dall'operatore in cantiere — e **dalla 0.38.0 scelta a ogni invio**: fino alla 0.37.9 l'app riproponeva l'ultimo cantiere usato, e una bolla poteva partire col cantiere dell'invio prima senza che nessuno lo guardasse.
- **La fase è un'indicazione dell'operatore, non un dato certo.** Arriva solo se qualcuno l'ha scelta per quell'invio; vuota significa che nessuno l'ha scelta. Una sola scelta vale per tutte le bolle dello stesso invio. Deciso da Francesco il 06/10/2026: **le regole di attribuzione del runbook prevalgono sulla fase dell'app.** Stesso discorso per `Operatore` e per `DataScatto`, che è l'ora reale dello scatto e non quella di arrivo. **Il runbook deve leggere le colonne, non interpretare il nome del file.**
- **`DataScatto` va trattata come testo**, non come data SharePoint: deve contenere la stringa ISO così com'è. Scelta deliberata del 03/09/2026, per chiudere uno sfasamento di 7 ore che SharePoint introduceva pur essendo corretti sia il fuso del sito sia quello del profilo personale (verificati entrambi). Va letta come stringa; l'ordinamento cronologico regge perché in ISO 8601 l'ordine alfabetico coincide con quello temporale. **Il cambio di tipo è tra gli interventi aperti al punto 3: da verificare prima di fidarsi del valore.**
- **`IdClient` è la chiave stabile** per riconoscere una bolla.
- **`IdDispositivo` + `Progressivo` rendono misurabile il tratto telefono → raccolta.** Raggruppando le bolle per `IdDispositivo` e leggendo la sequenza dei `Progressivo`, **un numero mancante è una foto scattata e mai arrivata**: prima di questi campi quel tratto non era verificabile in alcun modo. Tre avvertenze:
  - **si raggruppa per `IdDispositivo`, mai per `Operatore`**: il nome è della persona, non del telefono — due telefoni della stessa persona fonderebbero due sequenze — e fino al 14/09/2026 era testo libero, dove bastava una grafia diversa per spezzarne una;
  - un telefono **reinstallato riparte da 1** con un `IdDispositivo` nuovo: evento atteso, e riconoscibile proprio perché l'identificativo cambia;
  - il numero è assegnato all'accodamento, quindi **non esistono buchi legittimi**: ogni salto va spiegato uno per uno.

  **Il caso «bolla mandata per sbaglio» — risolto il 03/09/2026 con `Stato = Annullata`.** Una bolla cancellata dalla raccolta ha già consumato il suo progressivo: la rimandata ne prende uno nuovo e il numero cancellato resta scoperto, cioè si presenta come una bolla persa. Sul telefono non è correggibile — l'operatore può azzerare i contatori del giorno, ma **la numerazione progressiva prosegue e non si azzera mai**, per non aprire buchi falsi. La soluzione è quindi in raccolta:
  - le bolle arrivate per sbaglio **non si cancellano**: si portano allo stato **`Annullata`** (valore aggiunto alla colonna `Stato`, vista *Annullate*), così il file resta, il progressivo resta occupato e il buco non si forma;
  - per i casi in cui il file deve davvero sparire, e per le cancellazioni già avvenute, c'è la lista **`EccezioniContinuita`** (`Title`, `IdDispositivo`, `ProgressivoDa`, `ProgressivoA`, `Motivo`, `DataEvento` testo `AAAAMMGG`): **il controllo di continuità la legge prima di segnalare un numero mancante**, e un buco coperto da un'eccezione non è un difetto;
  - prima eccezione già registrata: progressivi **1-23**, collaudo del 03/09 cancellato dalla raccolta.

  Le eccezioni si leggono **per dispositivo**: `IdDispositivo` vuoto in una riga della lista significa che quell'eccezione non si aggancia a nessuna sequenza, e il buco continuerà a comparire. L'identificativo del telefono si legge sull'app, in *Impostazioni app → Questo dispositivo*.
- **Una bolla non è più una foto: può essere su più pagine** (dal 10/09/2026). Il contratto resta un file per richiesta, quindi una bolla di tre fogli sono **tre righe** in raccolta, legate da `IdBolla` e ordinate da `Pagina`; `Pagine` dice quante devono essere. Tre conseguenze:
  - **si ricompone raggruppando per `IdBolla` e ordinando per `Pagina`**, mai per orario di arrivo o per nome del file;
  - **un gruppo incompleto è un difetto da spiegare**: `Pagine` = 3 con due righe presenti significa una pagina mai arrivata, e nella sequenza dei progressivi di quel dispositivo si trova il buco corrispondente;
  - anche una bolla di una pagina sola ha il suo `IdBolla`, con `Pagina` 1 e `Pagine` 1: **la regola è una sola, senza casi particolari**.

  Attenzione a non confondere i conteggi: **il collaudo si fa in pagine, non in bolle.** Tre pagine sono tre file in raccolta e tre progressivi consumati; l'app conta pagine, e così deve fare il confronto serale.
- **«Rimanda», su ogni bolla inviata (dalla 0.36.0).** Senza modifiche riusa **lo stesso `idClient` e lo stesso progressivo**: non nasce una bolla nuova. Con modifiche (cantiere o fase) è un **invio nuovo**, con `idClient` e progressivo nuovi e l'`idBolla` dell'originale; la bolla già mandata **resta in raccolta e va portata ad `Annullata`** dall'ufficio — il telefono non può sapere se è già stata lavorata.
- **La deduplica lato flow è un controllo inerte** (stato misurato al 10/09, documento del flow rev. 7). La specifica Bolle (rev. 5, 18/09) prevede invece che a «Rimanda» senza modifiche il flow risponda `gia_presente`: **quale dei due valga oggi va letto sul run del flow**, non dedotto. La Condition sui duplicati esiste ma non scatta mai (causa non determinata, chiusa per decisione il 03/09/2026). Non è un blocco: il nome del file è deterministico — stessa bolla, stesso `dataInvio`, stesso `idClient`, stesso nome — quindi un reinvio **sovrascrive** il file esistente e non genera un doppione in raccolta. Conseguenza per il runbook: **non contare i file per stimare i doppioni**, l'omonimia li maschera.

## 3. Interventi aperti su SharePoint e sul flow (prerequisiti, non lavoro di runbook)

Cinque cose sono decise ma da eseguire, o da verificare. Finché non sono fatte, i dati corrispondenti non sono affidabili.

1. **Colonna `Progressivo`** — raccolta → *Aggiungi colonna*: tipo **Numero**, nome `Progressivo`, **0** decimali, valore predefinito **vuoto**. Non zero: la sequenza parte da 1, quindi uno 0 sarebbe un dato falso; vuoto significa «bolla arrivata da una versione precedente dell'app».
2. **Colonna `IdDispositivo`** — tipo **Riga di testo singola**.
3. **Colonne della bolla su più pagine** — `IdBolla` (Riga di testo singola), `Pagina` e `Pagine` (Numero, 0 decimali). Senza, le pagine arrivano ma non sono ricomponibili.
4. **Mappature nel flow** — azione *Update file properties*: `Progressivo` ← `triggerBody()?['progressivo']` (nessuna conversione, nessun `int()`: l'app manda già interi JSON), `IdDispositivo` ← `triggerBody()?['idDispositivo']`, `IdBolla` ← `triggerBody()?['idBolla']`, `Pagina` ← `triggerBody()?['pagina']`, `Pagine` ← `triggerBody()?['pagine']`. Senza queste mappature i campi arrivano nel corpo della richiesta e vengono buttati.
5. **Colonna della data di tipo testo** — `DataScatto` deve essere **Riga di testo singola**, non *Data e ora*, col flow che vi scrive `triggerBody()?['dataInvio']` verbatim. **Da verificare se è già stato fatto:** se la colonna è ancora di tipo data, i valori in raccolta possono essere sfasati di alcune ore e non vanno usati come ora dello scatto.

Verifica dei punti 1-4, sui numeri: tre foto di fila dallo stesso telefono senza scartarne nessuna dalle anteprime → in raccolta tre numeri consecutivi, tutti con lo stesso `IdDispositivo`. Poi una bolla di tre pagine → tre righe con lo stesso `IdBolla`, `Pagina` 1, 2, 3 e `Pagine` 3. Colonna vuota su tutte = mappatura assente. Numeri non consecutivi a parità di dispositivo = una bolla non è arrivata, ed è esattamente il difetto che i campi servono a scoprire.

## 4. Cosa NON è ancora risolto a valle — il lavoro di questa sessione

1. **Manca la marcatura del lavorato.** In raccolta non c'è nulla che distingua una bolla già processata da una nuova. Se il runbook gira ogni sera sulla stessa cartella, o rilavora tutto o rischia di saltare qualcosa. Da decidere: una colonna `Stato` che il runbook aggiorna, oppure lo spostamento dei file lavorati in una sottocartella. **È il punto più urgente.**
2. **Manca la gestione degli scarti**: bolle illeggibili, foto che non sono bolle, doppioni reali (stessa bolla fotografata due volte — due scatti distinti, che nessun automatismo riconosce senza OCR).
3. **Il collaudo si ferma a metà.** La catena vera è "scattate → atterrate → **lavorate**". Il primo tratto ora è misurabile in modo indipendente dal telefono grazie a `IdDispositivo` + `Progressivo` (a condizione che i punti 1-4 del capitolo 3 siano fatti). L'ultimo tratto, da atterrate a lavorate, non è mai stato misurato: serve un conteggio confrontabile ogni sera.

## 5. Cose che l'app già fa, e che a valle non vanno duplicate

- **Avviso di scarsa leggibilità allo scatto:** l'app misura nitidezza (varianza del laplaciano) e pixel bruciati e avvisa se la foto è mossa, scura o in controluce. **Avvisa, non blocca** — la regola che nessuna bolla si perda prevale — quindi in raccolta possono comunque arrivare bolle illeggibili: la gestione dello scarto resta lavoro del runbook (punto 4.2).
- **Riconoscimento del file identico:** se dalla galleria viene aggiunto lo stesso file già inviato, l'app lo riconosce dall'impronta SHA-256 e chiede conferma. Copre il doppio invio dello stesso file, **non** due scatti distinti della stessa bolla.
- **Storico locale sul telefono:** calendario del mese, bolle inviate con miniatura, «Rimanda» e correzione del cantiere finché la foto è ancora sul dispositivo — dalla 0.38.0 il menù del cantiere giusto parte da «— scegli il cantiere —» e Rimanda resta spento finché non si sceglie. È il registro di quel telefono, **non** la vista condivisa della raccolta: non usarlo come fonte di verità a valle.

## 6. Vincoli e principi da rispettare

- **Collaudo sui numeri, mai sull'esito formale**: un'esecuzione riuscita non è un risultato corretto. Ogni scarto tra i conteggi è un difetto da spiegare.
- **Nessuna bolla si perde**: in dubbio, meglio rilavorare che saltare.
- **L'app è capture-only e resta tale**: OCR, attribuzione e riconciliazione stanno a valle, nel runbook.
- Standard di gruppo (nomenclatura, convenzioni, regole contabili) nella skill organizzativa `ll-italia`.

---

*Approfondimenti nel repo dell'app, non necessari per questa sessione: `docs/INDICE.md` (i nomi completi dei documenti), `README.md`, `docs/AppBolleSpecificaFunzionale….md`, `docs/AppBolleFlowRicezione….md` (struttura del flow, procedure campo per campo, esiti dei collaudi).*
