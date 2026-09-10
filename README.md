# LL Italia — PWA modulare del gruppo

App contenitore a moduli del gruppo MLP / LL Italia. Primo modulo attivo: **Bolle** — fotografare le bolle di consegna in cantiere e inviarle al sistema di magazzino (endpoint HTTP → raccolta SharePoint BolleInArrivo). I moduli futuri si aggiungeranno senza rifare la base.

Stack: **vanilla JS, HTML, CSS** — nessun framework, nessun build step, nessuna dipendenza a runtime. PWA con Service Worker (offline e installazione) e IndexedDB (coda del modulo). Fonte di verità del modulo Bolle: la specifica funzionale in `docs/` (`AppBolleSpecificaFunzionale….md`, prevale su tutto), poi `CLAUDE.md`.

## Come installarla sul telefono

L'app è pubblicata su GitHub Pages: `https://francescolando9-hue.github.io/LL-Italia/`
La pubblicazione è automatica a ogni push su `main` (workflow `.github/workflows/pages.yml`, che attiva Pages da solo alla prima esecuzione).

**Android (Chrome):** aprire il link → menu ⋮ → **Aggiungi a schermata Home** (o "Installa app") → confermare. L'icona LL Italia compare in home e l'app si apre a schermo intero.

**iPhone/iPad (Safari):** aprire il link → pulsante Condividi → **Aggiungi a schermata Home** → confermare.

Alla prima apertura l'app chiede **nome e cognome**: vengono salvati sul dispositivo e allegati a ogni invio. Dopo la prima visita l'app funziona anche **senza rete**.

## Come si usa

1. Aprire il modulo Bolle (l'app ci entra direttamente; la home dei moduli resta raggiungibile dal logo in alto a sinistra).
2. **Fotografa bolla** (camera posteriore) oppure **Scegli dalla galleria** (multi-foto). Le foto entrano subito in IndexedDB come bozze: non si perdono nemmeno chiudendo l'app.
2b. **La fotocamera è dentro l'app**: si scatta, la miniatura si accoda in basso, si scatta ancora, e alla fine si tocca **Fine** — come in WhatsApp. Gli scatti di una stessa sessione sono le **pagine di una sola bolla**: è la ragione per cui la sessione esiste. La fotocamera **del telefono** resta a un tocco (secondo pulsante), e diventa l'unica se il permesso viene negato.
3. Subito dopo la prima foto l'app dice cosa sta per partire — *«Questa foto è una bolla di una pagina»* — e offre **«+ Aggiungi pagina a questa bolla»**. Se la bolla continua su un altro foglio si tocca quel pulsante e si scatta la pagina successiva: le anteprime si numerano (`pag. 1`, `pag. 2`…) e il pulsante diventa *Invia 1 bolla di N pagine*. Se invece la bolla è finita, si manda così. La composizione si chiude a ogni invio: la bolla dopo riparte da una pagina.
4. Scegliere il **cantiere** (dal secondo invio l'ultimo usato è preselezionato) e premere **Invia**.
5. Nella **Coda invii** ogni foto passa per gli stati *In coda → Invio in corso → Inviata* (o *Errore*, con pulsante Riprova). *Inviata* significa **salvata in raccolta**: è la risposta del flow a farlo passare, non l'invio della richiesta.
6. **Prova offline:** attivare la modalità aereo, scattare e premere Invia → le foto restano *In coda*; al ritorno della rete partono da sole. L'invio riparte anche a ogni apertura dell'app, con retry automatico a backoff (5 s → 10 s → … → max 5 min).

**Collaudo sui numeri, mai sull'esito formale:** i quattro contatori in alto (Scattate oggi / Inviate oggi / In attesa / Errore) sono il riferimento. "Scattate" conta le foto confermate con Invia (le anteprime rimosse prima dell'invio non contano). Un invio "riuscito" si dimostra confrontando scattate vs inviate vs foto atterrate a destinazione: ogni scarto è un difetto da spiegare.

## Bolle inviate (storico)

Dalla schermata del modulo, il pulsante **Bolle inviate** apre il registro degli invii confermati:

- **Calendario del mese**, con i giorni che hanno bolle evidenziati e il numero sopra ciascuno. Si tocca un giorno per vederne l'elenco, lo si ritocca (o si usa *Tutto il mese*) per tornare al mese intero; le frecce spostano di mese. All'apertura il calendario si posiziona sul mese dell'ultimo invio.
- **Elenco** raggruppato per giorno, con ora, cantiere e operatore. **Toccando una riga la bolla si apre a schermo intero.**
- **Filtro cantiere** e totale del periodo con il dettaglio per commessa.

Delle foto inviate il telefono conserva l'originale solo per le ultime N (impostazione del modulo, default 20); di tutte conserva invece una **miniatura a 800 px** (~70 KB), fino a 300 bolle. Aprendo una riga si vede l'originale se c'è ancora, altrimenti la miniatura, che basta a riconoscere la bolla ma non a leggerne le righe — per quello c'è la raccolta. Oltre le 300, la riga resta nell'elenco senza immagine.

Il registro è **locale al dispositivo**: mostra ciò che quel telefono ha inviato, non è la vista condivisa della raccolta e non segue il cambio di dispositivo. Il raggruppamento per giorno usa la **data di scatto** (`dataInvio`), non l'istante di consegna al server.

## Foto già inviata

Aggiungendo dalla galleria un file **identico** a uno già presente (stessa immagine, non un secondo scatto), l'app lo riconosce dall'impronta SHA-256 del file originale e avvisa: *«Questa foto è già stata inviata il … alle … su …»*. La scelta resta all'operatore — si può confermare e mandarla comunque — ma il doppione per sbaglio non passa più inosservato.

Due scatti diversi della stessa bolla restano invece due invii distinti: nessun confronto di byte può riconoscerli, servirebbe leggere il numero della bolla (OCR), che è fuori perimetro.

## Controllo di leggibilità

Appena la foto è acquisita, l'app misura nitidezza e zone bruciate e avvisa se sembra **mossa, troppo scura o in controluce**: l'anteprima si marca in arancione col motivo. Una bolla illeggibile scoperta in cantiere si rifà in cinque secondi; scoperta in ufficio la sera è persa.

**Avvisa, non blocca**: l'operatore può inviare comunque, perché la regola che nessuna bolla si perda prevale. Le soglie sono tarate per non allarmare sulle foto buone — un avviso che scatta sempre viene ignorato sempre. Metodo e valori misurati: `docs/AppBolleLeggibilita….md`.

Il controllo non legge il contenuto della bolla: misura solo il contrasto locale dei pixel, quindi il modulo resta capture-only.

## Configurare un altro telefono

Un telefono già configurato può passare indirizzo e codice a un altro senza digitare nulla: *Impostazioni del modulo Bolle* → **Configura un altro telefono** mostra un codice QR da far inquadrare (e il link, copiabile).

I dati viaggiano dentro l'hash dell'indirizzo, che il browser **non** invia al server: non finiscono nei log di GitHub Pages. Il telefono che riceve mostra destinazione e codice mascherato, chiede conferma, e dopo l'applicazione ripulisce l'indirizzo per non lasciare il segreto nella cronologia.

⚠️ Quel codice **vale come una password**: si mostra solo a chi deve usare l'app, non si appende in bacheca e si manda per messaggio diretto, non in un gruppo.

## Cantiere sbagliato

Nello storico, aprendo una bolla si può **rimandarla su un altro cantiere** — capita di inviare col picker rimasto sull'ultimo cantiere usato. Possibile solo se la foto originale è ancora sul dispositivo: rimandare la miniatura significherebbe consegnare al magazzino una bolla meno leggibile.

La bolla già inviata **resta in raccolta**: l'app lo dice esplicitamente e va annullata dall'ufficio. È un limite della scelta capture-only, non un difetto.

## Informazioni e aggiornamenti

Dalle impostazioni dell'app, il link **Informazioni sull'app** apre la pagina che serve al supporto quando un operatore chiama dal cantiere: versione in uso, se il funzionamento offline è attivo, stato della rete, spazio occupato sul telefono, foto da inviare, elementi in coda o in errore, bolle nello storico, numero progressivo raggiunto. C'è anche un pulsante **Cerca aggiornamenti**.

### Riparti col conteggio di oggi

Sulla stessa pagina, in fondo, il pulsante **Azzera i contatori di oggi**. Serve quando l'ufficio ha tolto da SharePoint delle bolle mandate per sbaglio e queste vanno rimandate: i contatori del giorno sommano invii veri e invii annullati, e non si capisce più quanti siano quelli buoni — proprio il numero su cui si regge il collaudo.

Azzera i contatori del giorno e toglie dall'elenco le bolle già confermate dal server. **Non** tocca:

- le foto ancora da inviare o in errore — nessuna bolla non arrivata può sparire da lì;
- lo storico delle bolle inviate, che è il registro del dispositivo e non un contatore;
- la **numerazione progressiva**, che deve proseguire: azzerarla aprirebbe in raccolta un buco falso, indistinguibile da una bolla persa.

Sta in una pagina secondaria e chiede conferma in due passaggi, con davanti i numeri che si stanno per azzerare: con i guanti un tocco per sbaglio ci sta.

La versione non è scritta a mano da nessuna parte: si legge dal nome della cache che il Service Worker ha davvero attiva, quindi non può divergere dal codice pubblicato.

Quando si pubblica una versione nuova, sui telefoni già installati compare in basso una barra **«È disponibile una versione aggiornata dell'app»** con il pulsante *Aggiorna*: nessuno deve svuotare cache o reinstallare.

## Impostazioni

- **App** (⚙ in alto a destra, condivise tra moduli): nome e cognome dell'operatore; sotto, il riquadro *Questo dispositivo* con l'identificativo in sola lettura e il pulsante per copiarlo.
- **Modulo Bolle** (link in fondo alla schermata del modulo): endpoint di invio, token, quante foto inviate conservare (ultime N, default 20). L'elenco cantieri non si tocca da qui: vedi sotto.

**La modalità mock non è più un'impostazione** (rimossa il 03/09/2026, con l'app entrata in uso). Era un interruttore di sviluppo in mano all'operatore, e accesa per sbaglio significava bolle che l'app dava per inviate e che non arrivavano da nessuna parte. Resta disponibile **solo su localhost**, per lo sviluppo: la si accende da `core/configurazione.js` e il banner giallo lo dichiara a video. In campo è spenta qualunque cosa dica il valore salvato sul dispositivo — anche su un telefono che l'aveva accesa prima dell'aggiornamento.

## Modulo «Foto cantiere»

Secondo modulo, accanto a Bolle: chi è in cantiere fotografa e manda in ufficio. **Due categorie, scelte prima di scattare** come si sceglie il cantiere:

| Categoria | Codice | A cosa serve | Come parte |
|---|---|---|---|
| Avanzamento lavori — per capirci tra noi | `AVANZAMENTO` | dire a che punto è una lavorazione | compressa (2500 px, 0,85) |
| Da archiviare sul server | `ARCHIVIO` | documentazione per la cartella di commessa su `L:` | **risoluzione originale** |

La categoria si sceglie prima perché **decide come l'immagine viene preparata**, non è un'etichetta messa dopo: cambiarla a foto già pronte non ricomprime nulla, e l'app lo dice invece di tacere. Per l'archivio, se il file è già JPEG partono **i byte originali senza ricodifica** — ricomprimere «a qualità massima» degraderebbe l'immagine senza vantaggi; HEIC e PNG vengono convertiti a piena risoluzione, perché in raccolta il file si chiama `.jpg`.

C'è una **nota facoltativa** (max 255 caratteri) che vale per tutte le foto di un invio, e si svuota dopo. Coda offline, retry e contatori del giorno funzionano come in Bolle, con un database e un endpoint propri: i due moduli non si toccano.

Misure dal collaudo (foto 4032 × 3024): avanzamento 1,30 MB → 0,47 MB inviati; archivio 1,30 MB → 1,30 MB, byte identici. **Attenzione al caso peggiore:** una foto da 12 MB diventa un corpo di richiesta da 16 MB, perché il base64 aggiunge un terzo — da provare sul flow vero prima di prometterlo in cantiere. Se il flow rifiuta, l'app lo dice e la foto resta in coda.

Specifica completa e requisiti del flow: `docs/AppFotoCantiereSpecifica….md`. **Punto aperto:** la cartella di destinazione su `L:` per il runbook del venerdì, che deve indicare Francesco.

## Struttura del repo

```
index.html            shell: testata, outlet delle viste
manifest.webmanifest  manifest PWA "LL Italia"
sw.js                 service worker: precache e offline (bump di VERSIONE a ogni release)
icons/                icone dal logo ufficiale (logo.png = sorgente)
core/                 shell: router hash, home/launcher, impostazioni app, design system CSS
core/vendor/          codice di terzi incluso nel repo (vedi sotto)
core/cantieri.js      anagrafica cantieri, condivisa dai moduli
core/endpoint.js      api-version dei flow Power Automate, condivisa
core/fotocamera.js    fotocamera dentro l'app, multiscatto, condivisa dai moduli
modules/bolle/        modulo Bolle: vista, coda IndexedDB, compressione, invio, impostazioni
modules/foto/         modulo Foto cantiere: due categorie, coda propria, invio
core/versione.js      versione in uso, letta dalla cache attiva del service worker
docs/                 5 documenti, tutti correnti:
                      AppBolleSpecificaFunzionale….md   specifica ufficiale, rev. 2 (prevale su tutto)
                      AppBolleFlowRicezione….md         flow di ricezione e raccolta BolleInArrivo
                      AppBolleContinuitaRunbook….md     documento unico per il lavoro a valle
                      AppBolleLeggibilita….md           metodo e taratura del controllo di leggibilità
                      AppFotoCantiereSpecifica….md      modulo Foto cantiere e requisiti del suo flow
```

**Una deroga da ratificare:** `core/vendor/qrcode.mjs` è codice di terzi incluso nel repo — il generatore di QR `qrcode-generator` di Kazuhiko Arase, licenza MIT, copiato senza modifiche. Non è una dipendenza installata (nessun npm, nessun build step) e viene caricato **solo** dalla schermata di condivisione della configurazione, quindi non pesa sull'avvio. Scriverne uno da zero avrebbe significato implementare correzione d'errore Reed-Solomon e mascheratura: un QR sbagliato è peggio di nessun QR. La verifica è per decodifica: il collaudo rilegge col riconoscitore il codice generato e confronta il testo con il link atteso.

Un modulo nuovo = una cartella in `modules/` + l'import nel registro `moduli` di `core/app.js` (la tessera in home compare da sola). Nella shell sta ciò che è di tutti i moduli: anagrafica cantieri, normalizzazione degli endpoint, versione dell'app.

## Pipeline della foto

Compressione client-side prima dell'accodamento: conversione a JPEG, lato lungo max ~2500 px, qualità ~0,85 (la leggibilità per l'OCR del runbook prevale sul peso); HEIC gestito via canvas dove il dispositivo lo decodifica. Una foto esce dalla coda **solo a conferma del server** (202 Accepted); ogni invio porta un `idClient` univoco, su cui il backend potrà deduplicare.

### La fotocamera dentro l'app

`<input type="file" capture>` passa il controllo alla fotocamera **di sistema**, che dopo ogni scatto torna al browser: per una bolla su tre fogli significa entrare e uscire tre volte, e chi ha poca dimestichezza si perde. La fotocamera interna (`getUserMedia`, in `core/fotocamera.js`, condivisa dai due moduli) risolve questo: video a tutto schermo, pulsante di scatto grande, rullino delle miniature, contatore, **Fine**.

**Il compromesso, da conoscere:** `getUserMedia` dà il flusso video della fotocamera, non la foto elaborata dall'app di sistema — niente HDR, niente multiscatto, niente messa a fuoco assistita, e su alcuni telefoni una risoluzione inferiore allo scatto nativo. Per le bolle, dove la leggibilità del testo è il punto, **la fotocamera del telefono resta a un tocco**: su una bolla che esce poco leggibile è l'alternativa, e il controllo di leggibilità continua ad avvisare in entrambi i casi.

Due dettagli nati dal collaudo: il pulsante di scatto **nasce spento** e si accende quando il video ha dimensioni reali (`loadeddata` non basta, e senza l'attesa il primo scatto usciva vuoto **in silenzio**); uno scatto che comunque fallisce lo dice a video invece di sparire.

### Bolla su più pagine

Una bolla di consegna può essere su più fogli. La scelta è offerta **subito dopo la prima foto**, non dopo la seconda: il riquadro dice sempre cosa sta per partire (*una bolla di una pagina*, *una sola bolla di 3 pagine*, *3 bolle diverse*) e il pulsante **«+ Aggiungi pagina a questa bolla»** aggiunge il foglio successivo aprendo direttamente la fotocamera. Se l'operatore raggruppa per sbaglio, la via d'uscita è scritta lì: *«Non sono la stessa bolla: mandale separate»*.

**Il contratto non cambia — resta un file per richiesta**, quindi una bolla di tre pagine sono tre invii, ognuno col suo `idClient` e col suo `progressivo`, legati da `idBolla` (uguale per tutte le pagine) più `pagina` e `pagine`.

Anche una bolla di una pagina sola ha il suo `idBolla`, con `pagina` 1 e `pagine` 1: a valle la regola è una — si raggruppa per `idBolla` — senza casi particolari da ricordare. In *Coda invii* e nello storico ogni riga porta il marchio `pag. 2/3`.

**Il collaudo resta in pagine, non in bolle:** tre pagine sono tre file in raccolta e tre progressivi consumati. Il controllo di continuità non cambia — una pagina mai arrivata è un buco nella sequenza come qualunque altra foto — e un gruppo incompleto (`pagine` = 3 con due righe presenti) è un difetto da spiegare.

### Identificativo del dispositivo e numero progressivo

Ogni foto **accodata** riceve un intero incrementale, conservato in IndexedDB: parte da 1 alla prima installazione, non si azzera mai e sopravvive agli aggiornamenti dell'app. Viaggia nel payload come campo `progressivo` e compare a video accanto a ogni bolla — in *Coda invii* e nello storico — così l'operatore può leggerlo a voce quando serve un riscontro dall'ufficio. In *Informazioni sull'app* si vede il numero raggiunto.

Il titolare di quella sequenza è l'**`idDispositivo`**: un GUID generato alla prima apertura e salvato accanto al contatore, che identifica l'installazione e non la persona. Non cambia se l'operatore corregge il proprio nome; riparte solo con una reinstallazione, insieme al contatore. Si legge in *Impostazioni app → Questo dispositivo*, in sola lettura, con un pulsante per copiarlo.

Insieme rendono misurabile il tratto fra il telefono e la raccolta: **raggruppando le bolle per dispositivo, un numero mancante nella sequenza significa una foto scattata e mai arrivata.** Senza questi due campi quel tratto non sarebbe visibile in alcun modo. Raggruppare per `operatore` non basterebbe: è testo libero, quindi una grafia diversa del nome spezza una sequenza e due telefoni della stessa persona ne fondono due.

Perché il segnale resti affidabile, il numero si assegna **all'accodamento** (alla pressione di *Invia*), non allo scatto e non al tentativo di invio:

- una foto **scartata dalle anteprime** prima di inviare non brucia un numero: altrimenti si aprirebbero buchi finti, indistinguibili da una bolla persa;
- i **retry** riusano lo stesso numero, esattamente come `idClient`: il numero è dell'immagine, non della richiesta;
- il numero è assegnato anche **offline**, prima di qualunque rete: si vede in coda subito ed è già quello che arriverà al server.

La sequenza è **per dispositivo, non globale**: due telefoni hanno entrambi il proprio n. 1, e un telefono reinstallato riparte da 1 con un `idDispositivo` nuovo — evento atteso, e riconoscibile proprio perché l'identificativo cambia.

## Contratto con il backend (in vigore)

Il flow di ricezione è **già attivo e collaudato**: l'app si adegua, il contratto non si modifica dal lato app. Un file per richiesta, POST JSON:

```
POST {endpoint}?api-version=2024-10-01
Content-Type: application/json

{ "token": "collaudo",
  "commessa": "MAR",                       // solo il codice: MAR | SNZ2.2 | MNG
  "operatore": "Paolo Sanzarello",
  "idClient": "fe7e5c81-…",                // GUID della bolla, per la deduplica futura
  "idDispositivo": "9b2c7f10-…",           // GUID dell'installazione: titolare della sequenza
  "progressivo": 137,                      // intero: sequenza di quel dispositivo
  "idBolla": "4c1a8e02-…",                 // GUID della bolla: uguale per ogni sua pagina
  "pagina": 2,                             // intero, da 1
  "pagine": 3,                             // intero: pagine che compongono la bolla
  "dataInvio": "2026-09-01T17:27:53+02:00",
  "versioneApp": "0.15.0",                 // versione che sta girando sul telefono
  "nomeFile": "BollaMAR20260901172753PaoloSanzarello.jpg",   // IGNORATO dal backend
  "contenutoBase64": "…" }

Risposta attesa: 202 Accepted senza corpo — è la conferma che fa uscire la foto dalla coda.
```

**`api-version=2024-10-01` è obbligatoria**: l'URL mostrato dal designer di Power Automate riporta `api-version=1` e viene rifiutato con 400. L'app corregge da sola il parametro al salvataggio delle impostazioni, lasciando intatta la firma `sig=`.

## Configurazione dell'endpoint (mai nel repo)

L'URL contiene una firma di accesso: il repo è pubblico, quindi l'URL non vi entra mai. Due strade:

- **Sul telefono e sull'app pubblicata** — modulo Bolle → *Impostazioni del modulo Bolle*: si incollano endpoint e token, che restano in `localStorage` di quel dispositivo. È il modo previsto per le squadre.
- **In sviluppo locale** — copia `core/configurazione.esempio.js` in `core/configurazione.js` (escluso da git tramite `.gitignore`), inserisci i tuoi valori e apri l'app **una volta** su `http://127.0.0.1:8123/?config=locale`: i valori vengono copiati nelle impostazioni del dispositivo, poi bastano quelle. Senza quel parametro il file non viene mai richiesto, quindi l'app pubblicata non lo cerca e non genera errori.

## Cantieri

L'elenco è in `modules/bolle/cantieri.js` e **non è modificabile dal dispositivo**: un codice commessa errato arriverebbe al magazzino come commessa inesistente. A video l'etichetta estesa, nel payload solo il codice.

| Codice nel payload | Etichetta a video |
|---|---|
| `MAR` | MAR - Caselle Torinese |
| `SNZ2.2` | SNZ2.2 - Settimo Torinese |
| `MNG` | MNG - via Monginevro 181 |

Al primo utilizzo la scelta è esplicita (`— scegli il cantiere —`, Invia resta disabilitato); poi l'ultimo cantiere usato è preselezionato.

## CORS: risolto il 03/09/2026

L'app gira in un browser, quindi ogni invio con `Content-Type: application/json` è preceduto da una richiesta **preflight `OPTIONS`**: perché l'app riceva la conferma, il flow deve rispondere al preflight e includere l'header `Access-Control-Allow-Origin`. Le tre azioni *Response* del flow lo portano, e da quel momento il verde dell'app significa **salvata** e non più soltanto **accettata** (senza Response esplicite Power Automate risponde `202` all'arrivo della richiesta, prima di eseguire il flow).

Verificato in laboratorio con endpoint finto, prima di toccare il flow reale: endpoint che risponde al preflight → 3 foto scattate, 3 inviate, 3 atterrate, 0 errori; endpoint che **non** risponde → 0 atterrate e **nessuna perdita**, le foto restano in coda in stato *Errore* con il messaggio «Invio bloccato: nessuna risposta dall'endpoint (rete assente o CORS)» e ripartono col retry appena il flow risponde correttamente. Poi verificato sul flow reale dal telefono: con token errato l'app riceve `401` e la foto **non** risulta inviata.

Dettaglio delle azioni e degli esiti: `docs/AppBolleFlowRicezione….md`.

## Sviluppo locale

```
python3 -m http.server 8123
# http://127.0.0.1:8123
```

A ogni modifica dei file dell'app va incrementata `VERSIONE` in `sw.js` (e aggiornata la lista `RISORSE` se si aggiungono file), altrimenti i dispositivi restano sulla cache vecchia.

## Fuori perimetro (in capo a Francesco)

Sul flow e sulla raccolta: colonne `Progressivo`, `IdDispositivo`, `IdBolla`, `Pagina` e `Pagine` con le loro mappature, e la colonna della data (`DataScatto`) di tipo testo (dettaglio in `docs/AppBolleFlowRicezione….md`). Deciso e chiuso: token riservato al posto di `collaudo`, autori a campo libero, deduplica lato flow lasciata come controllo inerte. Rinviato: hosting di produzione, compressione adattiva su rete lenta, OCR, login M365, notifiche push, moduli futuri.
