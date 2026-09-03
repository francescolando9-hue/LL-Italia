# App Bolle — Documento unico di continuità per il runbook magazzino

> **Rev. 4 del 03/09/2026 ore 21:30.** Da caricare in Cowork (progetto AutomazioneMagazzinoCantiere) come unico allegato per riprendere il lavoro sul tratto a valle: è autosufficiente, non richiede altri file del repo dell'app. Non contiene segreti — token e URL firmato vivono solo nel flow e nelle impostazioni dei dispositivi.

---

Sto lavorando al runbook serale del magazzino di cantiere. La sorgente delle bolle è cambiata: prima le foto arrivavano via WhatsApp e finivano a mano in `Bolle\` su `L:`, ora arrivano da un'app dedicata e atterrano in SharePoint. L'app e il flow di ricezione sono costruiti e collaudati; il tratto che va **dalla raccolta SharePoint in poi** è quello da irrobustire, ed è il motivo di questa sessione.

## 1. La catena, dall'inizio

**App "LL Italia" — PWA installata sui telefoni.** Repo pubblico `francescolando9-hue/LL-Italia`, pubblicata su GitHub Pages. Vanilla JS, nessun framework, nessun account M365 richiesto agli operai. È un contenitore a moduli: oggi c'è solo il modulo **Bolle**, **capture-only** — raccoglie e invia foto, non legge nulla del contenuto.

L'operatore fa tre tocchi: fotografa la bolla, controlla il cantiere (resta l'ultimo usato), preme Invia. La foto viene compressa (JPEG, lato lungo 2500 px, qualità 0,85 — la leggibilità per l'OCR prevale sul peso) e messa in coda su IndexedDB **prima** di qualunque tentativo di rete: se il telefono è senza campo o l'app viene chiusa, la foto non si perde e riparte da sola quando torna la connessione, con retry a backoff da 5 secondi fino a 5 minuti. Una foto esce dalla coda **solo** alla conferma del server.

Tre identificatori accompagnano ogni bolla lungo tutta la catena, e nessuno cambia tra un tentativo di invio e l'altro:

- **`idClient`** — GUID generato dal telefono per quella bolla. È la sua identità stabile, molto più affidabile del nome del file.
- **`idDispositivo`** — GUID generato alla prima apertura dell'app e mai più cambiato: identifica **l'installazione**, non la persona. Non si muove se l'operatore corregge il proprio nome; riparte solo con una reinstallazione.
- **`progressivo`** — intero che quel telefono incrementa di 1 a ogni bolla **messa in coda**, dal n. 1 della prima installazione in avanti. Assegnato all'accodamento e non allo scatto: una foto scartata dalle anteprime prima di inviare non consuma un numero.

Gli ultimi due vanno letti insieme: sono il controllo di continuità descritto al punto 2.

**Invio.** POST JSON all'endpoint del flow, **un file per richiesta**, `Content-Type: application/json`, `api-version=2024-10-01` obbligatoria nell'URL.

| Campo | Contenuto |
|---|---|
| `token` | token statico condiviso col flow |
| `commessa` | **solo il codice**: `MAR` \| `SNZ2.2` \| `MNG` (a video l'operatore vede l'etichetta estesa) |
| `operatore` | nome e cognome, digitati alla prima apertura dell'app. **Campo libero**, nessun elenco vincolato |
| `idClient` | GUID della bolla |
| `idDispositivo` | GUID dell'installazione: il titolare della sequenza |
| `progressivo` | intero, sequenza di quel dispositivo |
| `dataInvio` | ISO 8601 con fuso, **ora reale del telefono** (`2026-09-03T09:17:25+02:00`) |
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
- Colonne: `Commessa`, `Operatore`, `DataScatto`, `IdClient`, `IdDispositivo`, `Progressivo`.
- **Attenzione:** la colonna della data si chiama `DataScatto`, il campo nel payload si chiama `dataInvio`. Sono la stessa cosa — l'istante dello scatto sul telefono — e il flow mappa `triggerBody()?['dataInvio']` su `DataScatto`. Fa fede il nome della colonna.

## 2. Cosa cambia per il runbook, rispetto a prima

- **La commessa non va più indovinata.** Prima si deduceva da chi mandava la foto o da dove finiva; ora la colonna `Commessa` arriva certa dalla fonte, scelta dall'operatore in cantiere. Stesso discorso per `Operatore` e per `DataScatto`, che è l'ora reale dello scatto e non quella di arrivo. **Il runbook deve leggere le colonne, non interpretare il nome del file.**
- **`DataScatto` va trattata come testo**, non come data SharePoint: deve contenere la stringa ISO così com'è. Scelta deliberata del 03/09/2026, per chiudere uno sfasamento di 7 ore che SharePoint introduceva pur essendo corretti sia il fuso del sito sia quello del profilo personale (verificati entrambi). Va letta come stringa; l'ordinamento cronologico regge perché in ISO 8601 l'ordine alfabetico coincide con quello temporale. **Il cambio di tipo è tra gli interventi aperti al punto 3: da verificare prima di fidarsi del valore.**
- **`IdClient` è la chiave stabile** per riconoscere una bolla.
- **`IdDispositivo` + `Progressivo` rendono misurabile il tratto telefono → raccolta.** Raggruppando le bolle per `IdDispositivo` e leggendo la sequenza dei `Progressivo`, **un numero mancante è una foto scattata e mai arrivata**: prima di questi campi quel tratto non era verificabile in alcun modo. Tre avvertenze:
  - **si raggruppa per `IdDispositivo`, mai per `Operatore`**: quello è testo libero, e basta una grafia diversa del nome per spezzare una sequenza, o due telefoni della stessa persona per fonderne due;
  - un telefono **reinstallato riparte da 1** con un `IdDispositivo` nuovo: evento atteso, e riconoscibile proprio perché l'identificativo cambia;
  - il numero è assegnato all'accodamento, quindi **non esistono buchi legittimi**: ogni salto va spiegato uno per uno.

  Nota per il caso «bolla mandata per sbaglio»: quando l'ufficio cancella da SharePoint una bolla e questa viene rimandata, l'operatore può azzerare i contatori del giorno sul telefono, ma **la numerazione progressiva prosegue e non si azzera mai**. La bolla rimandata porta quindi un numero nuovo, e il numero della bolla cancellata resta scoperto in raccolta: è un buco che il controllo di continuità segnalerà. **Le cancellazioni fatte dall'ufficio vanno annotate**, altrimenti si presentano come bolle perse.
- **La deduplica lato flow è un controllo inerte.** La Condition sui duplicati esiste ma non scatta mai (causa non determinata, chiusa per decisione il 03/09/2026). Non è un blocco: il nome del file è deterministico — stessa bolla, stesso `dataInvio`, stesso `idClient`, stesso nome — quindi un reinvio **sovrascrive** il file esistente e non genera un doppione in raccolta. Conseguenza per il runbook: **non contare i file per stimare i doppioni**, l'omonimia li maschera.

## 3. Interventi aperti su SharePoint e sul flow (prerequisiti, non lavoro di runbook)

Quattro cose sono decise ma da eseguire, o da verificare. Finché non sono fatte, i dati corrispondenti non sono affidabili.

1. **Colonna `Progressivo`** — raccolta → *Aggiungi colonna*: tipo **Numero**, nome `Progressivo`, **0** decimali, valore predefinito **vuoto**. Non zero: la sequenza parte da 1, quindi uno 0 sarebbe un dato falso; vuoto significa «bolla arrivata da una versione precedente dell'app».
2. **Colonna `IdDispositivo`** — tipo **Riga di testo singola**.
3. **Mappature nel flow** — azione *Update file properties*: campo `Progressivo` ← `triggerBody()?['progressivo']` (nessuna conversione, nessun `int()`: l'app manda già un intero JSON), campo `IdDispositivo` ← `triggerBody()?['idDispositivo']`. Senza queste mappature i campi arrivano nel corpo della richiesta e vengono buttati.
4. **Colonna della data di tipo testo** — `DataScatto` deve essere **Riga di testo singola**, non *Data e ora*, col flow che vi scrive `triggerBody()?['dataInvio']` verbatim. **Da verificare se è già stato fatto:** se la colonna è ancora di tipo data, i valori in raccolta possono essere sfasati di alcune ore e non vanno usati come ora dello scatto.

Verifica dei punti 1-3, sui numeri: tre foto di fila dallo stesso telefono senza scartarne nessuna dalle anteprime → in raccolta tre numeri consecutivi, tutti con lo stesso `IdDispositivo`. Colonna vuota su tutte = mappatura assente. Numeri non consecutivi a parità di dispositivo = una bolla non è arrivata, ed è esattamente il difetto che i campi servono a scoprire.

## 4. Cosa NON è ancora risolto a valle — il lavoro di questa sessione

1. **Manca la marcatura del lavorato.** In raccolta non c'è nulla che distingua una bolla già processata da una nuova. Se il runbook gira ogni sera sulla stessa cartella, o rilavora tutto o rischia di saltare qualcosa. Da decidere: una colonna `Stato` che il runbook aggiorna, oppure lo spostamento dei file lavorati in una sottocartella. **È il punto più urgente.**
2. **Manca la gestione degli scarti**: bolle illeggibili, foto che non sono bolle, doppioni reali (stessa bolla fotografata due volte — due scatti distinti, che nessun automatismo riconosce senza OCR).
3. **Il collaudo si ferma a metà.** La catena vera è "scattate → atterrate → **lavorate**". Il primo tratto ora è misurabile in modo indipendente dal telefono grazie a `IdDispositivo` + `Progressivo` (a condizione che i punti 1-3 del capitolo 3 siano fatti). L'ultimo tratto, da atterrate a lavorate, non è mai stato misurato: serve un conteggio confrontabile ogni sera.

## 5. Cose che l'app già fa, e che a valle non vanno duplicate

- **Avviso di scarsa leggibilità allo scatto:** l'app misura nitidezza (varianza del laplaciano) e pixel bruciati e avvisa se la foto è mossa, scura o in controluce. **Avvisa, non blocca** — la regola che nessuna bolla si perda prevale — quindi in raccolta possono comunque arrivare bolle illeggibili: la gestione dello scarto resta lavoro del runbook (punto 4.2).
- **Riconoscimento del file identico:** se dalla galleria viene aggiunto lo stesso file già inviato, l'app lo riconosce dall'impronta SHA-256 e chiede conferma. Copre il doppio invio dello stesso file, **non** due scatti distinti della stessa bolla.
- **Storico locale sul telefono:** calendario del mese, bolle inviate con miniatura, correzione del cantiere finché la foto è ancora sul dispositivo. È il registro di quel telefono, **non** la vista condivisa della raccolta: non usarlo come fonte di verità a valle.

## 6. Vincoli e principi da rispettare

- **Collaudo sui numeri, mai sull'esito formale**: un'esecuzione riuscita non è un risultato corretto. Ogni scarto tra i conteggi è un difetto da spiegare.
- **Nessuna bolla si perde**: in dubbio, meglio rilavorare che saltare.
- **L'app è capture-only e resta tale**: OCR, attribuzione e riconciliazione stanno a valle, nel runbook.
- Standard di gruppo (nomenclatura, convenzioni, regole contabili) nella skill organizzativa `ll-italia`.

---

*Approfondimenti nel repo dell'app, non necessari per questa sessione: `README.md`, `docs/AppBolleSpecificaFunzionale….md`, `docs/AppBolleFlowRicezione….md` (struttura del flow, procedure campo per campo, esiti dei collaudi).*
