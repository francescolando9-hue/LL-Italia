# LL Italia — PWA modulare del gruppo

App contenitore a moduli del gruppo MLP / LL Italia. Primo modulo attivo: **Bolle** — fotografare le bolle di consegna in cantiere e inviarle al sistema di magazzino (endpoint HTTP → raccolta SharePoint BolleInArrivo). I moduli futuri si aggiungeranno senza rifare la base.

Stack: **vanilla JS, HTML, CSS** — nessun framework, nessun build step, nessuna dipendenza a runtime. PWA con Service Worker (offline e installazione) e IndexedDB (coda del modulo). Fonte di verità del modulo Bolle: la specifica funzionale in `docs/` (`AppBolleSpecificaFunzionale….md`, prevale su tutto), poi il kickoff `AppLLItaliaKickoffClaudeCode….md` e `CLAUDE.md`.

## Come installarla sul telefono

L'app è pubblicata su GitHub Pages: `https://francescolando9-hue.github.io/LL-Italia/`
La pubblicazione è automatica a ogni push su `main` (workflow `.github/workflows/pages.yml`, che attiva Pages da solo alla prima esecuzione).

**Android (Chrome):** aprire il link → menu ⋮ → **Aggiungi a schermata Home** (o "Installa app") → confermare. L'icona LL Italia compare in home e l'app si apre a schermo intero.

**iPhone/iPad (Safari):** aprire il link → pulsante Condividi → **Aggiungi a schermata Home** → confermare.

Alla prima apertura l'app chiede **nome e cognome**: vengono salvati sul dispositivo e allegati a ogni invio. Dopo la prima visita l'app funziona anche **senza rete**.

## Come provarla in mock (senza backend)

La **modalità mock è attiva di default**: gli invii sono simulati sul dispositivo, nessun dato esce. Il banner giallo "Modalità mock attiva" lo ricorda sempre.

1. Aprire il modulo Bolle (l'app ci entra direttamente; la home dei moduli resta raggiungibile dal logo in alto a sinistra).
2. **Fotografa bolla** (camera posteriore) oppure **Scegli dalla galleria** (multi-foto). Le foto entrano subito in IndexedDB come bozze: non si perdono nemmeno chiudendo l'app.
3. Scegliere il **cantiere** (dal secondo invio l'ultimo usato è preselezionato) e premere **Invia**.
4. Nella **Coda invii** ogni foto passa per gli stati *In coda → Invio in corso → Inviata* (o *Errore*, con pulsante Riprova). Il mock risponde dopo ~0,7 s simulando la conferma del server.
5. **Prova offline:** attivare la modalità aereo, scattare e premere Invia → le foto restano *In coda*; al ritorno della rete partono da sole. L'invio riparte anche a ogni apertura dell'app, con retry automatico a backoff (5 s → 10 s → … → max 5 min).

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

La versione non è scritta a mano da nessuna parte: si legge dal nome della cache che il Service Worker ha davvero attiva, quindi non può divergere dal codice pubblicato.

Quando si pubblica una versione nuova, sui telefoni già installati compare in basso una barra **«È disponibile una versione aggiornata dell'app»** con il pulsante *Aggiorna*: nessuno deve svuotare cache o reinstallare.

## Impostazioni

- **App** (⚙ in alto a destra, condivise tra moduli): nome e cognome dell'operatore.
- **Modulo Bolle** (link in fondo alla schermata del modulo): endpoint di invio, token, mock on/off, quante foto inviate conservare (ultime N, default 20). L'elenco cantieri non si tocca da qui: vedi sotto.

## Struttura del repo

```
index.html            shell: testata, outlet delle viste
manifest.webmanifest  manifest PWA "LL Italia"
sw.js                 service worker: precache e offline (bump di VERSIONE a ogni release)
icons/                icone dal logo ufficiale (logo.png = sorgente)
core/                 shell: router hash, home/launcher, impostazioni app, design system CSS
core/vendor/          codice di terzi incluso nel repo (vedi sotto)
modules/bolle/        modulo Bolle: vista, coda IndexedDB, compressione, invio, impostazioni
docs/                 specifica funzionale e kickoff
```

**Una deroga da ratificare:** `core/vendor/qrcode.mjs` è codice di terzi incluso nel repo — il generatore di QR `qrcode-generator` di Kazuhiko Arase, licenza MIT, copiato senza modifiche. Non è una dipendenza installata (nessun npm, nessun build step) e viene caricato **solo** dalla schermata di condivisione della configurazione, quindi non pesa sull'avvio. Scriverne uno da zero avrebbe significato implementare correzione d'errore Reed-Solomon e mascheratura: un QR sbagliato è peggio di nessun QR. La verifica è per decodifica: il collaudo rilegge col riconoscitore il codice generato e confronta il testo con il link atteso.

Un modulo nuovo = una cartella in `modules/` + l'import nel registro `moduli` di `core/app.js` (la tessera in home compare da sola). Con un solo modulo la home apre direttamente su Bolle.

## Pipeline della foto

Compressione client-side prima dell'accodamento: conversione a JPEG, lato lungo max ~2500 px, qualità ~0,85 (la leggibilità per l'OCR del runbook prevale sul peso); HEIC gestito via canvas dove il dispositivo lo decodifica. Una foto esce dalla coda **solo a conferma del server** (202 Accepted); ogni invio porta un `idClient` univoco, su cui il backend potrà deduplicare.

### Numero progressivo del dispositivo

Ogni foto **accodata** riceve un intero incrementale, conservato in IndexedDB: parte da 1 alla prima installazione, non si azzera mai e sopravvive agli aggiornamenti dell'app. Viaggia nel payload come campo `progressivo` e compare a video accanto a ogni bolla — in *Coda invii* e nello storico — così l'operatore può leggerlo a voce quando serve un riscontro dall'ufficio. In *Informazioni sull'app* si vede il numero raggiunto.

Serve a rendere misurabile il tratto fra il telefono e la raccolta: **ordinando le bolle per operatore, un numero mancante nella sequenza significa una foto scattata e mai arrivata.** Oggi quel tratto non sarebbe visibile in alcun altro modo.

Perché il segnale resti affidabile, il numero si assegna **all'accodamento** (alla pressione di *Invia*), non allo scatto e non al tentativo di invio:

- una foto **scartata dalle anteprime** prima di inviare non brucia un numero: altrimenti si aprirebbero buchi finti, indistinguibili da una bolla persa;
- i **retry** riusano lo stesso numero, esattamente come `idClient`: il numero è dell'immagine, non della richiesta;
- il numero è assegnato anche **offline**, prima di qualunque rete: si vede in coda subito ed è già quello che arriverà al server.

La sequenza è **per dispositivo, non globale**: due telefoni hanno entrambi il proprio n. 1, e un telefono reinstallato riparte da 1. Il campo va quindi sempre letto **insieme a `operatore` e `idClient`**, mai da solo.

## Contratto con il backend (in vigore)

Il flow di ricezione è **già attivo e collaudato**: l'app si adegua, il contratto non si modifica dal lato app. Un file per richiesta, POST JSON:

```
POST {endpoint}?api-version=2024-10-01
Content-Type: application/json

{ "token": "collaudo",
  "commessa": "MAR",                       // solo il codice: MAR | SNZ2.2 | MNG
  "operatore": "Paolo Sanzarello",
  "idClient": "fe7e5c81-…",                // GUID della bolla, per la deduplica futura
  "progressivo": 137,                      // intero: sequenza di quel dispositivo
  "dataInvio": "2026-09-01T17:27:53+02:00",
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

## ⚠️ Punto aperto: CORS sull'endpoint reale

L'app gira in un browser, quindi ogni invio con `Content-Type: application/json` è preceduto da una richiesta **preflight `OPTIONS`**. Perché l'app riceva il 202, il flow deve rispondere al preflight e includere l'header `Access-Control-Allow-Origin` (per l'origine di GitHub Pages o `*`). Verificato in collaudo con endpoint finto:

- endpoint che risponde al preflight → 3 foto scattate, 3 inviate, 3 atterrate, contatore errori 0;
- endpoint che **non** risponde al preflight → 0 foto atterrate, ma **nessuna perdita**: restano in coda in stato *Errore* con il messaggio «Invio bloccato: nessuna risposta dall'endpoint (rete assente o CORS)» e ripartono col retry appena il flow risponde correttamente.

Se il collaudo del backend è stato fatto con curl o Postman, questo punto non è ancora stato verificato: va provato dal telefono prima di distribuire l'app.

## Sviluppo locale

```
python3 -m http.server 8123
# http://127.0.0.1:8123
```

A ogni modifica dei file dell'app va incrementata `VERSIONE` in `sw.js` (e aggiornata la lista `RISORSE` se si aggiungono file), altrimenti i dispositivi restano sulla cache vecchia.

## Fuori perimetro (in capo a Francesco)

Deduplica lato backend sull'`idClient`; token definitivo al posto di `collaudo`; elenco autori libero o vincolato; hosting di produzione; OCR, login M365, notifiche push, moduli futuri.
