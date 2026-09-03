# App Bolle — Prompt di continuità per il runbook magazzino

> Da incollare in Cowork (progetto AutomazioneMagazzinoCantiere) per riprendere il lavoro sul tratto a valle. Non contiene segreti: token e URL firmato vivono solo nel flow e nelle impostazioni dei dispositivi.

---

Sto lavorando al runbook serale del magazzino di cantiere. La sorgente delle bolle è cambiata: prima le foto arrivavano via WhatsApp e finivano a mano in `Bolle\` su `L:`, ora arrivano da un'app dedicata e atterrano in SharePoint. L'app e il flow di ricezione sono costruiti e collaudati; il tratto che va **dalla raccolta SharePoint in poi** è quello da irrobustire, ed è il motivo di questa sessione.

## Com'è fatta la catena, dall'inizio

**1. App "LL Italia" — PWA installata sui telefoni.** Repo pubblico `francescolando9-hue/LL-Italia`, pubblicata su GitHub Pages. Vanilla JS, nessun framework. È un contenitore a moduli: oggi c'è solo il modulo **Bolle**, capture-only — raccoglie e invia foto, non legge nulla del contenuto.

L'operatore fa tre tocchi: fotografa la bolla, controlla il cantiere (resta l'ultimo usato), preme Invia. La foto viene compressa (JPEG, lato lungo 2500 px, qualità 0,85) e messa in coda su IndexedDB **prima** di qualunque tentativo di rete: se il telefono è senza campo o l'app viene chiusa, la foto non si perde e riparte da sola quando torna la connessione, con retry a backoff da 5 secondi fino a 5 minuti.

Ogni invio porta un **`idClient`** (GUID generato dal telefono) che non cambia tra un tentativo e l'altro: è l'identità di quella bolla lungo tutta la catena.

Ogni foto accodata porta anche un **`progressivo`**: un intero che quel telefono incrementa di 1 a ogni bolla messa in coda, dal n. 1 della prima installazione in avanti. Come `idClient`, è dell'immagine e non della richiesta: non cambia tra un retry e l'altro, e una foto scartata dalle anteprime prima di inviare non consuma un numero. Serve al controllo descritto sotto.

**2. Invio.** POST JSON all'endpoint del flow, un file per richiesta, con questi campi: `token`, `commessa` (solo il codice: MAR | SNZ2.2 | MNG), `operatore` (nome e cognome digitati alla prima apertura), `idClient`, `progressivo` (intero, sequenza di quel dispositivo), `dataInvio` (ISO 8601 con fuso, ora reale del telefono), `nomeFile` (ignorato dal backend), `contenutoBase64`.

**3. Flow di ricezione** (`BolleInArrivoRicevitore`, Power Automate). Controlla il token, cerca eventuali duplicati, salva il file e scrive i metadati, poi risponde. La foto esce dalla coda del telefono **solo** quando riceve `200`, e quel `200` arriva dopo il salvataggio: se il salvataggio fallisce, l'app resta rossa e riprova.

**4. Raccolta SharePoint `BolleInArrivo`** (sito Cantieri LL). Cartelle `AAAA/AAAAMM` calcolate sulla data di scatto. Nome file: `Bolla[Commessa][AAAAMMGGHHMM][Operatore][4 cifre di idClient].jpg`. Colonne: `Commessa`, `Operatore`, `DataInvio`, `IdClient`, `Progressivo`.

## Cosa cambia per il runbook, rispetto a prima

- **La commessa non va più indovinata.** Prima si deduceva da chi mandava la foto o da dove finiva; ora la colonna `Commessa` arriva certa dalla fonte, scelta dall'operatore in cantiere. Stesso discorso per `Operatore` e per `DataInvio`, che è l'ora reale dello scatto e non quella di arrivo. **Il runbook deve leggere le colonne, non interpretare il nome del file.**
- **`DataInvio` è una colonna di testo**, non una data SharePoint: contiene la stringa ISO così com'è (`2026-09-03T09:17:25+02:00`). Scelta deliberata, per evitare le conversioni di fuso che SharePoint applicava. Va trattata come stringa; l'ordinamento cronologico funziona lo stesso perché in ISO 8601 l'ordine alfabetico coincide con quello temporale.
- **`IdClient` è la chiave stabile** per riconoscere una bolla, molto più del nome file.
- **`Progressivo` rende misurabile il tratto telefono → raccolta.** Ordinando le bolle per operatore e leggendo la sequenza, **un numero mancante è una foto scattata e mai arrivata**: prima di questo campo quel tratto non era verificabile in alcun modo. Tre avvertenze nell'usarlo:
  - la sequenza è **per dispositivo, non globale**: due telefoni hanno entrambi il proprio n. 1, quindi il campo va letto **sempre insieme a `Operatore` e `IdClient`**, mai da solo;
  - un telefono **reinstallato riparte da 1**: il controllo deve tollerarlo e trattare la ripartenza come evento atteso, non come anomalia;
  - il numero è assegnato all'accodamento, quindi **non ci sono buchi legittimi**: ogni salto va spiegato uno per uno.

## Cosa NON è ancora risolto a valle — il lavoro di questa sessione

1. **Manca la marcatura del lavorato.** In raccolta non c'è nulla che distingua una bolla già processata da una nuova. Se il runbook gira ogni sera sulla stessa cartella, o rilavora tutto o rischia di saltare qualcosa. Da decidere: una colonna `Stato` che il runbook aggiorna, oppure lo spostamento dei file lavorati in una sottocartella. È il punto più urgente.
2. **Manca la gestione degli scarti**: bolle illeggibili, foto che non sono bolle, doppioni reali (stessa bolla fotografata due volte, che nessun sistema automatico può riconoscere senza OCR).
3. **Il collaudo si ferma a metà.** La catena vera è "scattate → atterrate → **lavorate**". Il primo tratto ora è misurabile in modo indipendente dal telefono, grazie a `Progressivo` — ma **richiede che la colonna esista in raccolta e sia mappata nel flow**, altrimenti il campo arriva e viene buttato. L'ultimo tratto, da atterrate a lavorate, non è mai stato misurato: serve un conteggio confrontabile ogni sera.

## Vincoli e principi da rispettare

- **Collaudo sui numeri, mai sull'esito formale**: un'esecuzione riuscita non è un risultato corretto. Ogni scarto tra i conteggi è un difetto da spiegare.
- **Nessuna bolla si perde**: in dubbio, meglio rilavorare che saltare.
- Standard di gruppo (nomenclatura, convenzioni, regole contabili) nella skill organizzativa `ll-italia`.
- L'app è capture-only e resta tale: OCR e attribuzione stanno a valle, nel runbook.

## Documentazione di riferimento nel repo dell'app

`README.md` (funzionamento e contratto), `docs/AppBolleSpecificaFunzionale….md` (specifica, rev. 2), `docs/AppBolleProceduraResponseFlow….md` (procedura sul flow ed esiti dei collaudi, incluse le decisioni su fuso e deduplica).
